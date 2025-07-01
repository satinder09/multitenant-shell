// apps/frontend/context/AuthContext.tsx

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoginDto, login as loginApi, ApiError } from '@/shared/services/api';
import { Spinner } from '@/components/ui/spinner';
import { initializeCsrfProtection } from '@/domains/auth/services/csrfService';
import { AuthCache } from '@/shared/utils/authCache';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isSuperAdmin?: boolean;
  tenantId?: string;
  // Impersonation fields
  accessType?: 'secure_login' | 'impersonation' | 'direct_access';
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  impersonatedUserName?: string;
  impersonationSessionId?: string;
  originalUserId?: string;
  // add other user fields here
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (dto: LoginDto, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (forceRefresh?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context for testing
export { AuthContext };

// Helper to determine smart redirect destination
function getSmartRedirectPath(hostname: string, isSuperAdmin: boolean): string {
  // If on platform domain (lvh.me), go to platform
  if (hostname === 'lvh.me' || hostname.includes('localhost')) {
    return '/platform';
  }
  
  // If on tenant domain and super admin, they likely want platform access
  if (isSuperAdmin && hostname.includes('.lvh.me')) {
    return '/platform';
  }
  
  // For tenant domain, go to home
  return '/';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async (forceRefresh = false) => {
    console.log('🔍 AuthContext.refreshUser called, forceRefresh:', forceRefresh);
    // Try cache first unless force refresh
    if (!forceRefresh) {
      const cachedUser = AuthCache.get();
      if (cachedUser) {
        console.log('🔍 Using cached user:', cachedUser);
        setUser(cachedUser);
        return cachedUser;
      }
    }

    try {
      console.log('🔍 Fetching user profile from /api/auth/me');
      const response = await fetch('/api/auth/me', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      console.log('🔍 /api/auth/me response status:', response.status);
      if (response.ok) {
        const profile = await response.json();
        console.log('🔍 User profile received:', profile);
        setUser(profile);
        AuthCache.set(profile);
        return profile;
      } else {
        console.log('🔍 /api/auth/me failed, clearing user state');
        setUser(null);
        AuthCache.clear();
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      AuthCache.clear();
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      // Initialize CSRF protection
      initializeCsrfProtection();
      
      // Check current auth state (use cache if available)
      await refreshUser(false);
      
      if (mounted) {
        setIsInitialized(true);
      }
    };

    initializeAuth();
    return () => { mounted = false; };
  }, [refreshUser]);

  const login = useCallback(async (dto: LoginDto, redirectTo?: string) => {
    if (process.env.DEBUG_AUTH) {
      console.log('AuthContext.login called with:', { email: dto.email, rememberMe: dto.rememberMe });
    }
    setIsLoading(true);
    try {
      if (process.env.DEBUG_AUTH) {
        console.log('Calling loginApi...');
      }
      await loginApi(dto);
      if (process.env.DEBUG_AUTH) {
        console.log('loginApi succeeded, refreshing user...');
      }
      const profile = await refreshUser(true); // Force refresh after login
      
      if (profile) {
        // Smart redirect logic - ONLY redirect on successful login
        const destination = redirectTo || getSmartRedirectPath(
          window.location.hostname, 
          profile.isSuperAdmin
        );
        
        if (process.env.DEBUG_AUTH) {
          console.log('Login successful, redirecting to:', destination);
        }
        // Use router.push directly, no setTimeout needed
        router.push(destination);
      }
    } catch (error) {
      if (process.env.DEBUG_AUTH) {
        console.log('AuthContext.login error:', error);
        console.log('Error type:', typeof error);
        if (error instanceof Error) {
          console.log('Error message:', error.message);
        }
      }
      // Re-throw error so login form can handle it
      // DO NOT redirect or change state on error
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser, router]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear cache immediately but keep user state for smooth transition
    AuthCache.clear();
    
    // Start navigation immediately while keeping user state
    const redirectUrl = pathname.startsWith('/platform') ? '/login' : '/login';
    router.push(redirectUrl);
    
    // Clear user state after a short delay to allow navigation to start
    setTimeout(() => {
      setUser(null);
      setIsLoggingOut(false);
    }, 100);
  }, [router, pathname]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isSuperAdmin: !!user?.isSuperAdmin,
    tenantId: user?.tenantId || null,
    isLoading,
    isLoggingOut,
    login,
    logout,
    refreshUser
  }), [user, isLoading, isLoggingOut, login, logout, refreshUser]);

  // Show minimal loading only for initial load
  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
