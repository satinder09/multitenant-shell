import { PlatformUser, Role } from '../types';
import { browserApi } from '@/shared/services/api-client';

// Utility function to normalize role names for matching
export const normalizeRoleName = (roleName: string): string => {
  return roleName.toLowerCase().trim();
};

// Helper: get role ID from user role name
export const getRoleIdByName = (roles: Role[], roleName: string): string => {
  const normalized = normalizeRoleName(roleName);
  return roles.find(r => normalizeRoleName(r.name) === normalized)?.id || '';
};

// Helper: get role name from ID
export const getRoleNameById = (roles: Role[], roleId: string): string => {
  return roles.find(r => r.id === roleId)?.name || '';
};

// Helper function to find the display name for a role
export const getRoleDisplayName = (userRole: string, roles: Role[]): string => {
  const normalizedUserRole = normalizeRoleName(userRole);
  const matchingRole = roles.find(role => 
    normalizeRoleName(role.name) === normalizedUserRole
  );
  return matchingRole?.name || userRole;
};

// Utility function to get role color classes
export const getRoleColor = (role: string): string => {
  const normalizedRole = normalizeRoleName(role);
  switch (normalizedRole) {
    case 'administrator':
    case 'admin':
      return 'border-red-200 text-red-700 bg-red-50';
    case 'manager':
      return 'border-blue-200 text-blue-700 bg-blue-50';
    case 'user':
      return 'border-green-200 text-green-700 bg-green-50';
    case 'viewer':
      return 'border-gray-200 text-gray-700 bg-gray-50';
    default:
      return 'border-purple-200 text-purple-700 bg-purple-50';
  }
};

// Utility function to format tenant count
export const formatTenantCount = (count: number): string => {
  if (count === 0) return 'None';
  if (count === 1) return '1 tenant';
  return `${count} tenants`;
};

// Utility function to get tenant count category
export const getTenantCountCategory = (count: number): 'none' | 'some' | 'many' => {
  if (count === 0) return 'none';
  if (count <= 5) return 'some';
  return 'many';
};

// Server actions
export async function createUserAction(formData: FormData, roles: Role[]): Promise<void> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const password = formData.get('password') as string;
  const role = getRoleNameById(roles, roleId);
  
  const res = await browserApi.post('/api/platform/admin/users', { 
    name, 
    email, 
    role, 
    password: password || undefined 
  });

  if (!res.success) {
    throw new Error(res.error || 'Failed to create user');
  }
}

export async function updateUserAction(id: string, formData: FormData, roles: Role[]): Promise<PlatformUser> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const role = getRoleNameById(roles, roleId);
  
  const res = await browserApi.patch(`/api/platform/admin/users/${id}`, { name, email, role });

  if (!res.success) {
    throw new Error(res.error || 'Failed to update user');
  }
  return res.data as PlatformUser;
}

export async function updateUserStatusAction(id: string, isActive: boolean): Promise<PlatformUser> {
  const res = await browserApi.patch(`/api/platform/admin/users/${id}`, { isActive });

  if (!res.success) {
    throw new Error(res.error || 'Failed to update user status');
  }
  return res.data as PlatformUser;
}

export async function deleteUserAction(id: string): Promise<void> {
  const res = await browserApi.delete(`/api/platform/admin/users/${id}`);

  if (!res.success) {
    throw new Error(res.error || 'Failed to delete user');
  }
}

// Bulk operations
export async function bulkUpdateUserStatusAction(userIds: string[], isActive: boolean): Promise<void> {
  const promises = userIds.map(id => updateUserStatusAction(id, isActive));
  await Promise.all(promises);
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<void> {
  const promises = userIds.map(id => deleteUserAction(id));
  await Promise.all(promises);
} 