'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Shield, Users, Home } from 'lucide-react';

export default function PlatformSidebar() {
  const pathname = usePathname();
  
  console.log('[PlatformSidebar] Rendering PlatformSidebar with pathname:', pathname);
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <nav className="flex flex-col gap-2 p-4 border-r h-full min-w-[220px] bg-muted">
      <h2 className="font-bold text-lg mb-4">Platform Admin</h2>
      
      <Link 
        href="/" 
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
        }`}
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      
      <Link 
        href="/platform/tenants" 
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          isActive('/platform/tenants') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
        }`}
      >
        <Building2 className="w-4 h-4" />
        Tenants
      </Link>
      
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-3">ACCESS CONTROL</p>
        
        <Link 
          href="/platform/admin/roles" 
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            isActive('/platform/admin/roles') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles
        </Link>
        
        <Link 
          href="/platform/admin/permissions" 
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            isActive('/platform/admin/permissions') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
          }`}
        >
          <Users className="w-4 h-4" />
          Permissions
        </Link>
      </div>
    </nav>
  );
} 