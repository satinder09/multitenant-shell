import TenantSidebar from './TenantSidebar';
import Header from './Header';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  console.log('[TenantLayout] Rendering TenantLayout with TenantSidebar');
  
  return (
    <div className="flex min-h-screen bg-muted/10 font-sans">
      <TenantSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 bg-muted/10 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 