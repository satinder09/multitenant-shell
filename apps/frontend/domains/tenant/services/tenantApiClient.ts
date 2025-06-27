// Tenant domain API client with typed methods
import { BaseApiClient } from '@/lib/api/base-client';
import { PaginatedResponse, QueryOptions } from '@/lib/api/types';
import { 
  Tenant,
  TenantUser,
  TenantDashboardData,
  TenantActivity,
  TenantSettings
} from '../types/tenant.types';
import {
  CreateTenantUserRequest,
  UpdateTenantUserRequest,
  TenantUserInvitation,
  TenantRole
} from '../types/user.types';

export class TenantApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: '/api/tenant',
    });

    // Add tenant-specific interceptors
    this.addRequestInterceptor((config) => {
      // Add tenant context header
      const tenantId = this.getCurrentTenantId();
      if (tenantId) {
        config.headers = {
          ...config.headers,
          'X-Tenant-ID': tenantId,
        };
      }
      return config;
    });

    this.addErrorInterceptor(async (error) => {
      // Handle tenant-specific errors
      if (error.statusCode === 404 && error.code === 'TENANT_NOT_FOUND') {
        console.error('Tenant not found');
        // Could redirect to tenant selection
      }
      throw error;
    });
  }

  private getCurrentTenantId(): string | null {
    // This would typically come from context or URL
    // For now, return null as placeholder
    return null;
  }

  // Tenant information
  async getCurrentTenant(): Promise<Tenant> {
    return this.get<Tenant>('/info');
  }

  async updateTenant(data: Partial<TenantSettings>): Promise<Tenant> {
    return this.patch<Tenant>('/info', data);
  }

  // Dashboard data
  async getDashboardData(): Promise<TenantDashboardData> {
    return this.get<TenantDashboardData>('/dashboard');
  }

  async getActivity(options?: QueryOptions): Promise<PaginatedResponse<TenantActivity>> {
    return this.get<PaginatedResponse<TenantActivity>>('/activity', options);
  }

  // User management
  async getUsers(options?: QueryOptions): Promise<PaginatedResponse<TenantUser>> {
    return this.get<PaginatedResponse<TenantUser>>('/users', options);
  }

  async getUser(id: string): Promise<TenantUser> {
    return this.get<TenantUser>(`/users/${id}`);
  }

  async createUser(data: CreateTenantUserRequest): Promise<TenantUser> {
    return this.post<TenantUser>('/users', data);
  }

  async updateUser(id: string, data: UpdateTenantUserRequest): Promise<TenantUser> {
    return this.patch<TenantUser>(`/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`);
  }

  async activateUser(id: string): Promise<TenantUser> {
    return this.post<TenantUser>(`/users/${id}/activate`);
  }

  async deactivateUser(id: string): Promise<TenantUser> {
    return this.post<TenantUser>(`/users/${id}/deactivate`);
  }

  // User invitations
  async getInvitations(): Promise<TenantUserInvitation[]> {
    return this.get<TenantUserInvitation[]>('/invitations');
  }

  async sendInvitation(email: string, role: string): Promise<TenantUserInvitation> {
    return this.post<TenantUserInvitation>('/invitations', {
      email,
      role,
    });
  }

  async revokeInvitation(id: string): Promise<void> {
    return this.delete<void>(`/invitations/${id}`);
  }

  async resendInvitation(id: string): Promise<void> {
    return this.post<void>(`/invitations/${id}/resend`);
  }

  // Roles and permissions
  async getRoles(): Promise<TenantRole[]> {
    return this.get<TenantRole[]>('/roles');
  }

  async getRole(id: string): Promise<TenantRole> {
    return this.get<TenantRole>(`/roles/${id}`);
  }

  async createRole(data: Omit<TenantRole, 'id' | 'isSystem'>): Promise<TenantRole> {
    return this.post<TenantRole>('/roles', data);
  }

  async updateRole(id: string, data: Partial<TenantRole>): Promise<TenantRole> {
    return this.patch<TenantRole>(`/roles/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    return this.delete<void>(`/roles/${id}`);
  }

  // Settings
  async getSettings(): Promise<TenantSettings> {
    return this.get<TenantSettings>('/settings');
  }

  async updateSettings(settings: Partial<TenantSettings>): Promise<TenantSettings> {
    return this.patch<TenantSettings>('/settings', settings);
  }
}

// Export singleton instance
export const tenantApiClient = new TenantApiClient(); 