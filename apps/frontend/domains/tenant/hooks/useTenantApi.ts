// Tenant domain API hooks - now using unified browserApi
import { useApiQuery } from '@/shared/services/api/hooks/useApiQuery';
import { browserApi } from '@/shared/services/api-client';
import { PaginatedResponse, QueryOptions } from '@/shared/services/api/types';
import { 
  Tenant,
  TenantUser,
  TenantDashboardData,
  TenantActivity
} from '../types/tenant.types';

export function useCurrentTenant() {
  return useApiQuery<Tenant>(
    ['tenant', 'current'],
    async () => {
      const response = await browserApi.get('/api/tenant/info');
      return response.data as Tenant;
    }
  );
}

export function useTenantDashboard() {
  return useApiQuery<TenantDashboardData>(
    ['tenant', 'dashboard'],
    async () => {
      const response = await browserApi.get('/api/tenant/dashboard');
      return response.data as TenantDashboardData;
    },
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );
}

export function useTenantActivity(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<TenantActivity>>(
    ['tenant', 'activity', JSON.stringify(options)],
    async () => {
      const response = await browserApi.get('/api/tenant/activity', options as Record<string, any>);
      return response.data as PaginatedResponse<TenantActivity>;
    }
  );
}

export function useTenantUsers(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<TenantUser>>(
    ['tenant', 'users', JSON.stringify(options)],
    async () => {
      const response = await browserApi.get('/api/tenant/users', options as Record<string, any>);
      return response.data as PaginatedResponse<TenantUser>;
    }
  );
}

export function useTenantUser(id: string) {
  return useApiQuery<TenantUser>(
    ['tenant', 'user', id],
    async () => {
      const response = await browserApi.get(`/api/tenant/users/${id}`);
      return response.data as TenantUser;
    },
    {
      enabled: !!id,
    }
  );
}

export function useTenantRoles() {
  return useApiQuery(
    ['tenant', 'roles'],
    async () => {
      const response = await browserApi.get('/api/tenant/roles');
      return response.data;
    }
  );
}

export function useTenantSettings() {
  return useApiQuery(
    ['tenant', 'settings'],
    async () => {
      const response = await browserApi.get('/api/tenant/settings');
      return response.data;
    }
  );
}

// Mutation hooks for tenant operations - now using unified browserApi
export function useTenantMutations() {
  const updateTenant = async (data: any) => {
    const response = await browserApi.patch('/api/tenant/info', data);
    return response.data;
  };

  const createUser = async (data: any) => {
    const response = await browserApi.post('/api/tenant/users', data);
    return response.data;
  };

  const updateUser = async (id: string, data: any) => {
    const response = await browserApi.patch(`/api/tenant/users/${id}`, data);
    return response.data;
  };

  const deleteUser = async (id: string) => {
    const response = await browserApi.delete(`/api/tenant/users/${id}`);
    return response.data;
  };

  const activateUser = async (id: string) => {
    const response = await browserApi.post(`/api/tenant/users/${id}/activate`);
    return response.data;
  };

  const deactivateUser = async (id: string) => {
    const response = await browserApi.post(`/api/tenant/users/${id}/deactivate`);
    return response.data;
  };

  const sendInvitation = async (email: string, role: string) => {
    const response = await browserApi.post('/api/tenant/invitations', { email, role });
    return response.data;
  };

  const revokeInvitation = async (id: string) => {
    const response = await browserApi.delete(`/api/tenant/invitations/${id}`);
    return response.data;
  };

  const createRole = async (data: any) => {
    const response = await browserApi.post('/api/tenant/roles', data);
    return response.data;
  };

  const updateRole = async (id: string, data: any) => {
    const response = await browserApi.patch(`/api/tenant/roles/${id}`, data);
    return response.data;
  };

  const deleteRole = async (id: string) => {
    const response = await browserApi.delete(`/api/tenant/roles/${id}`);
    return response.data;
  };

  const updateSettings = async (settings: any) => {
    const response = await browserApi.patch('/api/tenant/settings', settings);
    return response.data;
  };

  return {
    updateTenant,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    sendInvitation,
    revokeInvitation,
    createRole,
    updateRole,
    deleteRole,
    updateSettings,
  };
} 