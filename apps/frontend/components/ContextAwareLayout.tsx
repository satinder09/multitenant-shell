'use client';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import PlatformLayout from './PlatformLayout';
import TenantLayout from './TenantLayout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ContextAwareLayout({ children }: { children: React.ReactNode }) {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  console.log('[ContextAwareLayout] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    isAuthenticated, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin 
  });

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[ContextAwareLayout] User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('[ContextAwareLayout] Not authenticated, returning null');
    return null;
  }

  // Render appropriate layout based on context
  if (isPlatform) {
    console.log('[ContextAwareLayout] Platform context detected, rendering PlatformLayout');
    return (
      <PlatformLayout>{children}</PlatformLayout>
    );
  } else {
    console.log('[ContextAwareLayout] Tenant context detected, rendering TenantLayout');
    return (
      <TenantLayout>{children}</TenantLayout>
    );
  }
} 