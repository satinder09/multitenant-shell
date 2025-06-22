// apps/frontend/context/AuthContext.tsx

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { LoginDto, login as loginApi, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isSuperAdmin?: boolean;
  tenantId?: string;
  // add other user fields here
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFetchingInitialUser, setIsFetchingInitialUser] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    } finally {
      setIsFetchingInitialUser(false);
    }
  };

  // Fetch current profile on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (dto: LoginDto) => {
    await loginApi(dto);
    await refreshUser();
  };

  const logout = async () => {
    setIsFetchingInitialUser(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user,
      isSuperAdmin: !!user?.isSuperAdmin,
      tenantId: user?.tenantId || null,
      login, 
      logout,
      refreshUser 
    }}>
      {isFetchingInitialUser ? <div className="min-h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div> : children}
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
