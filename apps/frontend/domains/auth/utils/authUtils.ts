// Authentication utility functions
import { AuthUser } from '../types/auth.types';

export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return 'Guest';
  return user.name || user.email || 'User';
}

export function getUserInitials(user: AuthUser | null): string {
  if (!user) return 'G';
  
  const name = user.name || user.email || 'User';
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user) return false;
  return user.roles?.includes(role) || (user.isSuperAdmin && role === 'admin');
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions?.includes(permission) || user.isSuperAdmin;
}

export function hasAnyRole(user: AuthUser | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.some(role => hasRole(user, role));
}

export function hasAllRoles(user: AuthUser | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.every(role => hasRole(user, role));
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some(permission => hasPermission(user, permission));
}

export function hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.every(permission => hasPermission(user, permission));
}

export function isImpersonating(user: AuthUser | null): boolean {
  // This would depend on your impersonation implementation
  // For now, return false as a placeholder
  return false;
}

export function canAccessTenant(user: AuthUser | null, tenantId: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.tenants?.some(tenant => tenant.id === tenantId) || false;
} 