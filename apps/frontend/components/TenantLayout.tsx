import TenantSidebar from './TenantSidebar';
import Header from './Header';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  console.log('[TenantLayout] Rendering TenantLayout with TenantSidebar');
  
  return (
    <div className="flex h-screen">
      <TenantSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
} 