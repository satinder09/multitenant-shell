// System-wide reusable types for data management

// Generic pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Generic filtering and sorting
export interface SortParams<T = any> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

export interface BaseFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Generic query parameters that combine pagination, filtering, and sorting
export interface QueryParams<TFilters extends BaseFilters = BaseFilters, TSort = any> {
  page: number;
  limit: number;
  filters?: TFilters;
  sort?: SortParams<TSort>;
}

// Hook return type for data fetching with server-side pagination
export interface UseServerDataReturn<T, TFilters extends BaseFilters = BaseFilters, TSort = any> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  queryParams: QueryParams<TFilters, TSort>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  setSort: (sort: SortParams<TSort>) => void;
  refetch: () => void;
  resetFilters: () => void;
}

// Enhanced data table props that support server-side pagination
export interface ServerDataTableProps<T, TFilters extends BaseFilters = BaseFilters> {
  data: T[];
  isLoading: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSortChange?: (sort: SortParams<T>) => void;
  // Filter components
  filters?: TFilters;
  onFiltersChange?: (filters: Partial<TFilters>) => void;
  onResetFilters?: () => void;
  // Actions
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  // Customization
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowExport?: boolean;
  onExport?: () => void;
}

// Status options for common filtering
export type StatusFilter = 'all' | 'active' | 'inactive';

// Common date range filters
export interface DateRangeFilters {
  dateFrom?: string;
  dateTo?: string;
}

// Access level filters (for multi-tenant systems)
export type AccessLevelFilter = 'all' | 'read' | 'write' | 'admin';

// Utility type for creating module-specific filters
export type ModuleFilters<T extends Record<string, any> = {}> = BaseFilters & T; 