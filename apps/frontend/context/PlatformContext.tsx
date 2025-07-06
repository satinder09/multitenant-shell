'use client';
import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { isPlatformHost, getTenantSubdomain } from '@/shared/utils/contextUtils';
import { platformContextService } from '@/shared/services/platform-context.service';
import { PlatformTenant } from '@/shared/types/platform.types';
import { TenantResolutionError } from '@/shared/services/tenant-resolution-errors';

interface PlatformContextType {
  isPlatform: boolean;
  tenantSubdomain: string | null;
  baseDomain: string;
  currentTenant: PlatformTenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  // Enhanced features
  getPerformanceMetrics: () => any;
  getDebugInfo: () => any;
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
  getPerformanceMetrics: () => null,
  getDebugInfo: () => null,
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

// Hook to get performance metrics (development only)
export const usePlatformPerformanceMetrics = () => {
  const { getPerformanceMetrics } = usePlatform();
  return getPerformanceMetrics();
};

// Hook to get debug info (development only)
export const usePlatformDebugInfo = () => {
  const { getDebugInfo } = usePlatform();
  return getDebugInfo();
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

  // State update polling for reactive updates
  const [, forceUpdate] = useState({});

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

  // Sync with enhanced service state
  useEffect(() => {
    const updateTenantState = () => {
      const serviceState = platformContextService.getState();
      const errorMessage: string | null = serviceState.error ? serviceState.error.userMessage : null;
      setTenantState({
        currentTenant: serviceState.currentTenant,
        isLoading: serviceState.isLoading,
        error: errorMessage,
      });
    };

    // Initial update
    updateTenantState();

    // Set up polling for state changes (simple reactive approach)
    const interval = setInterval(() => {
      const serviceState = platformContextService.getState();
      const currentError: string | null = serviceState.error ? serviceState.error.userMessage : null;
      
      if (
        serviceState.currentTenant !== tenantState.currentTenant ||
        serviceState.isLoading !== tenantState.isLoading ||
        currentError !== tenantState.error
      ) {
        updateTenantState();
        forceUpdate({});
      }
    }, 100); // Check every 100ms for state changes

    return () => clearInterval(interval);
  }, [tenantState.currentTenant, tenantState.isLoading, tenantState.error]);

  // Initialize tenant metadata resolution
  useEffect(() => {
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
        platformContextService.refreshTenantMetadata(baseValue.tenantSubdomain).catch((error) => {
          console.error('Failed to refresh tenant metadata:', error);
          
          // Enhanced error logging with performance data
          if (process.env.NODE_ENV === 'development') {
            const debugInfo = platformContextService.getDebugInfo();
            if (debugInfo) {
              console.log('[PlatformContext] Debug info after error:', debugInfo);
            }
          }
        });
      }
    }
  }, [baseValue.tenantSubdomain, tenantState.currentTenant, tenantState.isLoading]);

  const refreshTenant = useMemo(() => async () => {
    if (baseValue.tenantSubdomain) {
      try {
        await platformContextService.refreshTenantMetadata(baseValue.tenantSubdomain);
        // State will be updated by the polling effect
      } catch (error) {
        console.error('Failed to refresh tenant metadata:', error);
        
        // Enhanced error logging
        if (process.env.NODE_ENV === 'development') {
          const debugInfo = platformContextService.getDebugInfo();
          if (debugInfo) {
            console.log('[PlatformContext] Debug info after refresh error:', debugInfo);
          }
        }
        
        throw error; // Re-throw for caller to handle
      }
    }
  }, [baseValue.tenantSubdomain]);

  const tenantId = useMemo(() => {
    return platformContextService.getCurrentTenantId();
  }, [tenantState.currentTenant]);

  // Performance monitoring functions
  const getPerformanceMetrics = useMemo(() => () => {
    return platformContextService.getPerformanceMetrics();
  }, []);

  const getDebugInfo = useMemo(() => () => {
    return platformContextService.getDebugInfo();
  }, []);

  const value = useMemo(() => ({
    ...baseValue,
    ...tenantState,
    tenantId,
    refreshTenant,
    getPerformanceMetrics,
    getDebugInfo,
  }), [baseValue, tenantState, tenantId, refreshTenant, getPerformanceMetrics, getDebugInfo]);
  
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
    console.log('[PlatformContext] Providing context value:', value);
    
    // Log performance metrics periodically in debug mode
    const metrics = getPerformanceMetrics();
    if (metrics) {
      console.log('[PlatformContext] Performance metrics:', metrics);
    }
  }
  
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}; 