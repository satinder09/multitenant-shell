import { ColumnDefinition, ModuleConfig, FilterOperator } from './types';

// Type mapping from Prisma to our column types
const PRISMA_TYPE_MAPPING: Record<string, string> = {
  'String': 'string',
  'Int': 'number',
  'Float': 'number',
  'Decimal': 'number',
  'Boolean': 'boolean',
  'DateTime': 'datetime',
  'Json': 'json',
  'Bytes': 'string'
};

// Auto-detect operators based on column type
const TYPE_OPERATORS: Record<string, FilterOperator[]> = {
  string: ['equals', 'contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty'],
  boolean: ['equals'],
  datetime: ['equals', 'greater_than', 'less_than', 'between', 'preset', 'is_empty', 'is_not_empty'],
  enum: ['equals', 'in', 'not_in'],
  json: ['contains', 'is_empty', 'is_not_empty'],
  reference: ['equals', 'in', 'not_in', 'is_empty', 'is_not_empty']
};

// Field name patterns for auto-detection
const FIELD_PATTERNS = {
  id: /^id$|.*Id$/,
  email: /email/i,
  name: /name/i,
  date: /date|time|at$/i,
  status: /status|state/i,
  active: /active|enabled/i,
  count: /count|total|sum/i,
  url: /url|link/i,
  hash: /hash|password/i
};

// Auto-generate popular filters based on field patterns
const AUTO_POPULAR_PATTERNS: Record<string, any> = {
  name: { operator: 'contains', label: 'Search by Name' },
  email: { operator: 'contains', label: 'Search by Email' },
  status: { operator: 'equals', label: 'Filter by Status' },
  isActive: { operator: 'equals', value: true, label: 'Active Only' },
  createdAt: { operator: 'preset', value: 'last_30_days', label: 'Created Last 30 Days' },
  updatedAt: { operator: 'preset', value: 'last_7_days', label: 'Updated Last Week' }
};

interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isId: boolean;
  isUnique: boolean;
  relationName?: string;
  relationTo?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  isEnum?: boolean;
  enumValues?: string[];
}

interface PrismaModel {
  name: string;
  fields: PrismaField[];
  relations: Array<{
    name: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    model: string;
    fromFields: string[];
    toFields: string[];
  }>;
}

// GENERIC APPROACH: Remove hardcoded schema definitions
// Instead, make schema generation optional and rely on module configs
// If needed, schema can be introspected dynamically from the database

// Hidden fields that shouldn't be shown in UI
const HIDDEN_FIELDS = ['passwordHash', 'encryptedDbUrl', 'sessionId'];

// Sensitive fields that should be hidden by default
const SENSITIVE_PATTERNS = /password|hash|secret|key|token|encrypted/i;

export class SchemaConfigGenerator {
  
  static generateModuleConfig(
    modelName: string,
    overrides?: Partial<ModuleConfig>
  ): ModuleConfig {
    // GENERIC APPROACH: Since we removed hardcoded schemas,
    // this method now creates a basic config that must be overridden
    console.warn(`⚠️ generateModuleConfig called for ${modelName} but no schema introspection available.`);
    console.warn(`Please create a manual config for this module in your module config file.`);
    
    // Return a minimal config that must be customized
    const basicConfig: ModuleConfig = {
      sourceTable: modelName,
      primaryKey: 'id',
      columns: [
        {
          field: 'id',
          display: 'ID',
          type: 'string',
          visible: false,
          sortable: true,
          searchable: false,
          filterable: true
        },
        {
          field: 'name',
          display: 'Name',
          type: 'string',
          visible: true,
          sortable: true,
          searchable: true,
          filterable: true,
          popular: true,
          popularFilter: {
            field: 'name',
            operator: 'contains' as const,
            label: 'Search by Name'
          }
        },
        {
          field: 'createdAt',
          display: 'Created',
          type: 'datetime',
          visible: true,
          sortable: true,
          searchable: false,
          filterable: true
        }
      ],
      display: {
        defaultColumns: ['name', 'createdAt'],
        defaultSort: { field: 'createdAt', direction: 'desc' },
        pageSize: 25,
        selectable: true
      },
      module: {
        name: modelName.toLowerCase(),
        title: this.generateTitle(modelName),
        description: `Manage ${modelName.toLowerCase()} records`
      },
      ...overrides
    };

    return basicConfig;
  }

  // UTILITY METHODS: Keep these for manual config creation
  static generateDisplayLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  static generateTitle(modelName: string): string {
    return modelName.replace(/([A-Z])/g, ' $1').trim();
  }

  static getDefaultVisibleColumns(columns: ColumnDefinition[]): string[] {
    return columns
      .filter(col => col.visible)
      .slice(0, 6) // Limit to first 6 visible columns
      .map(col => col.field);
  }
}

// SIMPLIFIED: Keep the main export function but make it create basic configs
export function generateConfigFromSchema(
  modelName: string,
  overrides?: Partial<ModuleConfig>
): ModuleConfig {
  return SchemaConfigGenerator.generateModuleConfig(modelName, overrides);
} 