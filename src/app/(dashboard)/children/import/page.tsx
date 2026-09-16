'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { parentEmailSchema, moneyAmountSchema } from '@/lib/validation'

// Columns we accept, in any order, matched case-insensitively on the header
// row. Only first_name, last_name and daily_rate are required.
const COLUMNS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'parent_name',
  'parent_email',
  'parent_phone',
  'daily_rate',
  'half_day_rate',
  'hourly_rate',
] as const

type ColumnKey = (typeof COLUMNS)[number]

type ParsedRow = {
  raw: Record<ColumnKey, string>
  errors: string[]
}

/**
 * Minimal CSV parser that handles quoted fields and embedded commas —
 * enough for exports from Excel/Google Sheets without pulling in a
 * dependency.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)
  return rows
}

function normaliseDob(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  // Accept YYYY-MM-DD or DD/MM/YYYY (UK spreadsheets).
  let d: Date | null = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) d = new Date(v)
  else {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) d = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`)
  }
  if (!d || isNaN(d.getTime()) || d > new Date()) return null
  return d.toISOString().slice(0, 10)
}

function validateRow(raw: Record<ColumnKey, string>): string[] {
  const errors: string[] = []
  if (!raw.first_name.trim()) errors.push('First name is required')
  if (!raw.last_name.trim()) errors.push('Last name is required')
  if (!raw.daily_rate.trim()) {
    errors.push('Daily rate is required')
  } else {
    const check = moneyAmountSchema.safeParse(raw.daily_rate)
    if (!check.success || check.data <= 0) errors.push('Daily rate must be a positive number')
  }
  for (const key of ['half_day_rate', 'hourly_rate'] as const) {
    if (raw[key].trim() && !moneyAmountSchema.safeParse(raw[key]).success) {
      errors.push(`${key === 'half_day_rate' ? 'Half-day' : 'Hourly'} rate must be a number`)
    }
  }
  if (raw.parent_email.trim() && !parentEmailSchema.safeParse(raw.parent_email).success) {
    errors.push('Parent email is invalid')
  }
  if (raw.date_of_birth.trim() && !normaliseDob(raw.date_of_birth)) {
    errors.push('Date of birth must be YYYY-MM-DD or DD/MM/YYYY (and not in the future)')
  }
  return errors
}

export default function ImportChildrenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ''))
      if (parsed.length < 2) {
        toast.error('The file needs a header row and at least one child')
        return
      }
      const headers = parsed[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const colIndex = new Map<ColumnKey, number>()
      for (const col of COLUMNS) {
        const idx = headers.indexOf(col)
        if (idx !== -1) colIndex.set(col, idx)
      }
      if (!colIndex.has('first_name') || !colIndex.has('last_name') || !colIndex.has('daily_rate')) {
        toast.error('Header row must include first_name, last_name and daily_rate')
        return
      }
      const data: ParsedRow[] = parsed.slice(1).map(cells => {
        const raw = Object.fromEntries(
          COLUMNS.map(col => {
            const idx = colIndex.get(col)
            return [col, idx !== undefined ? (cells[idx] ?? '').trim() : '']
          })
        ) as Record<ColumnKey, string>
        return { raw, errors: validateRow(raw) }
      })
      setRows(data)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!rows) return
    const valid = rows.filter(r => r.errors.length === 0)
    if (!valid.length) { toast.error('No valid rows to import'); return }

    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setImporting(false); return }

    let imported = 0
    for (const row of valid) {
      const { raw } = row
      const { error } = await supabase.from('children').insert({
        childminder_id: user.id,
        first_name: raw.first_name.trim(),
        last_name: raw.last_name.trim(),
        date_of_birth: normaliseDob(raw.date_of_birth),
        parent_name: raw.parent_name.trim(),
        parent_email: raw.parent_email.trim(),
        parent_phone: raw.parent_phone.trim(),
        daily_rate: Number(raw.daily_rate),
        half_day_rate: raw.half_day_rate.trim() ? Number(raw.half_day_rate) : null,
        hourly_rate: raw.hourly_rate.trim() ? Number(raw.hourly_rate) : null,
        is_active: true,
      })
      if (error) {
        // The DB trigger enforces plan limits server-side.
        if (error.message?.includes('plan_limit_reached')) {
          toast.error(`Imported ${imported} — plan child limit reached. Upgrade to import the rest.`)
          setImporting(false)
          router.push('/children')
          return
        }
        toast.error(`Failed on ${raw.first_name} ${raw.last_name}: ${error.message}`)
        setImporting(false)
        return
      }
      imported++
    }
    toast.success(`Imported ${imported} ${imported === 1 ? 'child' : 'children'}! Add schedules to enable auto-invoicing.`)
    router.push('/children')
  }

  const validCount = rows?.filter(r => r.errors.length === 0).length ?? 0
  const errorCount = (rows?.length ?? 0) - validCount

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/children" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Back to children</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import children from CSV</h1>
          <p className="text-gray-500 text-sm">Upload a spreadsheet export to add several children at once</p>
        </div>
      </div>

      {/* Format guide */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-900">Expected format</p>
          <p>
            A CSV with a header row. Required columns: <code className="bg-gray-100 px-1 rounded">first_name</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">last_name</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">daily_rate</code>. Optional:{' '}
            <code className="bg-gray-100 px-1 rounded">date_of_birth</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">parent_name</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">parent_email</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">parent_phone</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">half_day_rate</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">hourly_rate</code>.
          </p>
          <p className="text-xs text-gray-400">
            Schedules and funded hours are set per child afterwards — they&apos;re too detailed for a spreadsheet.
          </p>
        </CardContent>
      </Card>

      {/* File picker */}
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-emerald-300 rounded-2xl py-10 cursor-pointer hover:bg-emerald-50 transition-colors">
        <Upload className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        <span className="text-sm font-medium text-emerald-700">
          {fileName || 'Choose a CSV file'}
        </span>
        <span className="text-xs text-gray-400">.csv exported from Excel, Numbers or Google Sheets</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>

      {/* Preview */}
      {rows && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {validCount} ready
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <AlertCircle className="h-4 w-4" aria-hidden="true" /> {errorCount} with problems (skipped)
              </span>
            )}
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className={`rounded-xl border px-4 py-3 ${row.errors.length ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">
                    {row.raw.first_name || '—'} {row.raw.last_name}
                  </p>
                  <span className="text-xs text-gray-500 ml-auto">
                    {row.raw.daily_rate ? `£${row.raw.daily_rate}/day` : ''}
                  </span>
                </div>
                {row.errors.length > 0 && (
                  <ul className="mt-1.5 text-xs text-red-600 list-disc pl-6">
                    {row.errors.map((e, j) => <li key={j}>{e}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold gap-2"
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <>Import {validCount} {validCount === 1 ? 'child' : 'children'}</>}
          </Button>
        </div>
      )}
    </div>
  )
}
