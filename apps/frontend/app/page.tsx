'use client';

import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isPlatform, tenantSubdomain } = usePlatform();
  
  console.log('[DashboardPage] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin 
  });
  
  // If we're in platform context and user is super admin, show a simple dashboard
  // The MasterDashboard will be available at /platform/tenants instead
  if (isPlatform && user?.isSuperAdmin) {
    console.log('[DashboardPage] Platform context + super admin detected, rendering simple platform dashboard');
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Platform Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Welcome back, Admin!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.name || 'Super Admin'}</div>
              <p className="text-xs text-muted-foreground">
                Use the sidebar to manage platform resources.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // For tenant context or non-admin users, show regular dashboard
  console.log('[DashboardPage] Tenant context or non-admin user, rendering regular dashboard');
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
