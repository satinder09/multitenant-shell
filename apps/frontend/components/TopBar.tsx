'use client';

import { UserNav } from './UserNav';
import ThemeToggle from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, Github } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TopBar() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      {/* Left Section - Breadcrumb/Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Documents</span>
        </div>
      </div>

      {/* Right Section - Actions and User */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="w-64 pl-10 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* GitHub Link */}
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Github className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            3
          </Badge>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Nav */}
        <UserNav />
      </div>
    </header>
  );
} 