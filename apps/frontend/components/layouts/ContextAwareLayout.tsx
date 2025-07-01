'use client';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import UnifiedLayout from './UnifiedLayout';

export default function ContextAwareLayout({ children }: { children: React.ReactNode }) {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Pages that should not have the layout wrapper
  const publicPages = ['/login'];
  const isPublicPage = publicPages.includes(pathname);

  console.log('[ContextAwareLayout] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    isAuthenticated, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin,
    isPublicPage,
    pathname
  });

  useEffect(() => {
    // Only redirect if user is not authenticated and not on a public page
    // Use ref to prevent multiple redirects
    if (!isAuthenticated && !isPublicPage && !hasRedirected.current) {
      console.log('[ContextAwareLayout] User not authenticated, redirecting to login');
      hasRedirected.current = true;
      router.push('/login');
    }
    
    // Reset redirect flag when user becomes authenticated
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isPublicPage, router]);

  // If it's a public page or user is not authenticated, render without layout
  if (isPublicPage || !isAuthenticated) {
    console.log('[ContextAwareLayout] Public page or not authenticated, rendering children directly');
    return <>{children}</>;
  }

  // For all authenticated pages, use the unified layout
  console.log('[ContextAwareLayout] Authenticated page, rendering UnifiedLayout');
  return <UnifiedLayout>{children}</UnifiedLayout>;
}
