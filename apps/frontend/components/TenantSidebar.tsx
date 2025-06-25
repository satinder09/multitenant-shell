import Link from 'next/link';

export default function TenantSidebar() {
  return (
    <nav className="flex flex-col gap-2 p-4 border-r h-full min-w-[220px] bg-muted">
      <h2 className="font-bold text-lg mb-2">Tenant Admin</h2>
      <Link href="/admin/roles" className="hover:underline">Tenant Roles</Link>
      <Link href="/admin/permissions" className="hover:underline">Tenant Permissions</Link>
      <Link href="/admin/users" className="hover:underline">Users</Link>
    </nav>
  );
} 