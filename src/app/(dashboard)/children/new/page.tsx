import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ChildForm from '@/components/ChildForm'

export default function NewChildPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/children" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add child</h1>
          <p className="text-gray-500 text-sm">Fill in the details below</p>
        </div>
      </div>
      <ChildForm mode="new" />
    </div>
  )
}
