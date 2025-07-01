// Server-side API client with automatic CSRF protection
import { NextRequest } from 'next/server';

interface ServerApiOptions extends RequestInit {
  skipCSRF?: boolean;
  timeout?: number;
}

class ServerApiClient {
  private baseUrl: string;
  private csrfTokenCache: { token: string | null; expiry: number } = { token: null, expiry: 0 };

  constructor(baseUrl?: string) {
    // Force correct backend URL for development
    const defaultBackendUrl = 'http://lvh.me:4000';
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerApiClient] Using backend URL:', this.baseUrl);
    }
  }

  private async getCSRFToken(cookieHeader?: string, originalRequest?: NextRequest): Promise<string | null> {
    // Check cache first
    if (this.csrfTokenCache.token && Date.now() < this.csrfTokenCache.expiry) {
      return this.csrfTokenCache.token;
    }

    try {
      // Build headers that match the original request
      const headers: Record<string, string> = {
        'Cookie': cookieHeader || '',
        'Content-Type': 'application/json',
      };

      // Forward the same headers as the main request for consistent session ID
      if (originalRequest) {
        const headersToForward = ['x-forwarded-host', 'x-forwarded-for', 'user-agent'];
        headersToForward.forEach(headerName => {
          const headerValue = originalRequest.headers.get(headerName);
          if (headerValue) {
            headers[headerName] = headerValue;
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/auth/csrf-token`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Failed to fetch CSRF token:', response.status);
        return null;
      }

      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        // Cache token for 25 minutes (5 minutes before it expires)
        this.csrfTokenCache = {
          token: csrfToken,
          expiry: Date.now() + (25 * 60 * 1000)
        };
      }

      return csrfToken;
    } catch (error) {
      console.warn('Error fetching CSRF token:', error);
      return null;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async request(
    endpoint: string, 
    options: ServerApiOptions = {}, 
    request?: NextRequest
  ): Promise<Response> {
    const { skipCSRF = false, timeout = 10000, ...fetchOptions } = options;
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Get cookie header from request
    const cookieHeader = request?.headers.get('cookie') || (fetchOptions.headers as Record<string, string>)?.['cookie'];
    
    // Initialize headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    // Add CSRF token for state-changing requests
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !skipCSRF;
    
    if (needsCSRF) {
      const csrfToken = await this.getCSRFToken(cookieHeader, request);
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // Forward important headers from the original request
    if (request) {
      const headersToForward = ['x-forwarded-host', 'x-forwarded-for', 'user-agent'];
      headersToForward.forEach(headerName => {
        const headerValue = request.headers.get(headerName);
        if (headerValue) {
          headers[headerName] = headerValue;
        }
      });
    }

    const finalOptions: RequestInit = {
      ...fetchOptions,
      method,
      headers,
      credentials: 'include',
    };

    try {
      const response = await this.fetchWithTimeout(url, finalOptions, timeout);

      // If we get a 403 (CSRF failure), try to refresh token and retry once
      if (response.status === 403 && needsCSRF) {
        console.warn('CSRF token may be invalid, refreshing...');
        
        // Clear cache and get fresh token
        this.csrfTokenCache = { token: null, expiry: 0 };
        const freshToken = await this.getCSRFToken(cookieHeader, request);
        
        if (freshToken) {
          headers['X-CSRF-Token'] = freshToken;
          const retryOptions = { ...finalOptions, headers };
          return this.fetchWithTimeout(url, retryOptions, timeout);
        }
      }

      return response;
    } catch (error) {
      console.error('Server API request error:', error);
      throw error;
    }
  }

  // Convenience methods
  async get(endpoint: string, options: ServerApiOptions = {}, request?: NextRequest): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'GET' }, request);
  }

  async post(endpoint: string, data?: any, options: ServerApiOptions = {}, request?: NextRequest): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, request);
  }

  async put(endpoint: string, data?: any, options: ServerApiOptions = {}, request?: NextRequest): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, request);
  }

  async patch(endpoint: string, data?: any, options: ServerApiOptions = {}, request?: NextRequest): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, request);
  }

  async delete(endpoint: string, options: ServerApiOptions = {}, request?: NextRequest): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'DELETE' }, request);
  }
}

// Singleton instance
const serverApiClient = new ServerApiClient();

// Export convenience functions
/**
 * @deprecated Use createServerApiClient(req).get(endpoint) or serverApi.get(endpoint) instead
 */
export async function serverGet(endpoint: string, options?: ServerApiOptions, request?: NextRequest): Promise<Response> {
  return serverApiClient.get(endpoint, options, request);
}

/**
 * @deprecated Use createServerApiClient(req).post(endpoint, data, options) or serverApi.post(endpoint, data, options) instead
 */
export async function serverPost(endpoint: string, data?: any, options?: ServerApiOptions, request?: NextRequest): Promise<Response> {
  return serverApiClient.post(endpoint, data, options, request);
}

/**
 * @deprecated Use createServerApiClient(req).put(endpoint, data, options) or serverApi.put(endpoint, data, options) instead
 */
export async function serverPut(endpoint: string, data?: any, options?: ServerApiOptions, request?: NextRequest): Promise<Response> {
  return serverApiClient.put(endpoint, data, options, request);
}

/**
 * @deprecated Use createServerApiClient(req).patch(endpoint, data, options) or serverApi.patch(endpoint, data, options) instead
 */
export async function serverPatch(endpoint: string, data?: any, options?: ServerApiOptions, request?: NextRequest): Promise<Response> {
  return serverApiClient.patch(endpoint, data, options, request);
}

/**
 * @deprecated Use createServerApiClient(req).delete(endpoint, options) or serverApi.delete(endpoint, options) instead
 */
export async function serverDelete(endpoint: string, options?: ServerApiOptions, request?: NextRequest): Promise<Response> {
  return serverApiClient.delete(endpoint, options, request);
}

export { ServerApiClient };
export default serverApiClient; 