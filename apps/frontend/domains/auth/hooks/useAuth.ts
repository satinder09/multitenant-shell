// Re-export the main auth hook with domain-specific enhancements
'use client';

import { useAuth as useAuthContext } from '@/context/AuthContext';
import { AuthContextType } from '../types/auth.types';

// Re-export the main auth hook
export const useAuth = useAuthContext;

// Additional auth utilities
export function useAuthState() {
  const { user, isAuthenticated, isSuperAdmin, tenantId } = useAuth();
  
  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    tenantId,
    isLoading: user === undefined,
    hasRole: (role: string) => user?.role === role || (user?.isSuperAdmin && role === 'admin'),
    hasTenantAccess: (requiredTenantId: string) => user?.tenantId === requiredTenantId,
    isImpersonating: !!user?.impersonationSessionId,
  };
}

export function useAuthActions() {
  const { login, logout, refreshUser } = useAuth();
  
  return {
    login,
    logout,
    refreshUser,
  };
} 