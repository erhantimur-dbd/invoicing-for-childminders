'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Receipt, Settings, Baby } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BottomNav({ invoicing = true }: { invoicing?: boolean }) {
  const pathname = usePathname()

  const navItems = invoicing
    ? [
        { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/enquiries', label: 'Parents', icon: Baby },
        { href: '/children', label: 'Children', icon: Users },
        { href: '/invoices', label: 'Invoices', icon: FileText },
        { href: '/profile', label: 'Settings', icon: Settings },
      ]
    : [
        { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/enquiries', label: 'Parents', icon: Baby },
        { href: '/profile', label: 'Settings', icon: Settings },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 print:hidden md:hidden">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors',
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
