'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MasterDashboard } from '@/components/MasterDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Check if this is a master instance (lvh.me) or tenant instance
  const isMasterInstance = typeof window !== 'undefined' && 
    (window.location.hostname === 'lvh.me' || window.location.hostname === 'localhost');
  
  // Show MasterDashboard for master users on master instance
  if (isMasterInstance && user?.isSuperAdmin) {
    return <MasterDashboard />;
  }
  
  // Regular dashboard for tenant users or non-admin users
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Welcome back!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.name || 'User'}</div>
            <p className="text-xs text-muted-foreground">
              Here&apos;s what&apos;s happening today.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
