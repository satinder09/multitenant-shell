// Platform domain API hooks
import { useApiQuery } from '@/lib/api/hooks/useApiQuery';
import { platformApiClient } from '../services/platformApiClient';
import { PaginatedResponse, QueryOptions } from '@/lib/api/types';
import { 
  PlatformStats,
  PlatformActivity,
  SystemHealth
} from '../types/platform.types';

export function usePlatformStats() {
  return useApiQuery<PlatformStats>(
    ['platform', 'stats'],
    () => platformApiClient.getStats(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );
}

export function usePlatformActivity(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<PlatformActivity>>(
    ['platform', 'activity', JSON.stringify(options)],
    () => platformApiClient.getActivity(options)
  );
}

export function useSystemHealth() {
  return useApiQuery<SystemHealth>(
    ['platform', 'health'],
    () => platformApiClient.getSystemHealth(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );
}

export function usePlatformTenants(options?: QueryOptions) {
  return useApiQuery(
    ['platform', 'tenants', JSON.stringify(options)],
    () => platformApiClient.getTenants(options)
  );
}

export function usePlatformUsers(options?: QueryOptions) {
  return useApiQuery(
    ['platform', 'users', JSON.stringify(options)],
    () => platformApiClient.getUsers(options)
  );
}

// Mutation hooks for platform operations
export function usePlatformMutations() {
  const createTenant = async (data: any) => {
    return platformApiClient.createTenant(data);
  };

  const updateTenant = async (id: string, data: any) => {
    return platformApiClient.updateTenant(id, data);
  };

  const deleteTenant = async (id: string) => {
    return platformApiClient.deleteTenant(id);
  };

  const activateTenant = async (id: string) => {
    return platformApiClient.activateTenant(id);
  };

  const deactivateTenant = async (id: string) => {
    return platformApiClient.deactivateTenant(id);
  };

  const createUser = async (data: any) => {
    return platformApiClient.createUser(data);
  };

  const updateUser = async (id: string, data: any) => {
    return platformApiClient.updateUser(id, data);
  };

  const deleteUser = async (id: string) => {
    return platformApiClient.deleteUser(id);
  };

  const startImpersonation = async (tenantId: string, userId: string, reason: string) => {
    return platformApiClient.startImpersonation(tenantId, userId, reason);
  };

  const endImpersonation = async (sessionId: string) => {
    return platformApiClient.endImpersonation(sessionId);
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