import { TenantModel, Tenant, TenantAccessInfo, TenantAccessOption } from '@/domains/platform/types/tenant.types';
import { browserApi } from '@/shared/services/api-client';

// Utility function to get access level color
export const getAccessLevelColor = (level: string): string => {
  switch (level) {
    case 'admin':
      return 'border-red-200 text-red-700 bg-red-50';
    case 'write':
      return 'border-blue-200 text-blue-700 bg-blue-50';
    case 'read':
      return 'border-green-200 text-green-700 bg-green-50';
    default:
      return 'border-gray-200 text-gray-700 bg-gray-50';
  }
};

// Utility function to merge tenant data with access info
export const mergeTenantWithAccessInfo = (
  tenant: Tenant,
  accessInfo?: TenantAccessInfo
): TenantModel => {
  return {
    ...tenant,
    canAccess: accessInfo?.canAccess || false,
    canImpersonate: accessInfo?.canImpersonate || false,
    accessLevel: accessInfo?.accessLevel || 'read',
    lastAccessed: accessInfo?.lastAccessed ? new Date(accessInfo.lastAccessed) : undefined,
    userCount: 0, // Default value, should be provided by API
    permissions: [], // Default empty array, should be provided by API
  };
};

// Utility function to convert TenantModel to TenantAccessOption for modals
export const tenantToAccessOption = (tenant: TenantModel): TenantAccessOption => {
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    subdomain: tenant.subdomain,
    canAccess: tenant.canAccess,
    canImpersonate: tenant.canImpersonate,
    accessLevel: tenant.accessLevel,
    lastAccessed: tenant.lastAccessed,
  };
};

// Server actions
export async function createTenantAction(formData: FormData) {
  const name = formData.get('name') as string;
  
  const res = await browserApi.post('/api/tenants', { name });

  if (!res.success) {
    throw new Error(res.error || 'Failed to create tenant');
  }
}

export async function updateTenantStatusAction(id: string, isActive: boolean) {
  const res = await browserApi.patch(`/api/tenants/${id}`, { isActive });

  if (!res.success) {
    throw new Error(res.error || 'Failed to update tenant');
  }
  return res.data;
} 