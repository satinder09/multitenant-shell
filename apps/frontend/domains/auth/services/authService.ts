// Authentication service
import { LoginCredentials, LoginResponse, AuthUser } from '@/domains/auth/types/auth.types';

class AuthService {
  private baseUrl = '/api/auth';

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Login failed');
    }

    return response.json();
  }

  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      });

      return response.ok ? response.json() : null;
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  }
}

export const authService = new AuthService(); 