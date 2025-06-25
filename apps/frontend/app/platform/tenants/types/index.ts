import { 
  PaginationMeta, 
  PaginatedResponse, 
  SortParams, 
  QueryParams, 
  UseServerDataReturn, 
  ServerDataTableProps,
  StatusFilter,
  AccessLevelFilter,
  ModuleFilters 
} from '@/lib/types';

// Tenant domain model that combines base tenant data with access control
export interface TenantModel {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  // Access control properties
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
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

// Tenant user interface for impersonation
export interface TenantUser {
  id: string;
  email: string;
  name: string;
}

// Tenant-specific filters extending the base filters
export interface TenantFilters extends ModuleFilters<{
  status: StatusFilter;
  accessLevel: AccessLevelFilter;
}> {}

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

// Hook return type using system-wide generic
export type UseFetchTenantsReturn = UseServerDataReturn<TenantModel, TenantFilters, TenantModel>; 