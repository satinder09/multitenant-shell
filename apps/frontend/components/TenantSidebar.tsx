'use client';

import { Home, Shield, Key, Users, Settings, MoreHorizontal } from 'lucide-react';
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
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-8 px-3 font-normal text-sm rounded-md",
          isActive 
            ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white" 
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="truncate">{text}</span>
      </Button>
    </Link>
  );
}

function SidebarSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {title && (
        <div className="px-3 py-2">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </h2>
        </div>
      )}
      <div className="space-y-1 px-2">
        {children}
      </div>
    </div>
  );
}

export default function TenantSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    // Only treat root path as active on exact match; other paths match prefixes
    if (path === '/') {
      return pathname === '/';
    }
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col min-h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="font-semibold text-lg text-gray-900">Tenant Portal</span>
        </div>
      </div>

      {/* Quick Create Button */}
      <div className="p-4">
        <Button className="w-full justify-start gap-3 bg-gray-900 text-white hover:bg-gray-800 h-9 rounded-md font-medium">
          <div className="w-4 h-4 bg-white rounded-full"></div>
          Quick Create
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 pb-4 space-y-6">
        <SidebarSection>
          <SidebarLink 
            icon={<Home />} 
            text="Home" 
            href="/"
            isActive={isActive('/')}
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
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-1">
          <SidebarLink 
            icon={<Settings />} 
            text="Settings" 
            href="/settings"
            isActive={isActive('/settings')}
          />
        </div>
        
        {/* User Profile */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">shadcn</div>
              <div className="text-xs text-gray-500 truncate">m@example.com</div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </aside>
  );
} 