/**
 * 🏗️ UNIFIED PLATFORM TYPES
 * 
 * This file contains all platform-related types for managing tenant metadata,
 * platform users, and platform operations. It consolidates and replaces
 * duplicate type definitions across multiple files.
 * 
 * Focus: Platform management capabilities only (tenant-agnostic)
 */

import { 
  PaginationMeta, 
  PaginatedResponse, 
  SortParams, 
  QueryParams, 
  UseServerDataReturn, 
  ServerDataTableProps,
  StatusFilter,
  AccessLevelFilter,
  ModuleFilters,
  GenericEntity,
  ComplexFilter,
  DynamicFieldDiscovery,
  AdvancedBaseFilters,
  UseGenericFilterReturn
} from './types';

// =============================================================================
// CORE PLATFORM TYPES
// =============================================================================

/**
 * Platform statistics for dashboard overview
 */
export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdated: string;
}

/**
 * Platform activity logging for audit trails
 */
export interface PlatformActivity {
  id: string;
  type: 'tenant_created' | 'tenant_activated' | 'tenant_deactivated' | 'user_created' | 'system_event';
  description: string;
  entityId: string;
  entityType: 'tenant' | 'user' | 'system';
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Platform-wide configuration settings
 */
export interface PlatformSettings {
  allowTenantRegistration: boolean;
  requireEmailVerification: boolean;
  defaultTenantFeatures: string[];
  maxTenantsPerUser: number;
  systemMaintenance: boolean;
  maintenanceMessage?: string;
}

/**
 * System health monitoring interface
 */
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  services: ServiceHealth[];
  lastCheck: string;
}

/**
 * Individual service health status
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime?: number;
  lastCheck: string;
  message?: string;
}

// =============================================================================
// TENANT METADATA MANAGEMENT (Platform Perspective)
// =============================================================================

/**
 * Base tenant metadata interface - platform's view of tenant organizations
 * Note: This only contains metadata that the platform manages, not tenant internal data
 */
export interface PlatformTenant {
  id: string;
  name: string;
  subdomain: string;
  url?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Platform management fields
  planType?: string;
  features?: string[];
  metadata?: Record<string, any>;
  
  // Platform statistics (computed fields)
  userCount?: number;
  lastActivityAt?: string;
  
  // Platform relationships
  createdBy?: string;
  assignedSupport?: string[];
}

/**
 * Extended tenant model for platform operations with access control
 */
export interface PlatformTenantModel extends GenericEntity {
  name: string;
  subdomain: string;
  url?: string;
  description?: string;
  isActive: boolean;
  planType?: string;
  features?: string[];
  metadata?: Record<string, any>;
  
  // Platform computed fields
  userCount: number;
  lastActivityAt?: Date;
  
  // Platform access control
  accessLevel: 'read' | 'write' | 'admin';
  canAccess: boolean;
  canImpersonate: boolean;
  lastAccessed?: Date;
  
  // Platform relationships
  permissions: PlatformTenantPermission[];
  createdBy?: PlatformUser;
  createdById?: string;
}

/**
 * Tenant access information for platform operations
 */
export interface PlatformTenantAccessInfo {
  tenantId: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: string;
}

/**
 * Tenant access options for platform modals and operations
 */
export interface PlatformTenantAccessOption {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  url?: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

/**
 * Platform user permissions for tenant management
 */
export interface PlatformTenantPermission {
  id: string;
  userId: string;
  tenantId: string;
  canImpersonate: boolean;
  lastAccessed?: Date;
  user: PlatformUser;
}

// =============================================================================
// PLATFORM USER MANAGEMENT
// =============================================================================

/**
 * Platform user interface - users who manage the platform
 */
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support' | 'billing' | 'viewer';
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: Date;
  
  // Platform user relationships
  tenantCount: number;
  tenantPermissions?: PlatformTenantPermission[];
}

/**
 * Platform role interface for RBAC
 */
export interface PlatformRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

/**
 * Platform user invitation for new staff
 */
export interface PlatformUserInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  isExpired: boolean;
}

/**
 * Platform user's access to specific tenants
 */
