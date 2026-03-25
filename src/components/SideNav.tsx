'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/children', label: 'Children', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/profile', label: 'Settings', icon: Settings },
]

export default function SideNav({ name }: { name?: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex-col z-40 print:hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Childminder</p>
            <p className="text-xs text-gray-400 leading-tight">Invoicing</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')) || (href === '/dashboard' && pathname === '/dashboard')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 flex-shrink-0', active ? 'text-emerald-600' : 'text-gray-400')} style={{ width: '1.125rem', height: '1.125rem' }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User profile at bottom */}
      {name && (
        <div className="px-3 py-3 border-t border-gray-100">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-700 font-bold text-xs">
                {name[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
              <p className="text-xs text-gray-400">View profile</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  )
}
