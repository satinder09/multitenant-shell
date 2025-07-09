'use client';

import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isPlatform, tenantSubdomain } = usePlatform();
  const router = useRouter();
  const hasRedirected = useRef(false);
  
  console.log('[DashboardPage] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'server',
    hasRedirected: hasRedirected.current
  });
  
  // CRITICAL: Platform users should NEVER stay on the root route
  // Only redirect them to /platform if they're actually on the root route
  useEffect(() => {
    // Only redirect if we haven't already redirected and conditions are met
    if (!hasRedirected.current && isPlatform && user?.isSuperAdmin) {
      // Check if we're actually on the root route, not just passing through
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      
      console.log('🔍 ROOT PAGE REDIRECT CHECK:', {
        'currentPath': currentPath,
        'isPlatform': isPlatform,
        'isSuperAdmin': user?.isSuperAdmin,
        'hasRedirected': hasRedirected.current,
        'window.location.href': typeof window !== 'undefined' ? window.location.href : 'server',
        'shouldRedirect': currentPath === '/'
      });
      
      // Only redirect if we're actually on the root route
      if (currentPath === '/') {
        console.log('❌ ROOT PAGE: Redirecting platform admin from root to /platform');
        hasRedirected.current = true;
        router.replace('/platform');
        return;
      } else {
        console.log('✅ ROOT PAGE: Not redirecting - user is navigating to:', currentPath);
      }
    }
  }, [isPlatform, user?.isSuperAdmin, router]);
  
  // Show loading state while redirecting platform users from root route only
  if (isPlatform && user?.isSuperAdmin && hasRedirected.current) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    // Only show loading if we're actually on the root route and redirecting
    if (currentPath === '/') {
      console.log('[DashboardPage] Platform admin detected, showing loading while redirecting');
      return (
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to platform...</p>
            </div>
          </div>
        </div>
      );
    }
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
