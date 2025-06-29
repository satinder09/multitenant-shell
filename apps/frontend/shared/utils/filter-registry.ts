import React from 'react';
import { FilterOperator } from '@/shared/types/types';

// Core interfaces for the registration system
export interface PopularFilterConfig {
  id: string;
  label: string;
  type: 'preloaded' | 'user-input';
  icon?: React.ReactNode;
  
  // Common properties
  field: string;
  operator: FilterOperator;
  
  // For preloaded filters
  preloadedValue?: any;
  
  // For user-input filters
  inputConfig?: {
    renderType: 'datepicker' | 'dropdown' | 'multi-select';
    placeholder?: string;
    dataSource?: {
      table: string;
      valueField: string;
      displayField: string;
    };
    datePresets?: DatePreset[];
  };
}

export interface DatePreset {
  label: string;
  value: string; // 'today', 'thisWeek', 'thisMonth', 'thisYear', 'last7days', etc.
}

export interface FieldOverrideConfig {
  customFields?: CustomFieldDefinition[];
  disabledFields?: string[];
  customRelationships?: CustomRelationshipDefinition[];
}

export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: string;
  operators: FilterOperator[];
  renderType?: string;
}

export interface CustomRelationshipDefinition {
  name: string;
  label: string;
  relatedTable: string;
  customFields?: CustomFieldDefinition[];
}

export interface ModuleFilterRegistration {
  moduleName: string;
  sourceTable: string;                    // 'tenants' or 'tenants_view'
  popularFilters?: PopularFilterConfig[]; // Optional override
  fieldOverrides?: FieldOverrideConfig;   // Optional custom field definitions
  useAutoGeneration?: boolean;            // Default: true
  maxRelationshipDepth?: number;          // Default: 3
}

// Global registry to store module configurations
class FilterRegistry {
  private registry = new Map<string, ModuleFilterRegistration>();
  
  register(config: ModuleFilterRegistration): void {
    this.registry.set(config.moduleName, config);
  }
  
  get(moduleName: string): ModuleFilterRegistration | null {
    return this.registry.get(moduleName) || null;
  }
  
  has(moduleName: string): boolean {
    return this.registry.has(moduleName);
  }
  
  getAll(): ModuleFilterRegistration[] {
    return Array.from(this.registry.values());
  }
  
  clear(): void {
    this.registry.clear();
  }
}

// Singleton instance
const filterRegistry = new FilterRegistry();

// Public API functions
export const registerModuleFilter = (config: ModuleFilterRegistration): void => {
  filterRegistry.register(config);
};

export const getModuleFilterConfig = (moduleName: string): ModuleFilterRegistration | null => {
  return filterRegistry.get(moduleName);
};

export const hasModuleFilter = (moduleName: string): boolean => {
  return filterRegistry.has(moduleName);
};

export const getAllRegisteredModules = (): ModuleFilterRegistration[] => {
  return filterRegistry.getAll();
};

// Helper function to format display values
export const formatDisplayValue = (value: any, renderType?: string): string => {
  if (!value) return '';
  
  switch (renderType) {
    case 'datepicker':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string') {
        // Handle preset values
        const presetLabels: Record<string, string> = {
          'today': 'Today',
          'thisWeek': 'This Week',
          'thisMonth': 'This Month',
          'thisYear': 'This Year',
          'last7days': 'Last 7 Days',
          'last30days': 'Last 30 Days'
        };
        return presetLabels[value] || value;
      }
      break;
    case 'dropdown':
    case 'multi-select':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
  
  return String(value);
};

// Helper function to convert preset values to actual dates
export const convertPresetToDate = (preset: string): Date | null => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return startOfWeek;
    case 'thisMonth':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1);
    case 'last7days':
      const last7Days = new Date(now);
      last7Days.setDate(now.getDate() - 7);
      return last7Days;
    case 'last30days':
      const last30Days = new Date(now);
      last30Days.setDate(now.getDate() - 30);
      return last30Days;
    default:
      return null;
  }
}; 