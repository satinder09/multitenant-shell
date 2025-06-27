// Platform domain API client with typed methods
import { BaseApiClient } from '@/lib/api/base-client';
import { PaginatedResponse, QueryOptions } from '@/lib/api/types';
import { 
  PlatformStats,
  PlatformActivity,
  SystemHealth,
  PlatformSettings
} from '../types/platform.types';
import {
  PlatformTenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantAccessRequest,
  TenantImpersonationSession
} from '../types/tenant.types';
import {
  PlatformUser,
  CreatePlatformUserRequest,
  UpdatePlatformUserRequest,
  PlatformUserInvitation,
  UserTenantAccess
} from '../types/user.types';

export class PlatformApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: '/api/platform',
    });

    // Add platform-specific interceptors
    this.addRequestInterceptor((config) => {
      // Add admin authorization header if needed
      config.headers = {
        ...config.headers,
        'X-Admin-Request': 'true',
      };
      return config;
    });

    this.addErrorInterceptor(async (error) => {
      // Handle platform-specific errors
      if (error.statusCode === 403) {
        console.error('Platform access denied:', error.message);
        // Could redirect to access denied page
      }
      throw error;
    });
  }

  // Platform statistics
  async getStats(): Promise<PlatformStats> {
    return this.get<PlatformStats>('/stats');
  }

  async getActivity(options?: QueryOptions): Promise<PaginatedResponse<PlatformActivity>> {
    return this.get<PaginatedResponse<PlatformActivity>>('/activity', options);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.get<SystemHealth>('/health');
  }

  // Platform settings
  async getSettings(): Promise<PlatformSettings> {
    return this.get<PlatformSettings>('/settings');
  }

  async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return this.patch<PlatformSettings>('/settings', settings);
  }

  // Tenant management
  async getTenants(options?: QueryOptions): Promise<PaginatedResponse<PlatformTenant>> {
    return this.get<PaginatedResponse<PlatformTenant>>('/tenants', options);
  }

  async getTenant(id: string): Promise<PlatformTenant> {
    return this.get<PlatformTenant>(`/tenants/${id}`);
  }

  async createTenant(data: CreateTenantRequest): Promise<PlatformTenant> {
    return this.post<PlatformTenant>('/tenants', data);
  }

  async updateTenant(id: string, data: UpdateTenantRequest): Promise<PlatformTenant> {
    return this.patch<PlatformTenant>(`/tenants/${id}`, data);
  }

  async deleteTenant(id: string): Promise<void> {
    return this.delete<void>(`/tenants/${id}`);
  }

  async activateTenant(id: string): Promise<PlatformTenant> {
    return this.post<PlatformTenant>(`/tenants/${id}/activate`);
  }

  async deactivateTenant(id: string): Promise<PlatformTenant> {
    return this.post<PlatformTenant>(`/tenants/${id}/deactivate`);
  }

  // Tenant access and impersonation
  async requestTenantAccess(request: TenantAccessRequest): Promise<void> {
    return this.post<void>('/tenant-access/request', request);
  }

  async startImpersonation(tenantId: string, userId: string, reason: string): Promise<TenantImpersonationSession> {
    return this.post<TenantImpersonationSession>('/impersonation/start', {
      tenantId,
      userId,
      reason,
    });
  }

  async endImpersonation(sessionId: string): Promise<void> {
    return this.post<void>(`/impersonation/${sessionId}/end`);
  }

  async getImpersonationSessions(): Promise<TenantImpersonationSession[]> {
    return this.get<TenantImpersonationSession[]>('/impersonation/sessions');
  }

  // User management
  async getUsers(options?: QueryOptions): Promise<PaginatedResponse<PlatformUser>> {
    return this.get<PaginatedResponse<PlatformUser>>('/users', options);
  }

  async getUser(id: string): Promise<PlatformUser> {
    return this.get<PlatformUser>(`/users/${id}`);
  }

  async createUser(data: CreatePlatformUserRequest): Promise<PlatformUser> {
    return this.post<PlatformUser>('/users', data);
  }

  async updateUser(id: string, data: UpdatePlatformUserRequest): Promise<PlatformUser> {
    return this.patch<PlatformUser>(`/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`);
  }

  async getUserTenantAccess(userId: string): Promise<UserTenantAccess[]> {
    return this.get<UserTenantAccess[]>(`/users/${userId}/tenant-access`);
  }

  async grantUserTenantAccess(userId: string, tenantId: string, role: string): Promise<void> {
    return this.post<void>(`/users/${userId}/tenant-access`, {
      tenantId,
      role,
    });
  }

  async revokeUserTenantAccess(userId: string, tenantId: string): Promise<void> {
    return this.delete<void>(`/users/${userId}/tenant-access/${tenantId}`);
  }

  // User invitations
  async getInvitations(): Promise<PlatformUserInvitation[]> {
    return this.get<PlatformUserInvitation[]>('/invitations');
  }

  async sendInvitation(email: string, role: string): Promise<PlatformUserInvitation> {
    return this.post<PlatformUserInvitation>('/invitations', {
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
}

// Export singleton instance
export const platformApiClient = new PlatformApiClient(); 