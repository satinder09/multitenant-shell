import TenantSidebar from './TenantSidebar';
import Header from './Header';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen font-sans bg-gray-50">
      <TenantSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 