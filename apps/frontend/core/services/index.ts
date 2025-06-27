// Frontend Core Services
// Enhanced API client and data management services

import { ApiClient } from '../../../../libs/core';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  User, 
  Tenant,
  LoginCredentials,
  AuthResponse
} from '../../../../libs/core';

// Enhanced API client with frontend-specific features
export class FrontendApiClient extends ApiClient {
  constructor(baseURL: string = '/') {
    super({ baseURL });
    
    // Add frontend-specific interceptors
    this.addRequestInterceptor(this.addAuthHeader.bind(this));
    this.addRequestInterceptor(this.addCSRFHeader.bind(this));
    this.addResponseInterceptor(this.handleAuthResponse.bind(this));
    this.addErrorInterceptor(this.handleAuthError.bind(this));
  }

  private addAuthHeader(config: any): any {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    return config;
  }

  private addCSRFHeader(config: any): any {
    // Add CSRF protection header
    config.headers = {
      ...config.headers,
      'X-Requested-With': 'XMLHttpRequest'
    };
    return config;
  }

  private handleAuthResponse(response: any): any {
    // Handle token refresh if needed
    const newToken = response.headers?.['x-new-token'];
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    }
    return response;
  }

  private handleAuthError(error: any): any {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }

  // Frontend-specific convenience methods
  async uploadFile(file: File, endpoint: string, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Note: Progress tracking would need to be implemented at a lower level
    // For now, we'll just make the request without progress tracking
    return this.request({
      method: 'POST',
      url: endpoint,
      data: formData,
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
      }
    });
  }

  async downloadFile(url: string, filename?: string): Promise<void> {
    // For file downloads, we'll use a simple approach
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Auth service
export class AuthService {
  private apiClient: FrontendApiClient;

  constructor(apiClient: FrontendApiClient) {
    this.apiClient = apiClient;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/api/auth/login', credentials);
    
    if (response.data.accessToken) {
      localStorage.setItem('auth_token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('impersonation_data');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.apiClient.get<ApiResponse<User>>('/api/auth/me');
      return response.data.data;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/api/auth/refresh');
      
      if (response.data.accessToken) {
        localStorage.setItem('auth_token', response.data.accessToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }
}

// Platform service
export class PlatformService {
  private apiClient: FrontendApiClient;

  constructor(apiClient: FrontendApiClient) {
    this.apiClient = apiClient;
  }

  async getTenants(params?: any): Promise<PaginatedResponse<Tenant>> {
    const response = await this.apiClient.get<PaginatedResponse<Tenant>>('/api/tenants', { params });
    return response.data;
  }

  async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    const response = await this.apiClient.post<ApiResponse<Tenant>>('/api/tenants', data);
    return response.data.data;
  }

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const response = await this.apiClient.put<ApiResponse<Tenant>>(`/api/tenants/${id}`, data);
    return response.data.data;
  }

  async deleteTenant(id: string): Promise<void> {
    await this.apiClient.delete(`/api/tenants/${id}`);
  }

  async impersonateTenant(tenantId: string): Promise<any> {
    const response = await this.apiClient.post<any>('/api/tenant-access/impersonate', { tenantId });
    
    if (response.data.impersonationToken) {
      localStorage.setItem('impersonation_data', JSON.stringify({
        tenantId,
        token: response.data.impersonationToken,
        originalUser: this.getStoredUser()
      }));
    }
    
    return response.data;
  }

  async endImpersonation(): Promise<void> {
    try {
      await this.apiClient.post('/api/tenant-access/impersonate/end');
    } catch (error) {
      console.error('End impersonation error:', error);
    } finally {
      localStorage.removeItem('impersonation_data');
    }
  }

  getImpersonationData(): any {
    try {
      const data = localStorage.getItem('impersonation_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error parsing impersonation data:', error);
      return null;
    }
  }

  isImpersonating(): boolean {
    return !!this.getImpersonationData();
  }

  private getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }
}

// Data service for generic CRUD operations
export class DataService<T = any> {
  private apiClient: FrontendApiClient;
  private baseEndpoint: string;

  constructor(apiClient: FrontendApiClient, baseEndpoint: string) {
    this.apiClient = apiClient;
    this.baseEndpoint = baseEndpoint;
  }

  async getAll(params?: any): Promise<PaginatedResponse<T>> {
    const response = await this.apiClient.get<PaginatedResponse<T>>(this.baseEndpoint, { params });
    return response.data;
  }

  async getById(id: string): Promise<T> {
    const response = await this.apiClient.get<ApiResponse<T>>(`${this.baseEndpoint}/${id}`);
    return response.data.data;
  }

  async create(data: Partial<T>): Promise<T> {
    const response = await this.apiClient.post<ApiResponse<T>>(this.baseEndpoint, data);
    return response.data.data;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const response = await this.apiClient.put<ApiResponse<T>>(`${this.baseEndpoint}/${id}`, data);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`${this.baseEndpoint}/${id}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.apiClient.post(`${this.baseEndpoint}/bulk-delete`, { ids });
  }

  async search(query: string, params?: any): Promise<PaginatedResponse<T>> {
    const response = await this.apiClient.get<PaginatedResponse<T>>(`${this.baseEndpoint}/search`, {
      params: { q: query, ...params }
    });
    return response.data;
  }
}

// Cache service for client-side caching
export class CacheService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Create singleton instances
export const apiClient = new FrontendApiClient();
export const authService = new AuthService(apiClient);
export const platformService = new PlatformService(apiClient);
export const cacheService = new CacheService();

// Factory function for creating data services
export function createDataService<T>(endpoint: string): DataService<T> {
  return new DataService<T>(apiClient, endpoint);
} 