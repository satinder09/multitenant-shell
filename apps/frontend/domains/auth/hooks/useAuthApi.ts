// Auth domain API hooks
import { useApiQuery } from '@/shared/services/api/hooks/useApiQuery';
import { authApiClient } from '@/domains/auth/services/authApiClient';
import { AuthUser } from '@/domains/auth/types/auth.types';

export function useCurrentUser() {
  return useApiQuery<AuthUser>(
    ['auth', 'current-user'],
    () => authApiClient.getCurrentUser(),
    {
      retry: 1,
      refetchOnWindowFocus: true,
    }
  );
}

export function useSessions() {
  return useApiQuery<any[]>(
    ['auth', 'sessions'],
    () => authApiClient.getSessions()
  );
}

// Mutation hooks for auth operations
export function useAuthMutations() {
  const login = async (credentials: any) => {
    return authApiClient.login(credentials);
  };

  const logout = async () => {
    return authApiClient.logout();
  };

  const updateProfile = async (data: any) => {
    return authApiClient.updateProfile(data);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return authApiClient.changePassword(currentPassword, newPassword);
  };

  const requestPasswordReset = async (email: string) => {
    return authApiClient.requestPasswordReset(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return authApiClient.resetPassword(token, newPassword);
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