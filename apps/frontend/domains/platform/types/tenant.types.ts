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
} from '@/shared/types/types';

// Tenant domain model that combines base tenant data with access control
export interface TenantModel extends GenericEntity {
  name: string;
  subdomain: string;
  description?: string;
  isActive: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  
  // Computed fields
  userCount: number;
  canAccess: boolean;
  canImpersonate: boolean;
  lastAccessed?: Date;
  
  // Relations
  permissions: TenantPermission[];
  createdBy?: User;
  createdById?: string;
}

// Base tenant interface for API responses
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

// Access information interface
export interface TenantAccessInfo {
  tenantId: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: string;
}

// Tenant access option interface (for modals)
export interface TenantAccessOption {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

// Tenant permission interface
export interface TenantPermission {
  id: string;
  userId: string;
  tenantId: string;
  canImpersonate: boolean;
  lastAccessed?: Date;
  user: User;
}

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Tenant user interface for impersonation
export interface TenantUser {
  id: string;
  email: string;
  name: string;
}

// Tenant-specific filters extending the base filters
export interface TenantFilters extends AdvancedBaseFilters {
  status?: StatusFilter;
  accessLevel?: AccessLevelFilter;
  userCount?: number;
  createdById?: string;
}

// Type aliases using system-wide types
export type TenantSortParams = SortParams<TenantModel>;
export type TenantQueryParams = QueryParams<TenantFilters, TenantModel>;
export type TenantListResponse = PaginatedResponse<TenantModel>;

// Props interfaces for components
export interface TenantListProps extends ServerDataTableProps<TenantModel, TenantFilters> {
  // Tenant-specific actions
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onImpersonate: (tenant: TenantModel) => void;
  onSecureLogin: (tenant: TenantModel) => void;
  // Bulk operations
  onBulkActivate?: (tenantIds: string[]) => void;
  onBulkDeactivate?: (tenantIds: string[]) => void;
}

export interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated: () => void;
}

export interface SecureLoginModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ImpersonationModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface TenantFiltersProps {
  filters: TenantFilters;
  onFiltersChange: (filters: Partial<TenantFilters>) => void;
  onReset: () => void;
}

// API-specific types for platform API client
export interface PlatformTenant extends TenantModel {
  // Platform-specific fields
  settings?: Record<string, any>;
  billingInfo?: {
    plan: string;
    usage: number;
    limit: number;
  };
}

export interface CreateTenantRequest {
  name: string;
  subdomain?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateTenantRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  settings?: Record<string, any>;
}

export interface TenantAccessRequest {
  tenantId: string;
  userId: string;
  accessLevel: 'read' | 'write' | 'admin';
  reason?: string;
}

export interface TenantImpersonationSession {
  id: string;
  tenantId: string;
  userId: string;
  impersonatorId: string;
  reason: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
}

// Hook return type using system-wide generic
export type UseFetchTenantsReturn = UseGenericFilterReturn<TenantModel, TenantFilters>; 