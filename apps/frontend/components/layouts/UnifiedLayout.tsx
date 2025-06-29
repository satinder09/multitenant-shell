'use client';

import { usePlatform } from '@/context/PlatformContext';
import PlatformSidebar from './PlatformSidebar';
import TenantSidebar from './TenantSidebar';
import Header from './Header';

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

export default function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const { isPlatform, tenantSubdomain } = usePlatform();

  // Dynamically choose sidebar based on context
  const Sidebar = isPlatform ? PlatformSidebar : TenantSidebar;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Context-aware Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 