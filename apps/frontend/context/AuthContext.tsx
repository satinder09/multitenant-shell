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
import { LoginDto, login as loginApi, verify2FA as verify2FAApi, ApiError } from '@/shared/services/api';
import { browserApi } from '@/shared/services/api-client';
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
  expiresAt?: string;
  // add other user fields here
}

interface TwoFactorSession {
  sessionId: string;
  availableMethods: string[];
  message: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  // 2FA state
  twoFactorRequired: boolean;
  twoFactorSession: TwoFactorSession | null;
  login: (dto: LoginDto, redirectTo?: string) => Promise<void>;
  verify2FA: (code: string, type?: 'totp' | 'backup') => Promise<void>;
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
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorSession, setTwoFactorSession] = useState<TwoFactorSession | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async (forceRefresh = false) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
      console.log('🔍 AuthContext.refreshUser called, forceRefresh:', forceRefresh);
    }
    
    // Try cache first unless force refresh
    if (!forceRefresh) {
      const cachedUser = AuthCache.get();
      if (cachedUser) {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
          console.log('🔍 Using cached user:', cachedUser);
        }
        setUser(cachedUser);
        return cachedUser;
      }
    }

    try {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log('🔍 Fetching user profile from /api/auth/me');
      }
      
      const response = await browserApi.get<UserProfile>('/api/auth/me', undefined, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log('🔍 /api/auth/me response success:', response.success);
      }
      
      if (response.success) {
        const profile = response.data;
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
          console.log('🔍 User profile received:', profile);
        }
        setUser(profile);
        AuthCache.set(profile);
        return profile;
      } else {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
          console.log('🔍 /api/auth/me failed, clearing user state');
        }
        setUser(null);
        AuthCache.clear();
        return null;
      }
    } catch (error) {
      // Don't log 401 errors as errors - they're expected when not authenticated
      const is401Error = (error as any)?.status === 401 || 
                          (error instanceof Error && error.message.includes('401')) ||
                          (error instanceof Error && error.message.includes('Not authenticated'));
      
      if (is401Error) {
        // Only log 401s in debug mode
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
          console.log('🔍 User not authenticated (401) - this is expected when checking auth status');
        }
      } else {
        console.error('Failed to fetch user profile:', error);
      }
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
      
      // Skip auth check on public pages to avoid unnecessary 401 errors
      const isPublicPage = typeof window !== 'undefined' && (
        window.location.pathname === '/login' || 
        window.location.pathname === '/signup' ||
        window.location.pathname === '/forgot-password' ||
        window.location.pathname === '/reset-password'
      );
      
      if (!isPublicPage) {
        // Check current auth state (use cache if available)
        await refreshUser(false);
      } else {
        // On public pages, check cache only (no API call)
        const cachedUser = AuthCache.get();
        if (cachedUser) {
          setUser(cachedUser);
        }
      }
      
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
    setTwoFactorRequired(false);
    setTwoFactorSession(null);
    
    try {
      if (process.env.DEBUG_AUTH) {
        console.log('Calling loginApi...');
      }
      const loginResponse = await loginApi(dto);
      
      if (process.env.DEBUG_AUTH) {
        console.log('Login response:', loginResponse);
      }
      
      // Check if 2FA is required
      if (loginResponse.requiresTwoFactor && loginResponse.twoFactorSessionId) {
        // Set 2FA state
        setTwoFactorRequired(true);
        setTwoFactorSession({
          sessionId: loginResponse.twoFactorSessionId,
          availableMethods: loginResponse.availableMethods || [],
          message: loginResponse.message || 'Two-factor authentication required'
        });
        setPendingRedirect(redirectTo || null);
        
        if (process.env.DEBUG_AUTH) {
          console.log('2FA required, showing verification UI');
        }
      } else if (loginResponse.accessToken) {
        // Traditional login success - refresh user profile
        if (process.env.DEBUG_AUTH) {
          console.log('Login successful, refreshing user...');
        }
        const profile = await refreshUser(true); // Force refresh after login
        
        if (profile) {
          // Smart redirect logic - ONLY redirect on successful login
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            // Smart redirect based on user type and domain
            const hostname = window.location.hostname;
            const smartRedirectPath = getSmartRedirectPath(hostname, profile.isSuperAdmin || false);
            router.push(smartRedirectPath);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser, router]);

  const verify2FA = useCallback(async (code: string, type?: 'totp' | 'backup') => {
    if (!twoFactorSession) {
      throw new Error('No active 2FA session');
    }
    
    if (process.env.DEBUG_AUTH) {
      console.log('AuthContext.verify2FA called with code and type:', type);
    }
    
    setIsLoading(true);
    
    try {
      const verifyResponse = await verify2FAApi({
        sessionId: twoFactorSession.sessionId,
        code,
        type
      });
      
      if (process.env.DEBUG_AUTH) {
        console.log('2FA verification successful:', verifyResponse);
      }
      
      // Clear 2FA state
      setTwoFactorRequired(false);
      setTwoFactorSession(null);
      
      // Refresh user profile
      const profile = await refreshUser(true);
      
      if (profile) {
        // Use pending redirect or smart redirect
        const redirectTo = pendingRedirect;
        setPendingRedirect(null);
        
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          // Smart redirect based on user type and domain
          const hostname = window.location.hostname;
          const smartRedirectPath = getSmartRedirectPath(hostname, profile.isSuperAdmin || false);
          router.push(smartRedirectPath);
        }
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [twoFactorSession, refreshUser, router, pendingRedirect]);

  const logout = useCallback(async () => {
    if (process.env.DEBUG_AUTH) {
      console.log('AuthContext.logout called');
    }
    setIsLoggingOut(true);
    
    // Clear 2FA state
    setTwoFactorRequired(false);
    setTwoFactorSession(null);
    setPendingRedirect(null);
    
    try {
      await browserApi.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      AuthCache.clear();
      setIsLoggingOut(false);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isSuperAdmin: user?.isSuperAdmin || false,
    tenantId: user?.tenantId || null,
    isLoading,
    isLoggingOut,
    twoFactorRequired,
    twoFactorSession,
    login,
    verify2FA,
    logout,
    refreshUser
  }), [user, isLoading, isLoggingOut, twoFactorRequired, twoFactorSession, login, verify2FA, logout, refreshUser]);

  // Show minimal loading only for initial load
  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
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
