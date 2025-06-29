'use client';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UnifiedLayout from './UnifiedLayout';

export default function ContextAwareLayout({ children }: { children: React.ReactNode }) {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Pages that should not have the layout wrapper
  const publicPages = ['/login'];
  const isPublicPage = publicPages.includes(pathname);

  console.log('[ContextAwareLayout] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    isAuthenticated, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin,
    isPublicPage
  });

  useEffect(() => {
    if (!isAuthenticated && !isPublicPage) {
      console.log('[ContextAwareLayout] User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, isPublicPage, router]);

  // If it's a public page or user is not authenticated, render without layout
  if (isPublicPage || !isAuthenticated) {
    console.log('[ContextAwareLayout] Public page or not authenticated, rendering children directly');
    return <>{children}</>;
  }

  // For authenticated pages, use the unified layout
  console.log('[ContextAwareLayout] Authenticated private page, rendering UnifiedLayout');
  return <UnifiedLayout>{children}</UnifiedLayout>;
} 