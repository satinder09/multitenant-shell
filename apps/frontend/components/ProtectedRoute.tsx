'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * If `false`, the route is considered public. 
   * A logged-in user accessing a public route will be redirected to the home page.
   * Example: `/login` page.
   */
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if auth check is complete (user is either null or a valid user object)
  const isAuthCheckComplete = user !== undefined;

  useEffect(() => {
    if (isAuthCheckComplete) {
      if (requireAuth && !isAuthenticated) {
        router.push('/login');
      }
      
      if (!requireAuth && isAuthenticated) {
        router.push('/');
      }
    }
  }, [isAuthCheckComplete, isAuthenticated, requireAuth, router]);

  // Show loading spinner only if auth check is not complete
  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Render children if conditions are met
  if ((requireAuth && isAuthenticated) || (!requireAuth && !isAuthenticated)) {
    return <>{children}</>;
  }
  
  // In other cases (redirect pending), render nothing to avoid flicker.
  return null;
} 