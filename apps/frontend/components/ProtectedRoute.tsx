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
  const { user } = useAuth();
  const router = useRouter();

  const isAuthCheckComplete = user !== undefined;
  const isAuthenticated = user !== null && user !== undefined;

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

  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if ((requireAuth && isAuthenticated) || (!requireAuth && !isAuthenticated)) {
    return <>{children}</>;
  }
  
  // In other cases (redirect pending), render nothing to avoid flicker.
  return null;
} 