'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isNavItemActive, navItems } from '@/components/nav-items'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 print:hidden md:hidden">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 min-w-0 gap-1 text-xs font-medium leading-none tracking-tight transition-colors',
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
