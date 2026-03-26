'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Archive, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ArchiveChildButton({ childId, childName }: { childId: string; childName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleArchive() {
    setLoading(true)
    const { error } = await supabase
      .from('children')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', childId)
    if (error) {
      toast.error('Failed to archive child')
      setLoading(false)
    } else {
      toast.success(`${childName} has been archived`)
      router.push('/children?tab=history')
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full h-12 text-base text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 rounded-xl gap-2"
        onClick={() => setOpen(true)}
      >
        <Archive className="h-5 w-5" />
        Archive child
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive {childName}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-gray-600 leading-relaxed">
              This will move <span className="font-semibold">{childName}</span> to your history. They will no longer appear in the active children list or invoice dropdowns.
            </p>
            <p className="text-sm text-gray-500">
              You can restore them at any time from the <span className="font-medium">Children → History</span> tab.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-gray-800 hover:bg-gray-900 gap-2"
                onClick={handleArchive}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
