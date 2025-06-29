'use client';
import React, { createContext, useContext, useMemo } from 'react';
import { isPlatformHost, getTenantSubdomain } from '@/shared/utils/contextUtils';

interface PlatformContextType {
  isPlatform: boolean;
  tenantSubdomain: string | null;
  baseDomain: string;
}

const PlatformContext = createContext<PlatformContextType>({ 
  isPlatform: true, 
  tenantSubdomain: null,
  baseDomain: 'lvh.me'
});

// Export the context for testing
export { PlatformContext };

export const usePlatform = () => useContext(PlatformContext);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => {
    let isPlatform = true;
    let tenantSubdomain: string | null = null;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
    
    console.log('[PlatformContext] PlatformProvider initializing...');
    
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      console.log('[PlatformContext] window.location.host:', host);
      
      isPlatform = isPlatformHost(host);
      tenantSubdomain = getTenantSubdomain(host);
      
      console.log('[PlatformContext] Determined context:', { isPlatform, tenantSubdomain, baseDomain });
    } else {
      console.log('[PlatformContext] Running on server side, defaulting to platform');
    }
    
    return { 
      isPlatform, 
      tenantSubdomain,
      baseDomain
    };
  }, []);
  
  console.log('[PlatformContext] Providing context value:', value);
  
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}; 