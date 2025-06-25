import { 
  PaginationMeta, 
  PaginatedResponse, 
  SortParams, 
  QueryParams, 
  UseServerDataReturn, 
  ServerDataTableProps,
  StatusFilter,
  ModuleFilters 
} from '@/lib/types';

// User domain model for platform users
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: Date;
  tenantCount: number;
}

// Role interface for role management
export interface Role {
  id: string;
  name: string;
  description?: string;
}

// User-specific filters extending the base filters
export interface UserFilters extends ModuleFilters<{
  status: StatusFilter;
  role: string; // Can be 'all' or specific role name
  tenantCount?: 'none' | 'some' | 'many' | 'all'; // Filter by tenant association
}> {}

// Type aliases using system-wide types
export type UserSortParams = SortParams<PlatformUser>;
export type UserQueryParams = QueryParams<UserFilters, PlatformUser>;
export type UserListResponse = PaginatedResponse<PlatformUser>;

// Props interfaces for components
export interface UserListProps extends ServerDataTableProps<PlatformUser, UserFilters> {
  // User-specific actions
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onEdit: (user: PlatformUser) => void;
  onDelete: (user: PlatformUser) => void;
  // Bulk operations
  onBulkActivate?: (userIds: string[]) => void;
  onBulkDeactivate?: (userIds: string[]) => void;
  onBulkDelete?: (userIds: string[]) => void;
  // Role data for display
  roles: Role[];
}

export interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  roles: Role[];
}

export interface EditUserDialogProps {
  user: PlatformUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  roles: Role[];
}

export interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: Partial<UserFilters>) => void;
  onReset: () => void;
  roles: Role[];
}

// Hook return type using system-wide generic
export type UseFetchUsersReturn = UseServerDataReturn<PlatformUser, UserFilters, PlatformUser> & {
  roles: Role[];
  isLoadingRoles: boolean;
  rolesError: string | null;
}; 