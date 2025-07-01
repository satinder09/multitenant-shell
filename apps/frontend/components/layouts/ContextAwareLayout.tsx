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
  
  // Platform pages have their own ShadCN layout, so skip the old layout
  const isPlatformPage = pathname.startsWith('/platform');

  console.log('[ContextAwareLayout] Rendering with state:', { 
    isPlatform, 
    tenantSubdomain, 
    isAuthenticated, 
    userEmail: user?.email,
    isSuperAdmin: user?.isSuperAdmin,
    isPublicPage,
    isPlatformPage,
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

  // If it's a platform page, skip the old layout (it has its own ShadCN layout)
  if (isPlatformPage) {
    console.log('[ContextAwareLayout] Platform page detected, skipping UnifiedLayout for ShadCN layout');
    return <>{children}</>;
  }

  // For other authenticated pages (tenant pages), use the unified layout
  console.log('[ContextAwareLayout] Non-platform authenticated page, rendering UnifiedLayout');
  return <UnifiedLayout>{children}</UnifiedLayout>;
}
