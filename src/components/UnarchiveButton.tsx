'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RotateCcw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UnarchiveButton({ childId, childName }: { childId: string; childName: string }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleUnarchive() {
    setLoading(true)
    const { error } = await supabase
      .from('children')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', childId)
    if (error) {
      toast.error('Failed to unarchive child')
    } else {
      toast.success(`${childName} restored to active`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUnarchive}
      disabled={loading}
      className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 text-xs"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
      Restore
    </Button>
  )
}
