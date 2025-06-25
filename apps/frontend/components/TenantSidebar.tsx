'use client';

import { Home, Shield, Key, Users, FileText, Settings, Circle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function SidebarLink({ 
  icon, 
  text, 
  href, 
  isActive = false 
}: { 
  icon: React.ReactNode; 
  text: string; 
  href: string;
  isActive?: boolean;
}) {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-10 px-3 font-medium",
          isActive 
            ? "bg-secondary text-secondary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="truncate">{text}</span>
      </Button>
    </Link>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-3 py-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="space-y-1 px-2">
        {children}
      </div>
    </div>
  );
}

export default function TenantSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col min-h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Circle className="h-4 w-4 fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight">Tenant Portal</span>
        </div>
      </div>

      {/* Quick Create Button */}
      <div className="p-4">
        <Button className="w-full justify-start gap-3 bg-foreground text-background hover:bg-foreground/90">
          <Circle className="h-4 w-4 fill-current" />
          Quick Create
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 pb-4 space-y-6">
        <SidebarSection title="">
          <SidebarLink 
            icon={<Home />} 
            text="Home" 
            href="/"
            isActive={isActive('/')}
          />
          <SidebarLink 
            icon={<FileText />} 
            text="Dashboard" 
            href="/page1"
            isActive={isActive('/page1')}
          />
          <SidebarLink 
            icon={<FileText />} 
            text="Analytics" 
            href="/page2"
            isActive={isActive('/page2')}
          />
        </SidebarSection>

        <SidebarSection title="Administration">
          <SidebarLink 
            icon={<Shield />} 
            text="Roles" 
            href="/admin/roles"
            isActive={isActive('/admin/roles')}
          />
          <SidebarLink 
            icon={<Key />} 
            text="Permissions" 
            href="/admin/permissions"
            isActive={isActive('/admin/permissions')}
          />
          <SidebarLink 
            icon={<Users />} 
            text="Users" 
            href="/admin/users"
            isActive={isActive('/admin/users')}
          />
        </SidebarSection>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border">
        <div className="space-y-1">
          <SidebarLink 
            icon={<Settings />} 
            text="Settings" 
            href="/settings"
            isActive={isActive('/settings')}
          />
        </div>
      </div>
    </aside>
  );
} 