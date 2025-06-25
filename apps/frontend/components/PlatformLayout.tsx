import PlatformSidebar from './PlatformSidebar';
import Header from './Header';
import { usePathname } from 'next/navigation';
import SubSidebar from './SubSidebar';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Show SubSidebar only on /platform/admin/* routes
  const showSubSidebar = pathname.startsWith('/platform/admin/');

  return (
    <div className="flex h-screen">
      <PlatformSidebar />
      {showSubSidebar && <SubSidebar />}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
} 