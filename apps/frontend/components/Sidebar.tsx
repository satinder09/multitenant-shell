'use client';

import { Home, Shield, Key, Building2, Circle } from 'lucide-react';
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

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/platform') {
      return pathname === '/platform';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col min-h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Circle className="h-4 w-4 fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight">Acme Inc.</span>
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
            text="Dashboard" 
            href="/platform"
            isActive={isActive('/platform')}
          />
          <SidebarLink 
            icon={<Building2 />} 
            text="Tenants" 
            href="/platform/tenants"
            isActive={isActive('/platform/tenants')}
          />
        </SidebarSection>

        <SidebarSection title="Administration">
          <SidebarLink 
            icon={<Shield />} 
            text="Roles" 
            href="/platform/admin/roles"
            isActive={isActive('/platform/admin/roles')}
          />
          <SidebarLink 
            icon={<Key />} 
            text="Permissions" 
            href="/platform/admin/permissions"
            isActive={isActive('/platform/admin/permissions')}
          />
        </SidebarSection>

        <SidebarSection title="Documents">
          <SidebarLink 
            icon={<Building2 />} 
            text="Data Library" 
            href="/platform/data-library"
            isActive={isActive('/platform/data-library')}
          />
          <SidebarLink 
            icon={<Shield />} 
            text="Reports" 
            href="/platform/reports"
            isActive={isActive('/platform/reports')}
          />
        </SidebarSection>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border">
        <div className="space-y-1">
          <SidebarLink 
            icon={<Shield />} 
            text="Settings" 
            href="/platform/settings"
            isActive={isActive('/platform/settings')}
          />
          <SidebarLink 
            icon={<Key />} 
            text="Get Help" 
            href="/platform/help"
            isActive={isActive('/platform/help')}
          />
        </div>
      </div>
    </aside>
  );
} 