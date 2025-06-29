import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Settings, Plus } from 'lucide-react';

export default function SubSidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-52 bg-white/70 dark:bg-white/10 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 flex flex-col py-6 px-3 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-semibold tracking-wide">ADMIN CONTROLS</span>
        <button className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition" title="Add New Role">
          <Plus className="w-4 h-4 text-blue-600" />
        </button>
      </div>
      <Link href="/platform/admin/roles"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition ${isActive('/platform/admin/roles') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-white/80 dark:hover:bg-white/20'}`}
        title="Manage Roles"
      >
        <Shield className="w-4 h-4" /> Roles
      </Link>
      <Link href="/platform/admin/permissions"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition ${isActive('/platform/admin/permissions') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-white/80 dark:hover:bg-white/20'}`}
        title="Manage Permissions"
      >
        <Users className="w-4 h-4" /> Permissions
      </Link>
      <hr className="my-2 border-gray-200 dark:border-gray-700" />
      <Link href="/platform/admin/settings"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${isActive('/platform/admin/settings') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-white/80 dark:hover:bg-white/20'}`}
        title="Admin Settings"
      >
        <Settings className="w-4 h-4" /> Settings
      </Link>
    </aside>
  );
} 