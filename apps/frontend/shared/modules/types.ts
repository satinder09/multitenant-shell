import React from 'react';

export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal'
  | 'between' | 'not_between'
  | 'in' | 'not_in'
  | 'is_empty' | 'is_not_empty'
  | 'preset';

export type ColumnType = 
  | 'string' | 'number' | 'boolean' | 'date' | 'datetime' 
  | 'enum' | 'json' | 'reference';

// Filter Source Configuration for Dynamic Options
export interface FilterSource {
  type: 'static' | 'api' | 'query' | 'table' | 'function';
  
  // Static options (existing behavior)
  options?: Array<{ value: any; label: string; color?: string }>;
  
  // API endpoint configuration
  api?: {
    url: string;                    // API endpoint URL
    method?: 'GET' | 'POST';        // HTTP method (default: GET)
    headers?: Record<string, string>; // Custom headers
    params?: Record<string, any>;   // Query parameters
    body?: Record<string, any>;     // Request body for POST
    
    // Field mapping for response data
    mapping: {
      value: string;                // Field name for option value (e.g., 'id', 'code')
      label: string;                // Field name for option label (e.g., 'name', 'title')
      color?: string;               // Optional field name for color
      description?: string;         // Optional field name for description
    };
    
    // Response structure
    dataPath?: string;              // Path to data array in response (e.g., 'data.items', 'results')
    totalPath?: string;             // Path to total count (e.g., 'data.total')
    
    // Caching
    cache?: {
      enabled: boolean;
      ttl: number;                  // Time to live in milliseconds
      key?: string;                 // Custom cache key
    };
    
    // Search support
    searchable?: {
      enabled: boolean;
      param: string;                // Search parameter name (e.g., 'search', 'q')
      minLength?: number;           // Minimum search length
      debounce?: number;            // Debounce delay in ms
    };
    
    // Pagination support
    pagination?: {
      enabled: boolean;
      pageParam: string;            // Page parameter name (e.g., 'page')
      sizeParam: string;            // Size parameter name (e.g., 'limit', 'size')
      defaultSize?: number;         // Default page size
    };
  };
  
  // Database query configuration
  query?: {
    sql: string;                    // Raw SQL query
    params?: Record<string, any>;   // Query parameters
    
    // Field mapping for query results
    mapping: {
      value: string;                // Column name for option value
      label: string;                // Column name for option label
      color?: string;               // Optional column name for color
      description?: string;         // Optional column name for description
    };
    
    // Caching
    cache?: {
      enabled: boolean;
      ttl: number;
      key?: string;
    };
  };
  
  // Table-based configuration (simplified query)
  table?: {
    name: string;                   // Table name
    valueColumn: string;            // Column for option value
    labelColumn: string;            // Column for option label
    colorColumn?: string;           // Optional column for color
    descriptionColumn?: string;     // Optional column for description
    
    // Filtering
    where?: Record<string, any>;    // WHERE conditions
    orderBy?: string | string[];    // ORDER BY clause
    limit?: number;                 // LIMIT clause
    
    // Caching
    cache?: {
      enabled: boolean;
      ttl: number;
      key?: string;
    };
  };
  
  // Function-based configuration (for complex logic)
  function?: {
    name: string;                   // Function name to call
    params?: Record<string, any>;   // Function parameters
    
    // Caching
    cache?: {
      enabled: boolean;
      ttl: number;
      key?: string;
    };
  };
  
  // Transform function for post-processing
  transform?: (data: any[]) => Array<{ value: any; label: string; color?: string; description?: string }>;
  
  // Error handling
  fallback?: Array<{ value: any; label: string; color?: string; description?: string }>; // Fallback options on error
  errorMessage?: string;          // Custom error message
}

// Auto-derive operators based on column type
export function getOperatorsForColumnType(type: ColumnType, hasOptions?: boolean): FilterOperator[] {
  switch (type) {
    case 'string':
      return ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty'];
    
    case 'number':
      return ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between'];
    
    case 'boolean':
      return ['equals', 'not_equals'];
    
    case 'date':
    case 'datetime':
      return ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset'];
    
    case 'enum':
      return hasOptions ? ['equals', 'not_equals', 'in', 'not_in'] : ['equals', 'not_equals', 'contains', 'not_contains'];
    
    case 'json':
      return ['contains', 'not_contains', 'is_empty', 'is_not_empty'];
    
    case 'reference':
      return ['equals', 'not_equals', 'in', 'not_in'];
    
    default:
      return ['equals', 'not_equals'];
  }
}

