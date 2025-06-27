// Auth domain API client with typed methods
import { BaseApiClient } from '@/lib/api/base-client';
import { PaginatedResponse } from '@/lib/api/types';
import { 
  LoginCredentials, 
  LoginResponse, 
  AuthUser,
  UpdateUserProfileRequest 
} from '../types/auth.types';

export class AuthApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: '/api/auth',
    });

    // Add auth-specific interceptors
    this.addRequestInterceptor((config) => {
      // Add CSRF token if available
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': csrfToken,
        };
      }
      return config;
    });

    this.addErrorInterceptor(async (error) => {
      // Handle auth-specific errors
      if (error.statusCode === 401) {
        // Redirect to login on unauthorized
        window.location.href = '/login';
        return;
      }
      
      if (error.statusCode === 403) {
        // Handle forbidden access
        console.warn('Access denied:', error.message);
      }
      
      // Re-throw the error to be handled by the calling code
      throw error;
    });
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.post<LoginResponse>('/login', credentials);
  }

  async logout(): Promise<void> {
    return this.post<void>('/logout');
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.get<AuthUser>('/me');
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.post<LoginResponse>('/refresh');
  }

  // Profile management
  async updateProfile(data: UpdateUserProfileRequest): Promise<AuthUser> {
    return this.patch<AuthUser>('/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.post<void>('/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Password reset
  async requestPasswordReset(email: string): Promise<void> {
    return this.post<void>('/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.post<void>('/reset-password', {
      token,
      newPassword,
    });
  }

  // Email verification
  async requestEmailVerification(): Promise<void> {
    return this.post<void>('/verify-email/request');
  }

  async verifyEmail(token: string): Promise<void> {
    return this.post<void>('/verify-email/confirm', { token });
  }

  // Session management
  async getSessions(): Promise<any[]> {
    return this.get<any[]>('/sessions');
  }

  async revokeSession(sessionId: string): Promise<void> {
    return this.delete<void>(`/sessions/${sessionId}`);
  }

  async revokeAllSessions(): Promise<void> {
    return this.post<void>('/sessions/revoke-all');
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient(); 