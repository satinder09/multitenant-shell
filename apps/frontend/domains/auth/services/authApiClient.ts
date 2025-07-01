// Enhanced Auth API Client with enterprise-grade features
import { BaseApiClient } from '@/shared/services/api/base-client';
import { CsrfService, securityFetch } from './csrfService';
import { 
  LoginCredentials, 
  LoginResponse, 
  AuthUser,
  UpdateUserProfileRequest 
} from '../types/auth.types';
import { 
  LoginData, 
  LoginFormData,
  ChangePasswordData,
  RequestPasswordResetData,
  ResetPasswordData,
  validateData,
  validateDataSafe,
  loginSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  sanitizeEmail,
  sanitizeString
} from '@/shared/utils/validation';

// Enhanced API error with retry information
export interface AuthApiError extends Error {
  statusCode: number;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

// Enhanced response types
export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request configuration
export interface AuthRequestConfig {
  timeout?: number;
  retries?: number;
  validateInput?: boolean;
  skipCSRF?: boolean;
}

export class AuthApiClient {
  private readonly baseUrl = '/api/auth';
  private readonly csrfService = CsrfService.getInstance();
  private readonly defaultTimeout = 10000;
  private readonly defaultRetries = 3;

  constructor() {
    // Initialize CSRF protection
    this.csrfService.clearToken();
  }

  // ============================================================================
  // CORE REQUEST METHOD WITH ENTERPRISE FEATURES
  // ============================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & AuthRequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      skipCSRF = false,
      validateInput = true,
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !skipCSRF;
    
    if (needsCSRF) {
      try {
        const csrfToken = await this.csrfService.getToken();
        headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.warn('[AuthApiClient] Failed to get CSRF token:', error);
      }
    }

    const requestOptions: RequestInit = {
      ...fetchOptions,
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
    };