/**
 * AUTOMATIC OPERATOR DERIVATION BY COLUMN TYPE
 * 
 * The system automatically derives appropriate filter operators based on the column's data type:
 * 
 * 🔤 STRING FIELDS (type: 'string')
 *    Auto-derives: ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty']
 *    Examples: name, email, description, title
 * 
 * 🔢 NUMBER FIELDS (type: 'number')
 *    Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between']
 *    Examples: age, price, count, rating
 * 
 * ✅ BOOLEAN FIELDS (type: 'boolean')
 *    Auto-derives: ['equals', 'not_equals']
 *    Examples: isActive, isPublished, hasAccess
 * 
 * 📅 DATE/DATETIME FIELDS (type: 'date' | 'datetime')
 *    Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset']
 *    Examples: createdAt, updatedAt, birthDate, expiryDate
 *    Note: 'preset' enables quick filters like "Today", "This Week", "Last Month"
 * 
 * 🏷️ ENUM FIELDS (type: 'enum')
 *    With options: ['equals', 'not_equals', 'in', 'not_in']
 *    Without options: ['equals', 'not_equals', 'contains', 'not_contains']
 *    Examples: status, role, category, priority
 * 
 * 📝 JSON FIELDS (type: 'json')
 *    Auto-derives: ['contains', 'not_contains', 'is_empty', 'is_not_empty']
 *    Examples: metadata, settings, preferences
 * 
 * 🔗 REFERENCE FIELDS (type: 'reference')
 *    Auto-derives: ['equals', 'not_equals', 'in', 'not_in']
 *    Examples: userId, categoryId, parentId
 * 
 * OVERRIDE OPERATORS:
 * You can still manually specify operators if needed:
 * {
 *   field: 'specialField',
 *   type: 'string',
 *   operators: ['equals', 'not_equals'] // Override auto-derivation
 * }
 */

// Helper function to get effective operators for a column
export function getEffectiveOperators(column: ColumnDefinition): FilterOperator[] {
  // Use explicitly defined operators if provided
  if (column.operators && column.operators.length > 0) {
    return column.operators;
  }
  
  // Auto-derive operators based on column type
  const columnType = column.type || 'string';
  const hasOptions = column.options && column.options.length > 0;
  
  return getOperatorsForColumnType(columnType, hasOptions);
}

export interface ColumnDefinition {
  field: string;           // Database field name
  display: string;         // Display label
  type?: ColumnType;       // Data type
  
  // Table Display Properties
  visible?: boolean;       // Show in table by default
  sortable?: boolean;      // Allow sorting
  searchable?: boolean;    // Include in global search
  width?: number | string; // Column width
  render?: (value: any, record: any) => React.ReactNode; // Custom renderer
  
  // Filter Properties
  filterable?: boolean;    // Show in filter dropdown
  popular?: boolean;       // Show in popular filters
  filterPreset?: {         // Default filter preset configuration
    field: string;         // Field name (usually same as column field)
    operator: FilterOperator;
    value?: any;
    label?: string;        // Custom label for filter preset
  };
  operators?: FilterOperator[]; // Override auto-derived operators (auto-derived from type if not specified)
  
  // Reference to another module
  reference?: ModuleConfig | (() => ModuleConfig); // Import reference or lazy load
  relationship?: {
    type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    sourceField: string;   // Field in current table
    targetField: string;   // Field in referenced table
    through?: string;      // For many-to-many
  };
  
  // Validation & Options
  required?: boolean;
  
  // Filter Options Configuration
  // Legacy support for simple static options
  options?: Array<{ value: any; label: string; color?: string; description?: string }>; // For dropdowns, enums, boolean fields
  // Examples:
  // Boolean: [{ value: true, label: 'Active', color: 'green' }, { value: false, label: 'Inactive', color: 'gray' }]
  // Enum: [{ value: 'ADMIN', label: 'Administrator' }, { value: 'USER', label: 'Regular User' }]
  // Status: [{ value: 'pending', label: 'Pending', color: 'yellow' }, { value: 'completed', label: 'Completed', color: 'green' }]
  
