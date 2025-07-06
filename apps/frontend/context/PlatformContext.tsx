'use client';
import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
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
  // New optimization features
  retryTenantResolution: () => Promise<void>;
  clearError: () => void;
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
  retryTenantResolution: async () => {},
  clearError: () => {},
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

  // Performance optimization: Use refs to track latest state without causing re-renders
  const latestStateRef = React.useRef(tenantState);
  latestStateRef.current = tenantState;

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

  // Optimized state synchronization with event-driven approach
  const syncWithService = useCallback(() => {
    const serviceState = platformContextService.getState();
    const errorMessage: string | null = serviceState.error ? serviceState.error.userMessage : null;
    
    const newState = {
      currentTenant: serviceState.currentTenant,
      isLoading: serviceState.isLoading,
      error: errorMessage,
    };
    
    // Only update state if something actually changed
    if (
      newState.currentTenant !== latestStateRef.current.currentTenant ||
      newState.isLoading !== latestStateRef.current.isLoading ||
      newState.error !== latestStateRef.current.error
    ) {
      setTenantState(newState);
      
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
        console.log('[PlatformContext] State synchronized:', newState);
      }
    }
  }, []);

  // Replace polling with more efficient approach
  useEffect(() => {
    // Initial synchronization
    syncWithService();

    // Set up more efficient state checking with reduced frequency
    // Use requestAnimationFrame for optimal performance
    let animationFrameId: number;
    let lastCheckTime = 0;
    const CHECK_INTERVAL = 250; // Reduced from 100ms to 250ms

    const checkForUpdates = (currentTime: number) => {
      if (currentTime - lastCheckTime >= CHECK_INTERVAL) {
        syncWithService();
        lastCheckTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(checkForUpdates);
    };

    animationFrameId = requestAnimationFrame(checkForUpdates);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [syncWithService]);

  // Optimized tenant metadata resolution with better error handling
  const resolveTenantMetadata = useCallback(async (subdomain: string, isRetry: boolean = false) => {
    try {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
        console.log(`[PlatformContext] ${isRetry ? 'Retrying' : 'Resolving'} tenant metadata for:`, subdomain);
      }

      await platformContextService.refreshTenantMetadata(subdomain);
      
      // Success - sync immediately
      syncWithService();
      
    } catch (error) {
      console.error('Failed to resolve tenant metadata:', error);
      
      // Enhanced error handling with fallback mechanisms
      if (process.env.NODE_ENV === 'development') {
        const debugInfo = platformContextService.getDebugInfo();
        if (debugInfo) {
          console.log('[PlatformContext] Debug info after error:', debugInfo);
        }
      }
      
      // Sync state to reflect error
      syncWithService();
      
      // Don't re-throw on initial load, but do on explicit retries
      if (isRetry) {
        throw error;
      }
    }
  }, [syncWithService]);

  // Enhanced tenant metadata initialization with better public page detection
  useEffect(() => {
    if (baseValue.tenantSubdomain && !tenantState.currentTenant && !tenantState.isLoading) {
      const isPublicPage = typeof window !== 'undefined' && (
        window.location.pathname === '/login' || 
        window.location.pathname === '/signup' ||
        window.location.pathname === '/forgot-password' ||
        window.location.pathname === '/reset-password' ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname.startsWith('/public/')
      );
      
      if (!isPublicPage) {
        resolveTenantMetadata(baseValue.tenantSubdomain);
      } else {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PLATFORM) {
          console.log('[PlatformContext] Skipping tenant metadata resolution on public page:', window.location.pathname);
        }
      }
    }
  }, [baseValue.tenantSubdomain, tenantState.currentTenant, tenantState.isLoading, resolveTenantMetadata]);

  // Optimized refresh function with better error handling
  const refreshTenant = useCallback(async () => {
    if (baseValue.tenantSubdomain) {
      try {
        await resolveTenantMetadata(baseValue.tenantSubdomain, true);
      } catch (error) {
        console.error('Failed to refresh tenant metadata:', error);
        throw error; // Re-throw for caller to handle
      }
    }
  }, [baseValue.tenantSubdomain, resolveTenantMetadata]);

  // New retry function for better error recovery
  const retryTenantResolution = useCallback(async () => {
    if (baseValue.tenantSubdomain) {
      try {
        await resolveTenantMetadata(baseValue.tenantSubdomain, true);
      } catch (error) {
        console.error('Failed to retry tenant resolution:', error);
        throw error;
      }
    }
  }, [baseValue.tenantSubdomain, resolveTenantMetadata]);

  // New error clearing function
  const clearError = useCallback(() => {
    if (tenantState.error) {
      setTenantState(prev => ({ ...prev, error: null }));
    }
  }, [tenantState.error]);

  // Optimized tenant ID computation
  const tenantId = useMemo(() => {
    return platformContextService.getCurrentTenantId();
  }, [tenantState.currentTenant]);

  // Performance monitoring functions (memoized for efficiency)
  const getPerformanceMetrics = useCallback(() => {
    return platformContextService.getPerformanceMetrics();
  }, []);

  const getDebugInfo = useCallback(() => {
    return platformContextService.getDebugInfo();
  }, []);

  // Optimized context value with better memoization
  const value = useMemo(() => ({
    ...baseValue,
    ...tenantState,
    tenantId,
    refreshTenant,
    getPerformanceMetrics,
    getDebugInfo,
    retryTenantResolution,
    clearError,
  }), [
    baseValue, 
    tenantState, 
    tenantId, 
    refreshTenant, 
    getPerformanceMetrics, 
    getDebugInfo,
    retryTenantResolution,
    clearError
  ]);
  
  // Performance monitoring in development
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