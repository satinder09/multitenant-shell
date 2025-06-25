import PlatformSidebar from './PlatformSidebar';
import Header from './Header';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  console.log('[PlatformLayout] Rendering PlatformLayout with PlatformSidebar');
  
  return (
    <div className="flex h-screen">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
} 