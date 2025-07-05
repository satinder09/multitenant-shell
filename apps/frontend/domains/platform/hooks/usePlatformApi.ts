// Platform domain API hooks - now using unified browserApi
import { useApiQuery } from '@/shared/services/api/hooks/useApiQuery';
import { browserApi } from '@/shared/services/api-client';
import { PaginatedResponse, QueryOptions } from '@/shared/services/api/types';
import { 
  PlatformStats,
  PlatformActivity,
  SystemHealth
} from '../types/platform.types';

export function usePlatformStats() {
  return useApiQuery<PlatformStats>(
    ['platform', 'stats'],
    async () => {
      const response = await browserApi.get('/api/platform/stats');
      return response.data as PlatformStats;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );
}

export function usePlatformActivity(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<PlatformActivity>>(
    ['platform', 'activity', JSON.stringify(options)],
    async () => {
      const response = await browserApi.get('/api/platform/activity', options as Record<string, any>);
      return response.data as PaginatedResponse<PlatformActivity>;
    }
  );
}

export function useSystemHealth() {
  return useApiQuery<SystemHealth>(
    ['platform', 'health'],
    async () => {
      const response = await browserApi.get('/api/platform/health');
      return response.data as SystemHealth;
    },
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );
}

export function usePlatformTenants(options?: QueryOptions) {
  return useApiQuery(
    ['platform', 'tenants', JSON.stringify(options)],
    async () => {
      const response = await browserApi.get('/api/platform/tenants', options as Record<string, any>);
      return response.data;
    }
  );
}

export function usePlatformUsers(options?: QueryOptions) {
  return useApiQuery(
    ['platform', 'users', JSON.stringify(options)],
    async () => {
      const response = await browserApi.get('/api/platform/users', options as Record<string, any>);
      return response.data;
    }
  );
}

// Mutation hooks for platform operations - now using unified browserApi
export function usePlatformMutations() {
  const createTenant = async (data: any) => {
    const response = await browserApi.post('/api/platform/tenants', data);
    return response.data;
  };

  const updateTenant = async (id: string, data: any) => {
    const response = await browserApi.patch(`/api/platform/tenants/${id}`, data);
    return response.data;
  };

  const deleteTenant = async (id: string) => {
    const response = await browserApi.delete(`/api/platform/tenants/${id}`);
    return response.data;
  };

  const activateTenant = async (id: string) => {
    const response = await browserApi.post(`/api/platform/tenants/${id}/activate`);
    return response.data;
  };

  const deactivateTenant = async (id: string) => {
    const response = await browserApi.post(`/api/platform/tenants/${id}/deactivate`);
    return response.data;
  };

  const createUser = async (data: any) => {
    const response = await browserApi.post('/api/platform/users', data);
    return response.data;
  };

  const updateUser = async (id: string, data: any) => {
    const response = await browserApi.patch(`/api/platform/users/${id}`, data);
    return response.data;
  };

  const deleteUser = async (id: string) => {
    const response = await browserApi.delete(`/api/platform/users/${id}`);
    return response.data;
  };

  const startImpersonation = async (tenantId: string, userId: string, reason: string) => {
    const response = await browserApi.post('/api/platform/impersonation', { tenantId, userId, reason });
    return response.data;
  };

  const endImpersonation = async (sessionId: string) => {
    const response = await browserApi.delete(`/api/platform/impersonation/${sessionId}`);
    return response.data;
  };

  return {
    createTenant,
    updateTenant,
    deleteTenant,
    activateTenant,
    deactivateTenant,
    createUser,
    updateUser,
    deleteUser,
    startImpersonation,
    endImpersonation,
  };
} 