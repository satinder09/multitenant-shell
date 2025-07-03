import type { 
  ApiResponse, 
  ApiError, 
  RequestConfig, 
  ResponseConfig,
  HttpMethod,
  RecordValue,
  JsonData 
} from '../types/common';

// Enhanced fetch with timeout and better error handling (internal utility)
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = 10000
): Promise<Response> {
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
      throw new ApiClientError('Request timeout', 408);
    }
    throw error;
  }
}

// Custom API error class
export class ApiClientError extends Error implements ApiError {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Request interceptor type
export type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;

// Response interceptor type
export type ResponseInterceptor = <T>(response: ResponseConfig<T>) => Promise<ResponseConfig<T>> | ResponseConfig<T>;

// Error interceptor type
export type ErrorInterceptor = (error: ApiClientError) => Promise<never> | never;

// API Client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  credentials?: 'include' | 'same-origin' | 'omit';
}

// Main API Client class
export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // Build full URL
  private buildURL(endpoint: string, params?: Record<string, RecordValue>): string {
    const url = new URL(endpoint, this.config.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    
    return finalConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors<T>(response: ResponseConfig<T>): Promise<ResponseConfig<T>> {
    let finalResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }
    
    return finalResponse;
  }

  // Apply error interceptors
  private async applyErrorInterceptors(error: ApiClientError): Promise<never> {
    let currentError = error;
    
    for (const interceptor of this.errorInterceptors) {
      try {
        await interceptor(currentError);
      } catch (handledError) {
        if (handledError instanceof ApiClientError) {
          currentError = handledError;
        }
      }
    }
    
    throw currentError;
  }

  // Main request method
  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    try {
      // Apply request interceptors
      const finalConfig = await this.applyRequestInterceptors(config);
      
      // Build URL with params
      const url = this.buildURL(finalConfig.url, finalConfig.params);
      
      // Prepare fetch options
      const options: RequestInit = {
        method: finalConfig.method,
        headers: {
          ...this.config.headers,
          ...finalConfig.headers,
        },
        credentials: this.config.credentials,
      };

      // Add body for non-GET requests
      if (finalConfig.data && finalConfig.method !== 'GET') {
        if (finalConfig.data instanceof FormData) {
          options.body = finalConfig.data;
          // Remove content-type header for FormData (browser will set it with boundary)
          delete (options.headers as Record<string, string>)['Content-Type'];
        } else {
          options.body = JSON.stringify(finalConfig.data);
        }
      }

      // Make the request
      const response = await fetchWithTimeout(
        url, 
        options, 
        finalConfig.timeout || this.config.timeout
      );

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json() as T;
      } else {
        data = await response.text() as unknown as T;
      }

      // Create response config
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      const responseConfig: ResponseConfig<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
      };

      // Handle non-2xx responses
      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data && 'message' in data 
          ? (data as any).message 
          : `Request failed with status ${response.status}`;
          
        const apiError = new ApiClientError(
          errorMessage,
          response.status,
          typeof data === 'object' && data && 'code' in data ? (data as any).code : undefined,
          typeof data === 'object' ? { ...(data as Record<string, any>), url } : { url }
        );
        
        await this.applyErrorInterceptors(apiError);
        return Promise.reject(apiError); // This line should never be reached due to error interceptors
      }

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(responseConfig);

      // Transform to standard API response format
      if (typeof finalResponse.data === 'object' && finalResponse.data && 'data' in finalResponse.data && 'success' in finalResponse.data) {
        // Response is already in ApiResponse format
        return finalResponse.data as unknown as ApiResponse<T>;
      } else {
        // Wrap raw data in ApiResponse format
        return {
          data: finalResponse.data,
          success: true,
          timestamp: new Date().toISOString(),
        };
      }

    } catch (error) {
      if (error instanceof ApiClientError) {
        await this.applyErrorInterceptors(error);
      } else {
        const apiError = new ApiClientError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
        await this.applyErrorInterceptors(apiError);
      }
      
      // This should never be reached, but satisfies TypeScript
      throw new ApiClientError('Request failed');
    }
  }

  // Convenience methods
  async get<T = unknown>(url: string, params?: Record<string, RecordValue>, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    });
  }

  async post<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data: data as JsonData | FormData,
      ...config,
    });
  }

  async put<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data: data as JsonData | FormData,
      ...config,
    });
  }

  async patch<T = unknown>(url: string, data?: unknown, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(Object.assign({
      method: 'PATCH',
      url,
      data: data as JsonData | FormData,
    }, config));
  }

  async delete<T = unknown>(url: string, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(Object.assign({
      method: 'DELETE',
      url,
    }, config));
  }
}