export interface PlatformUserTenantAccess {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  grantedAt: string;
  grantedBy: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

// =============================================================================
// PLATFORM OPERATIONS & SESSIONS
// =============================================================================

/**
 * Tenant access request for platform users
 */
export interface PlatformTenantAccessRequest {
  tenantId: string;
  reason: string;
  duration: number; // in minutes
  accessType: 'secure_login' | 'impersonation';
}

/**
 * Tenant impersonation session for support operations
 */
export interface PlatformTenantImpersonationSession {
  id: string;
  tenantId: string;
  tenantUserId: string;
  platformUserId: string;
  reason: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Create tenant request from platform
 */
export interface CreatePlatformTenantRequest {
  name: string;
  subdomain: string;
  url?: string;
  description?: string;
  planType?: string;
  features?: string[];
  metadata?: Record<string, any>;
  isActive?: boolean;
}

/**
 * Update tenant request from platform
 */
export interface UpdatePlatformTenantRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  planType?: string;
  features?: string[];
  metadata?: Record<string, any>;
}

/**
 * Create platform user request
 */
export interface CreatePlatformUserRequest {
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support' | 'billing' | 'viewer';
  isActive?: boolean;
}

/**
 * Update platform user request
 */
export interface UpdatePlatformUserRequest {
  name?: string;
  email?: string;
  role?: 'super_admin' | 'admin' | 'support' | 'billing' | 'viewer';
  isActive?: boolean;
}

// =============================================================================
// FILTERING & QUERY TYPES
// =============================================================================

/**
 * Platform tenant filters for searching and filtering
 */
export interface PlatformTenantFilters extends AdvancedBaseFilters {
  status?: StatusFilter;
  accessLevel?: AccessLevelFilter;
  planType?: string;
  userCount?: number;
  createdById?: string;
  hasActivity?: boolean;
}

/**
 * Platform user filters for searching and filtering
 */
export interface PlatformUserFilters extends ModuleFilters<{
  status: StatusFilter;
  role: string;
  tenantCount?: 'none' | 'some' | 'many' | 'all';
}> {}

// =============================================================================
// COMPONENT PROPS & UI TYPES
// =============================================================================

/**
 * Platform tenant list component props
 */
export interface PlatformTenantListProps extends ServerDataTableProps<PlatformTenantModel, PlatformTenantFilters> {
  // Platform tenant actions
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onImpersonate: (tenant: PlatformTenantModel) => void;
  onSecureLogin: (tenant: PlatformTenantModel) => void;
  onEdit: (tenant: PlatformTenantModel) => void;
  onDelete: (tenant: PlatformTenantModel) => void;
  
  // Bulk operations
  onBulkActivate?: (tenantIds: string[]) => void;
  onBulkDeactivate?: (tenantIds: string[]) => void;
}

/**
 * Platform user list component props
 */
export interface PlatformUserListProps extends ServerDataTableProps<PlatformUser, PlatformUserFilters> {
  // Platform user actions
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onEdit: (user: PlatformUser) => void;
  onDelete: (user: PlatformUser) => void;
  
  // Bulk operations
  onBulkActivate?: (userIds: string[]) => void;
  onBulkDeactivate?: (userIds: string[]) => void;
  onBulkDelete?: (userIds: string[]) => void;
  
  // Role data for display
  roles: PlatformRole[];
}

/**
 * Create tenant dialog props
 */
export interface CreatePlatformTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated: () => void;
}

/**
 * Secure login modal props
 */
export interface PlatformSecureLoginModalProps {
  tenant: PlatformTenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Impersonation modal props
 */
export interface PlatformImpersonationModalProps {
  tenant: PlatformTenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// =============================================================================
// TYPE ALIASES & UTILITY TYPES
// =============================================================================

// Sort and query parameter types
export type PlatformTenantSortParams = SortParams<PlatformTenantModel>;
export type PlatformTenantQueryParams = QueryParams<PlatformTenantFilters, PlatformTenantModel>;
export type PlatformTenantListResponse = PaginatedResponse<PlatformTenantModel>;

export type PlatformUserSortParams = SortParams<PlatformUser>;
export type PlatformUserQueryParams = QueryParams<PlatformUserFilters, PlatformUser>;
export type PlatformUserListResponse = PaginatedResponse<PlatformUser>;

// Hook return types
export type UsePlatformTenantsReturn = UseGenericFilterReturn<PlatformTenantModel, PlatformTenantFilters>;
export type UsePlatformUsersReturn = UseServerDataReturn<PlatformUser, PlatformUserFilters, PlatformUser> & {
  roles: PlatformRole[];
  isLoadingRoles: boolean;
  rolesError: string | null;
};

// =============================================================================
// LEGACY TYPE ALIASES (For Migration Compatibility)
// =============================================================================

/**
 * @deprecated Use PlatformTenant instead
 * Legacy alias for backward compatibility during migration
 */
export type Tenant = PlatformTenant;

/**
 * @deprecated Use PlatformTenantModel instead
 * Legacy alias for backward compatibility during migration
 */
export type TenantModel = PlatformTenantModel;

/**
 * @deprecated Use PlatformTenantAccessOption instead
 * Legacy alias for backward compatibility during migration
 */
export type TenantAccessOption = PlatformTenantAccessOption;

/**
 * @deprecated Use CreatePlatformTenantRequest instead
 * Legacy alias for backward compatibility during migration
 */
export type CreateTenantRequest = CreatePlatformTenantRequest;

/**
 * @deprecated Use UpdatePlatformTenantRequest instead
 * Legacy alias for backward compatibility during migration
 */
export type UpdateTenantRequest = UpdatePlatformTenantRequest; 