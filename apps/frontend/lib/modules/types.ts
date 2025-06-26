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
  popularFilter?: {        // Default popular filter configuration
    field: string;         // Field name (usually same as column field)
    operator: FilterOperator;
    value?: any;
    label?: string;        // Custom label for popular filter
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
  options?: Array<{ value: any; label: string; color?: string }>; // For dropdowns, enums, boolean fields
  // Examples:
  // Boolean: [{ value: true, label: 'Active', color: 'green' }, { value: false, label: 'Inactive', color: 'gray' }]
  // Enum: [{ value: 'ADMIN', label: 'Administrator' }, { value: 'USER', label: 'Regular User' }]
  // Status: [{ value: 'pending', label: 'Pending', color: 'yellow' }, { value: 'completed', label: 'Completed', color: 'green' }]
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
  onClick: (records: any[]) => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  condition?: (records: any[]) => boolean;
  confirmMessage?: string;
}

export interface HeaderActionConfig {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export interface ModuleConfig {
  // Source Configuration
  sourceTable: string;
  primaryKey?: string;
  
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

export interface PopularFilter {
  field: string;
  label: string;
  operator: FilterOperator;
  value?: any;
  icon?: React.ComponentType<any>;
} 