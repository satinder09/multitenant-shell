'use client';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import UnifiedLayout from './UnifiedLayout';

export default function ContextAwareLayout({ children }: { children: React.ReactNode }) {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const { user, isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Memoize public pages check for performance
  const isPublicPage = useMemo(() => {
    const publicPages = ['/login'];
    return publicPages.includes(pathname);
  }, [pathname]);

  // Handle authentication redirects efficiently
  useEffect(() => {
    // Skip redirect logic during loading, logging out, or on public pages
    if (isLoading || isLoggingOut || isPublicPage) return;

    // Only redirect if user is not authenticated and not already redirecting
    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login');
      return;
    }
    
    // Reset redirect flag when user becomes authenticated
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isPublicPage, isLoading, isLoggingOut, router]);

  // Show loading during auth transitions or logout (but don't block if just logging out)
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If it's a public page render without layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // During logout, keep the layout visible until navigation completes
  // OR if user is authenticated, show the layout
  if (isLoggingOut || isAuthenticated) {
    return <UnifiedLayout>{children}</UnifiedLayout>;
  }

  // Only for non-authenticated, non-logout states, render without layout
  return <>{children}</>;
}
