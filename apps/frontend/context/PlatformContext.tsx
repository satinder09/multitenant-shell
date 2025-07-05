'use client';
import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { isPlatformHost, getTenantSubdomain } from '@/shared/utils/contextUtils';
import { PlatformContextService } from '@/shared/services/platform-context.service';
import { PlatformTenant } from '@/shared/types/platform.types';

interface PlatformContextType {
  isPlatform: boolean;
  tenantSubdomain: string | null;
  baseDomain: string;
  currentTenant: PlatformTenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType>({ 
  isPlatform: true, 
  tenantSubdomain: null,
  baseDomain: 'lvh.me',
  currentTenant: null,
  tenantId: null,
  isLoading: false,
  error: null,
  refreshTenant: async () => {},
});

// Export the context for testing
export { PlatformContext };

export const usePlatform = () => useContext(PlatformContext);

// Hook to get tenant ID specifically
export const useTenantId = (): string | null => {
  const { tenantId } = usePlatform();
  return tenantId;
};

// Hook to get current tenant data
export const useCurrentTenant = (): PlatformTenant | null => {
  const { currentTenant } = usePlatform();
  return currentTenant;
};

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantState, setTenantState] = useState<{
    currentTenant: PlatformTenant | null;
    isLoading: boolean;
    error: string | null;
  }>({
    currentTenant: null,
    isLoading: false,
    error: null,
  });

  // Get the platform context service instance
  const contextService = useMemo(() => PlatformContextService.getInstance(), []);

  const baseValue = useMemo(() => {
    let isPlatform = true;
    let tenantSubdomain: string | null = null;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
    
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
      console.log('[PlatformContext] PlatformProvider initializing...');
    }
    
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
        console.log('[PlatformContext] window.location.host:', host);
      }
      
      isPlatform = isPlatformHost(host);
      tenantSubdomain = getTenantSubdomain(host);
      
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
        console.log('[PlatformContext] Determined context:', { isPlatform, tenantSubdomain, baseDomain });
      }
    } else {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
        console.log('[PlatformContext] Running on server side, defaulting to platform');
      }
    }
    
    return { isPlatform, tenantSubdomain, baseDomain };
  }, []);

  // Update tenant state when service state changes
  useEffect(() => {
    const updateTenantState = () => {
      const serviceState = contextService.getState();
      setTenantState({
        currentTenant: serviceState.currentTenant,
        isLoading: serviceState.isLoading,
        error: serviceState.error,
      });
    };

    // Initial update only
    updateTenantState();

    // Only fetch tenant metadata if we have a subdomain and haven't loaded yet
    // Skip fetching on public pages (login, signup) to avoid unnecessary auth errors
    if (baseValue.tenantSubdomain && !tenantState.currentTenant && !tenantState.isLoading) {
      const isPublicPage = typeof window !== 'undefined' && (
        window.location.pathname === '/login' || 
        window.location.pathname === '/signup' ||
        window.location.pathname === '/forgot-password' ||
        window.location.pathname === '/reset-password'
      );
      
      if (!isPublicPage) {
        contextService.refreshTenantMetadata(baseValue.tenantSubdomain).then(() => {
          updateTenantState();
        }).catch((error) => {
          console.error('Failed to refresh tenant metadata:', error);
          setTenantState({
            currentTenant: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load tenant',
          });
        });
      }
    }
  }, [contextService, baseValue.tenantSubdomain]);

  const refreshTenant = useMemo(() => async () => {
    if (baseValue.tenantSubdomain) {
      setTenantState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        await contextService.refreshTenantMetadata(baseValue.tenantSubdomain);
        const serviceState = contextService.getState();
        setTenantState({
          currentTenant: serviceState.currentTenant,
          isLoading: serviceState.isLoading,
          error: serviceState.error,
        });
      } catch (error) {
        setTenantState({
          currentTenant: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh tenant',
        });
      }
    }
  }, [baseValue.tenantSubdomain, contextService]);

  const tenantId = useMemo(() => {
    return contextService.getCurrentTenantId();
  }, [contextService, tenantState.currentTenant]);

  const value = useMemo(() => ({
    ...baseValue,
    ...tenantState,
    tenantId,
    refreshTenant,
  }), [baseValue, tenantState, tenantId, refreshTenant]);
  
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
    console.log('[PlatformContext] Providing context value:', value);
  }
  
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}; 