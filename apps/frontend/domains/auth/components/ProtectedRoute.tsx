'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { ProtectedRouteProps } from '../types/auth.types';

interface ExtendedProtectedRouteProps extends ProtectedRouteProps {
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
  requiredPermissions = [],
  requiredRoles = [],
  fallback
}: ExtendedProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if auth check is complete (user is either null or a valid user object)
  const isAuthCheckComplete = user !== undefined;

  // Check permissions and roles (simplified for current user structure)
  const hasRequiredPermissions = requiredPermissions.length === 0; // TODO: Implement permission checking
  
  const hasRequiredRoles = requiredRoles.length === 0 || 
    requiredRoles.every(role => user?.role === role || (user?.isSuperAdmin && role === 'admin'));

  const hasAccess = hasRequiredPermissions && hasRequiredRoles;

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

  // Check for insufficient permissions/roles
  if (requireAuth && isAuthenticated && !hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Render children if conditions are met
  if ((requireAuth && isAuthenticated && hasAccess) || (!requireAuth && !isAuthenticated)) {
    return <>{children}</>;
  }
  
  // In other cases (redirect pending), render nothing to avoid flicker.
  return null;
} 