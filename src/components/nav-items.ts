import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

/** App destinations shared by the desktop sidebar and the mobile bottom bar. */
export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/children', label: 'Children', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/profile', label: 'Settings', icon: Settings },
]

/**
 * Home matches only `/dashboard`. Other items also match nested paths
 * such as `/invoices/new` or `/children/[id]`.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === '/dashboard') return false
  return pathname.startsWith(`${href}/`)
}
