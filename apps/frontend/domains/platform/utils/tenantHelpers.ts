import { PlatformTenantModel, PlatformTenant, PlatformTenantAccessInfo, PlatformTenantAccessOption } from '@/shared/types/platform.types';
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
  tenant: PlatformTenant,
  accessInfo?: PlatformTenantAccessInfo
): PlatformTenantModel => {
  return {
    ...tenant,
    canAccess: accessInfo?.canAccess || false,
    canImpersonate: accessInfo?.canImpersonate || false,
    accessLevel: accessInfo?.accessLevel || 'read',
    lastAccessed: accessInfo?.lastAccessed ? new Date(accessInfo.lastAccessed) : undefined,
    userCount: tenant.userCount || 0, // Use provided value or default
    permissions: [], // Default empty array, should be provided by API
    // Convert string dates to Date objects
    lastActivityAt: tenant.lastActivityAt ? new Date(tenant.lastActivityAt) : undefined,
    // Handle string to PlatformUser mapping - set createdById from createdBy string
    createdById: tenant.createdBy || undefined,
    createdBy: undefined, // This should be populated by the API when needed
  };
};

// Utility function to convert PlatformTenantModel to PlatformTenantAccessOption for modals
export const tenantToAccessOption = (tenant: PlatformTenantModel): PlatformTenantAccessOption => {
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