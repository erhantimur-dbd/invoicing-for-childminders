'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard } from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
]

export default function AdminSideNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
