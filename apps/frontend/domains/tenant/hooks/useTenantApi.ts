// Tenant domain API hooks
import { useApiQuery } from '@/shared/services/api/hooks/useApiQuery';
import { tenantApiClient } from '../services/tenantApiClient';
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
    () => tenantApiClient.getCurrentTenant()
  );
}

export function useTenantDashboard() {
  return useApiQuery<TenantDashboardData>(
    ['tenant', 'dashboard'],
    () => tenantApiClient.getDashboardData(),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );
}

export function useTenantActivity(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<TenantActivity>>(
    ['tenant', 'activity', JSON.stringify(options)],
    () => tenantApiClient.getActivity(options)
  );
}

export function useTenantUsers(options?: QueryOptions) {
  return useApiQuery<PaginatedResponse<TenantUser>>(
    ['tenant', 'users', JSON.stringify(options)],
    () => tenantApiClient.getUsers(options)
  );
}

export function useTenantUser(id: string) {
  return useApiQuery<TenantUser>(
    ['tenant', 'user', id],
    () => tenantApiClient.getUser(id),
    {
      enabled: !!id,
    }
  );
}

export function useTenantRoles() {
  return useApiQuery(
    ['tenant', 'roles'],
    () => tenantApiClient.getRoles()
  );
}

export function useTenantSettings() {
  return useApiQuery(
    ['tenant', 'settings'],
    () => tenantApiClient.getSettings()
  );
}

// Mutation hooks for tenant operations
export function useTenantMutations() {
  const updateTenant = async (data: any) => {
    return tenantApiClient.updateTenant(data);
  };

  const createUser = async (data: any) => {
    return tenantApiClient.createUser(data);
  };

  const updateUser = async (id: string, data: any) => {
    return tenantApiClient.updateUser(id, data);
  };

  const deleteUser = async (id: string) => {
    return tenantApiClient.deleteUser(id);
  };

  const activateUser = async (id: string) => {
    return tenantApiClient.activateUser(id);
  };

  const deactivateUser = async (id: string) => {
    return tenantApiClient.deactivateUser(id);
  };

  const sendInvitation = async (email: string, role: string) => {
    return tenantApiClient.sendInvitation(email, role);
  };

  const revokeInvitation = async (id: string) => {
    return tenantApiClient.revokeInvitation(id);
  };

  const createRole = async (data: any) => {
    return tenantApiClient.createRole(data);
  };

  const updateRole = async (id: string, data: any) => {
    return tenantApiClient.updateRole(id, data);
  };

  const deleteRole = async (id: string) => {
    return tenantApiClient.deleteRole(id);
  };

  const updateSettings = async (settings: any) => {
    return tenantApiClient.updateSettings(settings);
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