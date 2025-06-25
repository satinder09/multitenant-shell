'use client';
import { usePlatform } from '@/context/PlatformContext';

export default function AdminPermissionsPage() {
  const { isPlatform } = usePlatform();
  if (isPlatform) {
    return <div className="text-red-500 p-4">This page is only available in a tenant context.</div>;
  }
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">Permissions Management</h1>
      <p className="text-muted-foreground mb-8">
        Manage permissions for your application.
      </p>
      {/* You can add your permissions table or management UI here */}
      <div>No permissions UI implemented yet.</div>
    </div>
  );
} 