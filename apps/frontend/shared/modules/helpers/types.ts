// Streamlined Module System Types
import { ModuleConfig, ColumnDefinition, RowActionConfig, BulkActionConfig, HeaderActionConfig } from '../types';
import React from 'react';

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'currency' | 'email' | 'select' | 'image';
  display?: string;
  required?: boolean;
  unique?: boolean;
  readonly?: boolean;
  visible?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  width?: number | string;
  
  // Options for select fields
  options?: Array<{ value: any; label: string; color?: string }> | string; // string for API endpoint
  
  // Formatting
  format?: 'currency' | 'percentage' | 'date' | 'datetime';
  
  // Custom rendering
  customRenderer?: (value: any, record: any) => React.ReactNode;
  
  // Filter configuration
  filterPreset?: {
    operator: string;
    value?: any;
    label?: string;
  };
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface SimpleModuleConfig {
  name: string;
  entity: string;
  title?: string;
  description?: string;
  fields: FieldSchema[];
  
  // Optional customizations
  customActions?: {
    rowActions?: RowActionConfig[];
    bulkActions?: BulkActionConfig[];
    headerActions?: HeaderActionConfig[];
  };
  
  // Display options
  defaultColumns?: string[];
  pageSize?: number;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  selectable?: boolean;
}

export interface ModuleEnhancements {
  columns?: Record<string, Partial<ColumnDefinition>>;
  actions?: {
    rowActions?: RowActionConfig[];
    bulkActions?: BulkActionConfig[];
    headerActions?: HeaderActionConfig[];
  };
  display?: {
    defaultColumns?: string[];
    pageSize?: number;
    defaultSort?: { field: string; direction: 'asc' | 'desc' };
  };
}

export interface FormProps {
  data?: any;
  onSubmit: (data: any) => void | Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
} 