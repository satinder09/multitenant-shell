'use client'
import ThemeToggle from './ThemeToggle'
import { UserNav } from './UserNav'

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between px-6 py-3 border-b dark:border-zinc-700 bg-background">
      <h1 className="text-xl font-semibold">XoroLite ERP</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  )
}
