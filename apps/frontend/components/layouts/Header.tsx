'use client'

import { UserNav } from '@/components/common/UserNav'
import ThemeToggle from '@/components/common/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { usePlatform } from '@/context/PlatformContext'

export default function Header() {
  const { isPlatform } = usePlatform()
  
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left Section - Document Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 font-medium">
            {isPlatform ? 'Platform Admin' : 'Documents'}
          </span>
        </div>
      </div>

      {/* Right Section - Actions and User */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            className="w-80 pl-10 h-9 bg-white border border-gray-200 rounded-md focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative hover:bg-gray-50">
          <Bell className="h-4 w-4 text-gray-600" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-red-500"
          >
            2
          </Badge>
        </Button>

        {/* User Nav */}
        <UserNav />
      </div>
    </header>
  )
}