    // Retry logic with exponential backoff
    let lastError: AuthApiError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle different response types
        await this.handleResponseErrors(response, attempt, retries);
        
        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          return data;
        } else {
          return {} as T; // For endpoints that return no content
        }

      } catch (error) {
        clearTimeout(timeoutId);
        
        // Create enhanced error
        lastError = this.createAuthError(error, attempt < retries);
        
        // Don't retry on certain errors
        if (!lastError.retryable || attempt === retries) {
          break;
        }

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Reset abort controller for retry
        const newController = new AbortController();
        const newTimeoutId = setTimeout(() => newController.abort(), timeout);
        requestOptions.signal = newController.signal;
        clearTimeout(timeoutId);
      }
    }

    throw lastError!;
  }

  private async handleResponseErrors(response: Response, attempt: number, maxRetries: number): Promise<void> {
    if (!response.ok) {
      let errorMessage = 'Request failed';
      let errorCode = 'UNKNOWN_ERROR';

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code || errorCode;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      // Handle specific error cases
      if (response.status === 401) {
        // Unauthorized - redirect to login unless it's a login request
        if (!response.url.includes('/login')) {
          setTimeout(() => {
        window.location.href = '/login';
          }, 100);
        }
        throw this.createAuthError(new Error(errorMessage), false, response.status, 'UNAUTHORIZED');
      }

      if (response.status === 403) {
        // Forbidden - possibly CSRF token issue
        if (errorMessage.includes('CSRF') && attempt < maxRetries) {
          // Clear CSRF cache and let retry logic handle it
          this.csrfService.clearToken();
          throw this.createAuthError(new Error(errorMessage), true, response.status, 'CSRF_ERROR');
        }
        throw this.createAuthError(new Error(errorMessage), false, response.status, 'FORBIDDEN');
      }

      if (response.status === 429) {
        // Rate limited
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        throw this.createAuthError(
          new Error(errorMessage), 
          attempt < maxRetries, 
          response.status, 
          'RATE_LIMITED',
          retryAfter * 1000
        );
      }

      if (response.status >= 500) {
        // Server error - retryable
        throw this.createAuthError(new Error(errorMessage), true, response.status, 'SERVER_ERROR');
      }

      // Client error - not retryable
      throw this.createAuthError(new Error(errorMessage), false, response.status, 'CLIENT_ERROR');
    }
  }

  private createAuthError(
    error: Error | any, 
    retryable: boolean, 
    statusCode = 0, 
    code = 'NETWORK_ERROR',
    retryAfter?: number
  ): AuthApiError {
    const authError = new Error(error.message || 'Request failed') as AuthApiError;
    authError.name = 'AuthApiError';
    authError.statusCode = statusCode;
    authError.code = code;
    authError.retryable = retryable;
    authError.retryAfter = retryAfter;
    return authError;
  }

  // ============================================================================
  // AUTHENTICATION METHODS WITH VALIDATION
  // ============================================================================

  async login(credentials: LoginCredentials | LoginFormData, config?: AuthRequestConfig): Promise<LoginResponse> {
    // Validate and sanitize input
    const validationResult = validateDataSafe(loginSchema, credentials);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    const sanitizedData = {
      email: sanitizeEmail(validationResult.data.email),
      password: validationResult.data.password, // Don't sanitize passwords
      ...(validationResult.data.rememberMe !== undefined && { rememberMe: validationResult.data.rememberMe }),
    };

    return this.makeRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
      ...config,
    });
  }

  async logout(config?: AuthRequestConfig): Promise<void> {
    return this.makeRequest<void>('/logout', {
      method: 'POST',
      ...config,
    });
  }

  async getCurrentUser(config?: AuthRequestConfig): Promise<AuthUser | null> {
    try {
      return await this.makeRequest<AuthUser>('/me', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        ...config,
      });
    } catch (error) {
      // Return null for 401/403 errors (user not authenticated)
      if (error instanceof Error && (error as AuthApiError).statusCode === 401) {
        return null;
      }
      throw error;
    }
  }

  async refreshToken(config?: AuthRequestConfig): Promise<LoginResponse> {
    return this.makeRequest<LoginResponse>('/refresh', {
      method: 'POST',
      ...config,
    });
  }

  // ============================================================================
  // PROFILE MANAGEMENT WITH VALIDATION
  // ============================================================================

  async updateProfile(data: UpdateUserProfileRequest, config?: AuthRequestConfig): Promise<AuthUser> {
    // Sanitize input data
    const sanitizedData = {
      ...(data.name && { name: sanitizeString(data.name) }),
      ...(data.email && { email: sanitizeEmail(data.email) }),
    };

    return this.makeRequest<AuthUser>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(sanitizedData),
      ...config,
    });
  }

  async changePassword(data: ChangePasswordData, config?: AuthRequestConfig): Promise<void> {
    // Validate input
    const validationResult = validateDataSafe(changePasswordSchema, data);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return this.makeRequest<void>('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: validationResult.data.currentPassword,
        newPassword: validationResult.data.newPassword,
      }),
      ...config,
    });
  }

  // ============================================================================
  // PASSWORD RESET WITH VALIDATION
  // ============================================================================

  async requestPasswordReset(data: RequestPasswordResetData, config?: AuthRequestConfig): Promise<void> {
    const validationResult = validateDataSafe(requestPasswordResetSchema, data);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return this.makeRequest<void>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: sanitizeEmail(validationResult.data.email) }),
      ...config,
    });
  }

  async resetPassword(data: ResetPasswordData, config?: AuthRequestConfig): Promise<void> {
    const validationResult = validateDataSafe(resetPasswordSchema, data);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return this.makeRequest<void>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: validationResult.data.token,
        password: validationResult.data.password,
      }),
      ...config,
    });
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async getSessions(config?: AuthRequestConfig): Promise<any[]> {
    return this.makeRequest<any[]>('/sessions', {
      method: 'GET',
      ...config,
    });
  }

  async revokeSession(sessionId: string, config?: AuthRequestConfig): Promise<void> {
    return this.makeRequest<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      ...config,
    });
  }

  async revokeAllSessions(config?: AuthRequestConfig): Promise<void> {
    return this.makeRequest<void>('/sessions/revoke-all', {
      method: 'POST',
      ...config,
    });
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR BACKWARD COMPATIBILITY
  // ============================================================================

  // Simple login that matches current usage patterns
  async loginSimple(email: string, password: string, rememberMe?: boolean): Promise<LoginResponse> {
    return this.login({ email, password, rememberMe });
  }

  // Check auth status (returns boolean)
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  // Get CSRF token for manual requests
  async getCsrfToken(): Promise<string> {
    return this.csrfService.getToken();
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient(); 

// Export legacy authService for backward compatibility
export const authService = authApiClient; 