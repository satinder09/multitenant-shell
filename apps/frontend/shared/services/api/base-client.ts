// Base API client with standardized error handling and interceptors
import { ApiResponse, ApiError, ApiRequestConfig, ApiClientConfig, ApiErrorResponse } from './types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.details = error.details;
  }
}

export class BaseApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: Array<(config: ApiRequestConfig) => ApiRequestConfig> = [];
  private responseInterceptors: Array<(response: any) => any> = [];
  private errorInterceptors: Array<(error: ApiClientError) => Promise<any> | any> = [];

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: '',
      timeout: 30000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  // Interceptor management
  addRequestInterceptor(interceptor: (config: ApiRequestConfig) => ApiRequestConfig) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: any) => any) {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: (error: ApiClientError) => Promise<any> | any) {
    this.errorInterceptors.push(interceptor);
  }

  // Main request method
  async request<T = any>(url: string, config: ApiRequestConfig = {}): Promise<T> {
    // Apply request interceptors
    let requestConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      requestConfig = interceptor(requestConfig);
    }

    const fullUrl = this.buildUrl(url, requestConfig.params);
    const fetchConfig = this.buildFetchConfig(requestConfig);

    try {
      const response = await this.fetchWithRetry(fullUrl, fetchConfig, requestConfig.retries || this.config.retries);
      
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      let data = await this.parseResponse(response);

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        data = interceptor(data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Apply error interceptors
        for (const interceptor of this.errorInterceptors) {
          const result = await interceptor(error);
          if (result !== undefined) {
            return result;
          }
        }
        throw error;
      }
      
      // Handle network errors
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        statusCode: 0,
        details: { originalError: error },
      });
    }
  }

  // HTTP method helpers
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(url, { method: 'GET', params });
  }

  async post<T = any>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, { method: 'POST', body });
  }

  async put<T = any>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, { method: 'PUT', body });
  }

  async patch<T = any>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, { method: 'PATCH', body });
  }

  async delete<T = any>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  // Private helper methods
  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    
    if (!params) return fullUrl;

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, String(value));
    });
    
    return urlObj.toString();
  }

  private buildFetchConfig(config: ApiRequestConfig): RequestInit {
    const headers = {
      ...this.config.headers,
      ...config.headers,
    };

    const fetchConfig: RequestInit = {
      method: config.method || 'GET',
      headers,
      credentials: 'include',
    };

    if (config.body && config.method !== 'GET') {
      fetchConfig.body = typeof config.body === 'string' 
        ? config.body 
        : JSON.stringify(config.body);
    }

    return fetchConfig;
  }

  private async fetchWithRetry(url: string, config: RequestInit, retries: number): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort (timeout) or last attempt
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiClientError({
            code: 'TIMEOUT',
            message: 'Request timeout',
            statusCode: 408,
          });
        }

        if (i === retries) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError!;
  }

  private async handleHttpError(response: Response): Promise<never> {
    let errorData: ApiErrorResponse;
    
    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError({
        code: 'HTTP_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      });
    }

    throw new ApiClientError({
      code: errorData.error.code,
      message: errorData.error.message,
      statusCode: errorData.error.statusCode,
      details: errorData.error.details,
    });
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text();
    }
    
    return response.blob();
  }
} 