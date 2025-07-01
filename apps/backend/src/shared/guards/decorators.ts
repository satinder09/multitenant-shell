import { SetMetadata } from '@nestjs/common';
import {
  SKIP_AUTH_KEY,
} from './jwt-auth.guard';
import {
  REQUIRE_ROLES_KEY,
  REQUIRE_PERMISSIONS_KEY,
  REQUIRE_SUPER_ADMIN_KEY,
  RoleConfig,
  PermissionConfig,
} from './authorization.guard';
import { REQUIRE_TENANT_CONTEXT } from './tenant-validation.guard';

// Authentication decorators
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);

// Authorization decorators
export const RequireSuperAdmin = () => SetMetadata(REQUIRE_SUPER_ADMIN_KEY, true);

// Role decorators
export const RequireRoles = (...roles: string[]) => 
  SetMetadata(REQUIRE_ROLES_KEY, roles);

export const RequireAllRoles = (...roles: string[]) => 
  SetMetadata(REQUIRE_ROLES_KEY, { roles, requireAll: true } as RoleConfig);

export const RequireAnyRole = (...roles: string[]) => 
  SetMetadata(REQUIRE_ROLES_KEY, { roles, requireAll: false } as RoleConfig);

// Permission decorators
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata(REQUIRE_PERMISSIONS_KEY, { permissions, requireAll: true } as PermissionConfig);

export const RequireAllPermissions = (...permissions: string[]) => 
  SetMetadata(REQUIRE_PERMISSIONS_KEY, { permissions, requireAll: true } as PermissionConfig);

export const RequireAnyPermission = (...permissions: string[]) => 
  SetMetadata(REQUIRE_PERMISSIONS_KEY, { permissions, requireAll: false } as PermissionConfig);

// Tenant decorators
export const RequireTenantContext = () => SetMetadata(REQUIRE_TENANT_CONTEXT, true);

// Common role combinations
export const RequireAdmin = () => RequireAnyRole('admin', 'super_admin');
export const RequireUser = () => RequireAnyRole('user', 'admin', 'super_admin');
export const RequireModerator = () => RequireAnyRole('moderator', 'admin', 'super_admin');

// Common permission combinations
export const RequireReadAccess = () => RequireAnyPermission('read', 'read_write', 'admin');
export const RequireWriteAccess = () => RequireAnyPermission('write', 'read_write', 'admin');
export const RequireAdminAccess = () => RequireAnyPermission('admin', 'super_admin'); 