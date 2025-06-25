import PlatformSidebar from './PlatformSidebar';
import Header from './Header';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col">
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