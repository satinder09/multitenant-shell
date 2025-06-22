'use client';

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Home, Building, FileText, Settings } from 'lucide-react'

const masterNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tenants', label: 'Tenants', icon: Building },
]

const tenantNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/page1', label: 'Page 1', icon: FileText },
  { href: '/page2', label: 'Page 2', icon: Settings },
]

export default function Sidebar() {
  const { user } = useAuth();

  // Show master nav only if user is super admin AND not in a tenant context.
  // Otherwise, show tenant nav.
  const navItems = user?.isSuperAdmin && !user?.tenantId 
    ? masterNavItems 
    : tenantNavItems;

  return (
    <aside className="w-64 bg-zinc-100 dark:bg-zinc-800 border-r dark:border-zinc-700 h-full p-4">
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center text-sm font-medium rounded px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
