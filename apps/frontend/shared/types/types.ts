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

// ============= COMPLEX FILTERING SYSTEM =============

// Generic entity interface
export interface GenericEntity {
  id: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
}

// Filter operators
export type FilterOperator = 
  | 'equals' | 'not_equals' 
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'greater_equal' | 'less_equal'
  | 'between' | 'not_between'
  | 'is_set' | 'is_not_set'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in'
  | 'is_in' | 'is_not_in'
  | 'contains_any' | 'contains_all'
  | 'preset';

// Filter field types
export type FilterType = 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'relation';

// Complex filter rule
export interface ComplexFilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  fieldPath?: string[]; // For nested fields like "permissions.user.name"
  label?: string;
}

// Filter group with logic
export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR'; // Match all/any
  rules: ComplexFilterRule[];
  groups?: FilterGroup[]; // Nested groups
}

// Complete complex filter
export interface ComplexFilter {
  rootGroup: FilterGroup;
}

// Field metadata for dynamic discovery
export interface FilterMetadata {
  id?: string;
  moduleName: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FilterType;
  isFilterable: boolean;
  isGroupable: boolean;
  isSearchable: boolean;
  operators: FilterOperator[];
  relationConfig?: RelationConfig;
  fieldValues?: FieldValue[];
}

// Field value for dropdowns
export interface FieldValue {
  value: any;
  label: string;
  count?: number;
  metadata?: any;
}

// Relation configuration
export interface RelationConfig {
  targetModule: string;
  targetTable: string;
  valueField: string;
  labelField: string;
  searchFields: string[];
  joinType?: 'inner' | 'left' | 'right';
}

// Nested field configuration
export interface NestedFieldConfig {
  path: string[];
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  isMultiSelect?: boolean;
  valueSource?: 'static' | 'dynamic' | 'relation';
  relationConfig?: RelationConfig;
}

// Dynamic field discovery result
export interface DynamicFieldDiscovery {
  fields: FilterMetadata[];
  nestedFields: NestedFieldConfig[];
  relationPaths: RelationPath[];
}

// Relation path for traversal
export interface RelationPath {
  path: string[];
  displayPath: string;
  targetEntity: string;
  joinType: 'inner' | 'left' | 'right';
}

// Module relation definition
export interface ModuleRelation {
  field: string;
  targetModule: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  displayField: string;
  searchFields: string[];
}

// Filterable module configuration
export interface FilterableModule<T extends GenericEntity = GenericEntity> {
  name: string;
  entity: T;
  tableName: string;
  searchableFields: (keyof T)[];
  relations?: ModuleRelation[];
  customFilters?: CustomFilterConfig[];
}

// Custom filter configuration
export interface CustomFilterConfig {
  id: string;
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  valueProvider?: () => Promise<FieldValue[]>;
}

// Enhanced base filters with complex filtering
export interface AdvancedBaseFilters extends BaseFilters {
  customFilters?: ComplexFilterRule[];
  savedSearchId?: string;
  groupBy?: string;
}

// Enhanced query params with complex filtering
export interface AdvancedQueryParams<TFilters extends AdvancedBaseFilters = AdvancedBaseFilters, TSort = any> 
  extends QueryParams<TFilters, TSort> {
  groupBy?: string | null;
  savedSearchId?: string;
  complexFilter?: ComplexFilter | null;
}

// Dynamic query DTO
export interface DynamicQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  filters?: ComplexFilterRule[];
  complexFilter?: ComplexFilter;
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  groupBy?: string;
  savedSearchId?: string;
}

// Grouped data result
export interface GroupedData<T = any> {
  groups: {
    key: string;
    label: string;
    count: number;
    items: T[];
  }[];
}

// Filtered result
export interface FilteredResult<T> {
  data: T[] | GroupedData<T>;
  pagination: PaginationMeta;
  metadata: FilterMetadata[];
}

// Saved search
export interface SavedSearch {
  id: string;
  name: string;
  filters: ComplexFilterRule[];
  complexFilter?: ComplexFilter;
  groupBy?: string;
  sortBy?: SortParams;
  isDefault?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Generic filter options
export interface UseGenericFilterOptions {
  defaultLimit?: number;
  defaultSort?: SortParams;
  defaultGroupBy?: string;
  enableSavedSearches?: boolean;
}

// Generic filter hook return type
export interface UseGenericFilterReturn<T extends GenericEntity, TFilters extends AdvancedBaseFilters = AdvancedBaseFilters> {
  // Data
  data: T[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  metadata: FilterMetadata[];
  fieldDiscovery: DynamicFieldDiscovery | null;
  
  // Filter state
  queryParams: AdvancedQueryParams<TFilters>;
  complexFilter: ComplexFilter | null | undefined;
  savedSearches: SavedSearch[];
  
  // Actions
  setComplexFilter: (filter: ComplexFilter | null) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sort: SortParams | null) => void;
  setGroupBy: (groupBy: string | null) => void;
  refetch: () => void;
  
  // Filter management
  addFilter: (filter: ComplexFilterRule) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  
  // Saved searches
  saveCurrentSearch: (name: string, isPublic?: boolean) => Promise<void>;
  loadSavedSearch: (searchId: string) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  toggleFavorite: (searchId: string) => Promise<void>;
} 