// Module Factory - Main entry point for creating streamlined modules
import { ModuleConfig, RowActionConfig, BulkActionConfig, HeaderActionConfig } from '../types';
import { SimpleModuleConfig, ModuleEnhancements } from './types';
import { generateColumnsFromSchema } from './columnHelpers';
import { 
  generateDefaultRowActions, 
  generateDefaultBulkActions, 
  generateDefaultHeaderActions,
  mergeActions
} from './actionHelpers';

/**
 * Create a simple module with minimal configuration
 * Generates all CRUD functionality automatically
 */
export function createSimpleModule(config: SimpleModuleConfig): ModuleConfig {
  const moduleName = config.name;
  const entityName = config.entity;
  
  // Generate columns from field schema
  const columns = generateColumnsFromSchema(config.fields);
  
  // Generate default actions
  const rowActions = generateDefaultRowActions(
    entityName, 
    moduleName, 
    config.customActions?.rowActions || []
  );
  
  const bulkActions = generateDefaultBulkActions(
    entityName,
    moduleName,
    config.customActions?.bulkActions || []
  );
  
  const headerActions = generateDefaultHeaderActions(
    entityName,
    moduleName,
    config.customActions?.headerActions || []
  );

  // Create the complete module configuration
  const moduleConfig: ModuleConfig = {
    // Source Configuration
    sourceTable: entityName,
    primaryKey: 'id',
    
    // Module Metadata
    module: {
      name: moduleName,
      title: config.title || entityName + 's',
      description: config.description || `Manage ${entityName.toLowerCase()}s`
    },
    
    // Column Definitions
    columns,
    
    // Actions Configuration
    actions: {
      rowActions,
      rowActionDisplay: {
        mode: 'mixed',
        maxButtons: 2,
        showLabels: false
      },
      bulkActions,
      headerActions
    },
    
    // Display Options
    display: {
      defaultColumns: config.defaultColumns || columns.filter(col => col.visible).map(col => col.field),
      defaultSort: config.defaultSort || { field: 'createdAt', direction: 'desc' },
      pageSize: config.pageSize || 10,
      selectable: config.selectable !== false
    }
  };

  return moduleConfig;
}

/**
 * Enhance an existing module configuration with additional customizations
 * Useful for taking a simple module and adding specific customizations
 */
export function enhanceModule(baseConfig: ModuleConfig, enhancements: ModuleEnhancements): ModuleConfig {
  const enhanced = { ...baseConfig };

  // Merge column enhancements
  if (enhancements.columns) {
    enhanced.columns = enhanced.columns.map(column => {
      const enhancement = enhancements.columns?.[column.field];
      return enhancement ? { ...column, ...enhancement } : column;
    });
  }

  // Merge action enhancements
  if (enhancements.actions) {
    if (!enhanced.actions) {
      enhanced.actions = {};
    }
    
    if (enhancements.actions.rowActions) {
      enhanced.actions.rowActions = mergeActions(
        enhanced.actions.rowActions || [],
        enhancements.actions.rowActions
      );
    }
    
    if (enhancements.actions.bulkActions) {
      enhanced.actions.bulkActions = mergeActions(
        enhanced.actions.bulkActions || [],
        enhancements.actions.bulkActions
      );
    }
    
    if (enhancements.actions.headerActions) {
      enhanced.actions.headerActions = mergeActions(
        enhanced.actions.headerActions || [],
        enhancements.actions.headerActions
      );
    }
  }

  // Merge display enhancements
  if (enhancements.display) {
    enhanced.display = {
      ...enhanced.display,
      ...enhancements.display
    };
  }

  return enhanced;
}

/**
 * Create a module configuration from a database table schema
 * Automatically infers field types and generates appropriate configurations
 * @param tableName - Name of the database table
 * @param schemaOverrides - Manual overrides for specific fields
 */
export function createModuleFromSchema(
  tableName: string,
  schemaOverrides: Partial<SimpleModuleConfig> = {}
): ModuleConfig {
  // This would typically read from database schema
  // For now, we'll provide a basic implementation
  const inferredConfig: SimpleModuleConfig = {
    name: tableName.toLowerCase(),
    entity: tableName,
    fields: [
      { name: 'id', type: 'string', visible: false },
      { name: 'name', type: 'string', required: true, searchable: true },
      { name: 'isActive', type: 'boolean', filterPreset: { operator: 'equals', value: true } },
      { name: 'createdAt', type: 'datetime' },
      { name: 'updatedAt', type: 'datetime', visible: false }
    ],
    ...schemaOverrides
  };

  return createSimpleModule(inferredConfig);
}

/**
 * Utility function to quickly create a basic CRUD module with standard fields
 * Perfect for prototyping or simple entities
 */
export function createBasicCrudModule(
  name: string,
  entity: string,
  additionalFields: SimpleModuleConfig['fields'] = []
): ModuleConfig {
  const config: SimpleModuleConfig = {
    name,
    entity,
    fields: [
      { name: 'id', type: 'string', visible: false },
      { name: 'name', type: 'string', required: true, searchable: true },
      { name: 'description', type: 'string', visible: false },
      { name: 'isActive', type: 'boolean', filterPreset: { operator: 'equals', value: true } },
      { name: 'createdAt', type: 'datetime' },
      { name: 'updatedAt', type: 'datetime', visible: false },
      ...additionalFields
    ]
  };

  return createSimpleModule(config);
}

/**
 * Helper function to create select field options from an array of strings
 */
export function createSelectOptions(values: string[]): Array<{ value: string; label: string }> {
  return values.map(value => ({
    value: value.toLowerCase(),
    label: value.charAt(0).toUpperCase() + value.slice(1)
  }));
}

/**
 * Helper function to create status options (active/inactive)
 */
export function createStatusOptions(): Array<{ value: boolean; label: string; color: string }> {
  return [
    { value: true, label: 'Active', color: 'green' },
    { value: false, label: 'Inactive', color: 'gray' }
  ];
}

/**
 * Helper function to create priority options
 */
export function createPriorityOptions(): Array<{ value: string; label: string; color: string }> {
  return [
    { value: 'low', label: 'Low', color: 'blue' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' }
  ];
} 