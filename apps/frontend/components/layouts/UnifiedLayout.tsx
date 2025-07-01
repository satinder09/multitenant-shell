'use client';

import { usePlatform } from '@/context/PlatformContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import PlatformSidebar from './PlatformSidebar';
import TenantSidebar from './TenantSidebar';
import PlatformHeader from './PlatformHeader';
import TenantHeader from './TenantHeader';

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

export default function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const { isPlatform } = usePlatform();

  // Dynamically choose components based on context
  const SidebarComponent = isPlatform ? PlatformSidebar : TenantSidebar;
  const HeaderComponent = isPlatform ? PlatformHeader : TenantHeader;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <SidebarComponent />
      <SidebarInset className="flex flex-col min-h-screen">
        <HeaderComponent />
        <div className="flex flex-1 flex-col gap-4 px-8 py-6 min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 