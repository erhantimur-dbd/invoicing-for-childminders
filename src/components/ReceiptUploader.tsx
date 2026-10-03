'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Upload, X, Sparkles, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  RECEIPTS_BUCKET,
  deleteReceiptObject,
  receiptObjectPath,
  signReceiptDisplayUrl,
} from '@/lib/receipt-storage'

type Props = {
  onUpload: (storedReceipt: string) => void
  onExtracting: () => void
  onExtracted: (data: {
    amount?: number
    date?: string
    merchant_name?: string
    description?: string
    category?: string
  }) => void
  /** Object path, or a legacy https signed URL already stored on the expense. */
  storedReceipt?: string | null
  userId: string
}

type UIState = 'empty' | 'uploading' | 'extracting' | 'done' | 'error'

export default function ReceiptUploader({
  onUpload,
  onExtracting,
  onExtracted,
  storedReceipt,
  userId,
}: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const onUploadRef = useRef(onUpload)
  const displayPathRef = useRef<string | null>(null)

  const [uiState, setUiState] = useState<UIState>(storedReceipt ? 'done' : 'empty')
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [displayReady, setDisplayReady] = useState(!storedReceipt)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  onUploadRef.current = onUpload

  // Sign a fresh URL for the preview. Legacy https values are rewritten to the object path
  // so the next save persists the path instead of another expiring URL.
  useEffect(() => {
    let cancelled = false
    const stored = storedReceipt?.trim() ?? ''

    if (!stored) {
      displayPathRef.current = null
      setDisplayUrl(null)
      setDisplayReady(true)
      return
    }

    const path = receiptObjectPath(stored)
    if (path && path !== stored) onUploadRef.current(path)

    const objectKey = path ?? stored
    if (displayPathRef.current === objectKey) return

    setDisplayReady(false)
    const client = createClient()
    void signReceiptDisplayUrl(client, stored).then(url => {
      if (cancelled) return
      displayPathRef.current = objectKey
      setDisplayUrl(url)
      setDisplayReady(true)
    })

    return () => { cancelled = true }
  }, [storedReceipt])

  async function handleFile(file: File) {
    if (!file) return
    if (!userId) {
      toast.error('Not signed in')
      return
    }

    setErrorMsg(null)
    setUiState('uploading')

    try {
      // 1. Upload to Supabase Storage
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, file, { upsert: false })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // 2. Sign a display URL. Persist the object path, not the expiring URL.
      const signedUrl = await signReceiptDisplayUrl(supabase, path)
      if (!signedUrl) {
        throw new Error('Could not get signed URL')
      }

      displayPathRef.current = path
      setDisplayUrl(signedUrl)
      setDisplayReady(true)
      onUpload(path)

      // 3. Convert file to base64 for AI extraction
      const base64 = await fileToBase64(file)

      // 4. Start AI extraction
      setUiState('extracting')
      onExtracting()

      const res = await fetch('/api/expenses/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body?.error === 'ai_not_configured') {
          // Not a fatal error — just skip AI extraction
          toast('AI extraction not available', { description: 'Fill in the details manually.' })
          onExtracted({})
        } else {
          throw new Error(body?.error ?? 'AI extraction failed')
        }
      } else {
        const { data } = await res.json()
        onExtracted(data ?? {})
      }

      setUiState('done')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      console.error('ReceiptUploader error:', err)
      setErrorMsg(message)
      setUiState('error')
      toast.error('Receipt upload failed', { description: message })
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data URL prefix — we only want the base64 payload
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  function handleRemove() {
    const stored = storedReceipt
    displayPathRef.current = null
    setDisplayUrl(null)
    setDisplayReady(true)
    setUiState('empty')
    setErrorMsg(null)
    onUpload('')
    onExtracted({})
    // Reset file inputs so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    // Storage delete is best-effort and must not block clearing the form.
    void deleteReceiptObject(supabase, stored)
  }

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </>
  )

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (uiState === 'empty' || uiState === 'error') {
    return (
      <div className="space-y-3">
        {hiddenInputs}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
        >
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Attach a receipt</p>
            <p className="text-xs text-gray-400 mt-0.5">Tap to upload — AI will fill in the details</p>
          </div>
        </button>

        {uiState === 'error' && errorMsg && (
          <p className="text-xs text-red-500 text-center">{errorMsg}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 text-sm gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 text-sm gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload file
          </Button>
        </div>
      </div>
    )
  }

  // ── Uploading state ──────────────────────────────────────────────────────────
  if (uiState === 'uploading') {
    return (
      <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3">
        {hiddenInputs}
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-sm font-medium text-gray-600">Uploading receipt…</p>
      </div>
    )
  }

  // ── Extracting state ─────────────────────────────────────────────────────────
  if (uiState === 'extracting') {
    return (
      <div className="w-full border-2 border-dashed border-emerald-200 rounded-xl p-8 flex flex-col items-center gap-3 bg-emerald-50/40">
        {hiddenInputs}
        <div className="relative">
          <Sparkles className="h-8 w-8 text-emerald-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <p className="text-sm font-medium text-emerald-700">AI is reading your receipt…</p>
        <p className="text-xs text-emerald-500">This takes just a moment</p>
      </div>
    )
  }

  // ── Done state ───────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
      {hiddenInputs}
      {/* Thumbnail — opens full size. src is a signed URL created for this view. */}
      {displayUrl ? (
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
          title="View full receipt"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Receipt"
            className="h-16 w-16 object-cover rounded-lg border border-emerald-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          />
        </a>
      ) : (
        <div className="flex-shrink-0 h-16 w-16 rounded-lg border border-emerald-200 bg-white flex items-center justify-center">
          {displayReady
            ? <ImageIcon className="h-5 w-5 text-emerald-400" />
            : <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-emerald-700 flex items-center gap-1">
          <span>Receipt attached</span>
          <span className="text-emerald-500">✓</span>
        </p>
        <p className="text-xs text-emerald-500 mt-0.5">Tap image to view full size</p>
      </div>

      <button
        type="button"
        onClick={handleRemove}
        className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Remove receipt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