// Default client instance factory
export function createApiClient(config: ApiClientConfig): ApiClient {
  const client = new ApiClient(config);
  
  // Add default request interceptor for authentication
  client.addRequestInterceptor((config) => {
    // Add any default headers or authentication logic here
    return config;
  });

  // Add default response interceptor for logging
  client.addResponseInterceptor((response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
    }
    return response;
  });

  // Add default error interceptor
  client.addErrorInterceptor((error) => {
    // Don't log 401s for auth status checks - they're expected when not logged in
    const isAuthStatusCheck = error.details && 
      typeof error.details === 'object' && 
      'url' in error.details && 
      typeof error.details.url === 'string' && 
      (error.details.url.includes('/api/auth/me') || error.details.url.includes('/auth/me'));
    
    if (process.env.NODE_ENV === 'development') {
      // Only log 401s if they're not auth status checks
      if (error.status === 401 && isAuthStatusCheck) {
        // Silent - expected behavior when checking auth status while not logged in
      } else {
        console.error(`[API Error] ${error.status || 'Unknown'} - ${error.message}`, error.details);
      }
    }
    
    // Handle common error scenarios
    if (error.status === 401) {
      if (!isAuthStatusCheck) {
        // Only warn for unexpected 401s, not auth status checks
        console.warn('Unauthorized access detected');
      }
    } else if (error.status === 403) {
      console.warn('Forbidden access detected');
    } else if (error.status && error.status >= 500) {
      console.error('Server error detected');
    }
    
    throw error;
  });

  return client;
}

// Singleton instance for convenience
let defaultClient: ApiClient | null = null;

export function getDefaultApiClient(): ApiClient {
  if (!defaultClient) {
    const baseURL = typeof window !== 'undefined' 
      ? window.location.origin 
              : process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:4000';
      
    defaultClient = createApiClient({ baseURL });
  }
  
  return defaultClient;
}

// Reset default client (useful for testing)
export function resetDefaultApiClient(): void {
  defaultClient = null;
}

// Preconfigured API clients for convenience
/**
 * Browser API client for client-side code.
 */
export const browserApi: ApiClient = getDefaultApiClient();

/**
 * Server API client for server-side code (e.g. Next.js routes).
 * You can forward Next.js request headers via a custom request interceptor if needed.
 */
export const serverApi: ApiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'),
  credentials: 'include',
});

// Factory for a server-side ApiClient that forwards Next.js request cookies
import type { NextRequest } from 'next/server';
/**
 * Creates a server-side ApiClient bound to a NextRequest.
 * Automatically forwards cookies for session/CSRF.
 */
export function createServerApiClient(req: NextRequest): ApiClient {
  // Determine backend base URL - use the correct environment variables
  const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  const client = createApiClient({ baseURL, credentials: 'include' });
  client.addRequestInterceptor((config) => {
    const cookie = req.headers.get('cookie') || '';
    // Forward cookie header for session
    config.headers = { ...(config.headers || {}), Cookie: cookie };
    return config;
  });
  // CSRF token fetch for state-changing requests
  client.addRequestInterceptor(async (config) => {
    const method = config.method?.toUpperCase();
    if (method && method !== 'GET') {
      try {
        // Fetch fresh CSRF token
        const tokenRes = await fetch(`${baseURL}/auth/csrf-token`, {
          method: 'GET',
          credentials: 'include',
          headers: { Cookie: req.headers.get('cookie') || '' },
        });
        if (tokenRes.ok) {
          const csrfToken = tokenRes.headers.get('X-CSRF-Token') || tokenRes.headers.get('x-csrf-token');
          if (csrfToken) {
            config.headers = { ...(config.headers || {}), 'X-CSRF-Token': csrfToken };
          }
        }
      } catch {
        // Ignore CSRF fetch errors; backend will reject if invalid token
      }
    }
    return config;
  });
  return client;
} 