  // Advanced Filter Source Configuration (NEW)
  filterSource?: FilterSource; // Dynamic options from API, database, etc.
  
  validation?: ValidationRule[];
  
  // Permissions
  permissions?: {
    view?: string[];       // Roles that can view this column
    edit?: string[];       // Roles that can edit this column
    filter?: string[];     // Roles that can filter by this column
  };
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern';
  value?: any;
  message: string;
}

export interface RowActionConfig {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  /**
   * Action handler function. 
   * 
   * IMPORTANT: Actions are responsible for their own data refresh.
   * Use: window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'yourModule' } }))
   * 
   * The framework does NOT automatically refresh data to avoid:
   * - Duplicate refreshes when actions show confirmation dialogs
   * - Performance issues from unnecessary API calls
   * - Race conditions between user interactions and data updates
   */
  onClick: (record: any) => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  condition?: (record: any) => boolean;
  confirmMessage?: string;
  displayMode?: 'button' | 'menu';
  priority?: number;
}

export interface BulkActionConfig {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  /**
   * Bulk action handler function.
   * 
   * IMPORTANT: Actions are responsible for their own data refresh.
   * Use: window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'yourModule' } }))
   * 
   * The framework does NOT automatically refresh data to avoid:
   * - Duplicate refreshes when actions show confirmation dialogs
   * - Performance issues from unnecessary API calls
   * - Race conditions between user interactions and data updates
   */
  onClick: (records: any[]) => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  condition?: (records: any[]) => boolean;
  confirmMessage?: string;
  displayMode?: 'icon' | 'dropdown'; // How to display the action: as icon button or in dropdown menu
}

export interface HeaderActionConfig {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  /**
   * Header action handler function.
   * 
   * IMPORTANT: Actions are responsible for their own data refresh if needed.
   * Use: window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'yourModule' } }))
   * 
   * The framework does NOT automatically refresh data to avoid:
   * - Duplicate refreshes when actions show confirmation dialogs
   * - Performance issues from unnecessary API calls
   * - Race conditions between user interactions and data updates
   * 
   * Note: Header actions (like "Create", "Import") typically don't need refresh
   * since they usually open modals or navigate to other pages.
   */
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export interface ModuleConfig {
  // Source Configuration
  sourceTable: string;
  primaryKey?: string;
  
  // Backend Configuration (GENERIC APPROACH)
  backendEndpoint?: string; // Custom backend endpoint (defaults to /api/{moduleName})
  backendMethod?: 'GET' | 'POST'; // HTTP method for backend calls (defaults to POST)
  
  // Column Definitions - Single source of truth
  columns: ColumnDefinition[];
  
  // Actions Configuration
  actions?: {
    rowActions?: RowActionConfig[];
    rowActionDisplay?: {
      mode: 'buttons' | 'menu' | 'mixed'; // How to display row actions
      maxButtons?: number; // Max buttons to show before switching to menu
      showLabels?: boolean; // Show labels on buttons or just icons
    };
    bulkActions?: BulkActionConfig[];
    headerActions?: HeaderActionConfig[];
  };
  
  // Module Metadata
  module: {
    name: string;
    title: string;
    description?: string;
    icon?: React.ComponentType<any>;
  };
  
  // Display Options
  display?: {
    defaultColumns?: string[]; // Which columns to show by default
    defaultSort?: { field: string; direction: 'asc' | 'desc' };
    pageSize?: number;
    selectable?: boolean;
  };
}

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
  label?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: number | string;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface FilterField {
  name: string;
  label: string;
  type: ColumnType;
  operators?: FilterOperator[];
  options?: Array<{ value: any; label: string }>;
  popular?: boolean;
  hasChildren?: boolean;
  children?: FilterField[];
}

export interface FilterPreset {
  field: string;
  label: string;
  operator: FilterOperator;
  value?: any;
  icon?: React.ComponentType<any>;
} 