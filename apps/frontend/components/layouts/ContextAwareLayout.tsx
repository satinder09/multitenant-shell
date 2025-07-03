'use client';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import UnifiedLayout from './UnifiedLayout';
import { browserApi } from '@/shared/services/api-client';

export default function ContextAwareLayout({ children }: { children: React.ReactNode }) {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const { user, isAuthenticated, isLoading, isLoggingOut, refreshUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [isProcessingSecureLogin, setIsProcessingSecureLogin] = useState(false);

  // Check for secure login token in URL
  useEffect(() => {
    const processSecureLoginToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const secureLoginToken = urlParams.get('secureLoginToken');
      
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log('🔐 Checking for secure login token:', {
          hasToken: !!secureLoginToken,
          isProcessing: isProcessingSecureLogin,
          currentPath: pathname,
          isAuthenticated
        });
      }
      
      if (secureLoginToken && !isProcessingSecureLogin) {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
          console.log('🔐 Processing secure login token from URL');
        }
        setIsProcessingSecureLogin(true);
        
        try {
          // Set the authentication cookie using our API
          const response = await browserApi.post('/api/auth/secure-login', { token: secureLoginToken });
          
          if (response.success) {
            if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
              console.log('🔐 Secure login cookie set successfully');
            }
            
            // Remove token from URL
            urlParams.delete('secureLoginToken');
            const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
            window.history.replaceState({}, '', newUrl);
            
            // Refresh user profile to pick up the new authentication
            await refreshUser(true);
            
            // Redirect to home page after successful secure login
            router.push('/');
          } else {
            console.error('🔐 Failed to set secure login cookie');
          }
        } catch (error) {
          console.error('🔐 Error processing secure login token:', error);
        } finally {
          setIsProcessingSecureLogin(false);
        }
      }
    };
    
    processSecureLoginToken();
  }, [isProcessingSecureLogin, refreshUser, router]);

  // Memoize public pages check for performance
  const isPublicPage = useMemo(() => {
    const publicPages = ['/login'];
    return publicPages.includes(pathname);
  }, [pathname]);

  // Handle authentication redirects efficiently
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
      console.log('🔄 ContextAwareLayout auth check:', {
        isLoading,
        isLoggingOut,
        isPublicPage,
        isAuthenticated,
        pathname,
        user: user ? { id: user.id, accessType: user.accessType } : null
      });
    }
    
    // Skip redirect logic during loading, logging out, or on public pages
    if (isLoading || isLoggingOut || isPublicPage) return;

    // Only redirect if user is not authenticated and not already redirecting
    if (!isAuthenticated && !hasRedirected.current) {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log('🔄 User not authenticated, redirecting to login');
      }
      hasRedirected.current = true;
      router.push('/login');
      return;
    }
    
    // Reset redirect flag when user becomes authenticated
    if (isAuthenticated) {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log('🔄 User authenticated, resetting redirect flag');
      }
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isPublicPage, isLoading, isLoggingOut, router]);

  // Show loading during auth transitions or logout (but don't block if just logging out)
  if (isLoading || isProcessingSecureLogin) {
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
