// Auth domain API hooks - now using unified browserApi
import { useApiQuery } from '@/shared/services/api/hooks/useApiQuery';
import { browserApi } from '@/shared/services/api-client';
import { AuthUser } from '@/domains/auth/types/auth.types';

export function useCurrentUser() {
  return useApiQuery<AuthUser | null>(
    ['auth', 'current-user'],
    async () => {
      const response = await browserApi.get('/api/auth/me');
      return response.data as AuthUser | null;
    },
    {
      retry: 1,
      refetchOnWindowFocus: true,
    }
  );
}

export function useSessions() {
  return useApiQuery<any[]>(
    ['auth', 'sessions'],
    async () => {
      const response = await browserApi.get('/api/auth/sessions');
      return response.data as any[];
    }
  );
}

// Mutation hooks for auth operations - now using unified browserApi
export function useAuthMutations() {
  const login = async (credentials: any) => {
    const response = await browserApi.post('/api/auth/login', credentials);
    return response.data;
  };

  const logout = async () => {
    const response = await browserApi.post('/api/auth/logout');
    return response.data;
  };

  const updateProfile = async (data: any) => {
    const response = await browserApi.patch('/api/auth/profile', data);
    return response.data;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await browserApi.post('/api/auth/change-password', { 
      currentPassword, 
      newPassword, 
      confirmPassword: newPassword 
    });
    return response.data;
  };

  const requestPasswordReset = async (email: string) => {
    const response = await browserApi.post('/api/auth/request-password-reset', { email });
    return response.data;
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const response = await browserApi.post('/api/auth/reset-password', { 
      token, 
      password: newPassword, 
      confirmPassword: newPassword 
    });
    return response.data;
  };

  return {
    login,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
  };
} 