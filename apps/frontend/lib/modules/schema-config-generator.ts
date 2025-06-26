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

// Schema data based on your actual Prisma schema
const PRISMA_SCHEMA: Record<string, PrismaModel> = {
  Tenant: {
    name: 'Tenant',
    fields: [
      { name: 'id', type: 'String', isOptional: false, isId: true, isUnique: false },
      { name: 'name', type: 'String', isOptional: false, isId: false, isUnique: false },
      { name: 'subdomain', type: 'String', isOptional: false, isId: false, isUnique: true },
      { name: 'dbName', type: 'String', isOptional: false, isId: false, isUnique: true },
      { name: 'encryptedDbUrl', type: 'String', isOptional: false, isId: false, isUnique: false },
      { name: 'isActive', type: 'Boolean', isOptional: false, isId: false, isUnique: false },
      { name: 'createdAt', type: 'DateTime', isOptional: false, isId: false, isUnique: false },
      { name: 'updatedAt', type: 'DateTime', isOptional: false, isId: false, isUnique: false }
    ],
    relations: [
      { name: 'permissions', type: 'one-to-many', model: 'TenantUserPermission', fromFields: ['id'], toFields: ['tenantId'] },
      { name: 'impersonationSessions', type: 'one-to-many', model: 'ImpersonationSession', fromFields: ['id'], toFields: ['impersonatedTenantId'] },
      { name: 'accessLogs', type: 'one-to-many', model: 'TenantAccessLog', fromFields: ['id'], toFields: ['tenantId'] }
    ]
  },
  User: {
    name: 'User',
    fields: [
      { name: 'id', type: 'String', isOptional: false, isId: true, isUnique: false },
      { name: 'email', type: 'String', isOptional: false, isId: false, isUnique: true },
      { name: 'passwordHash', type: 'String', isOptional: false, isId: false, isUnique: false },
      { name: 'name', type: 'String', isOptional: true, isId: false, isUnique: false },
      { name: 'isSuperAdmin', type: 'Boolean', isOptional: false, isId: false, isUnique: false },
      { name: 'createdAt', type: 'DateTime', isOptional: false, isId: false, isUnique: false },
      { name: 'updatedAt', type: 'DateTime', isOptional: false, isId: false, isUnique: false }
    ],
    relations: [
      { name: 'permissions', type: 'one-to-many', model: 'TenantUserPermission', fromFields: ['id'], toFields: ['userId'] },
      { name: 'userRoles', type: 'one-to-many', model: 'UserRole', fromFields: ['id'], toFields: ['userId'] }
    ]
  }
};

// Hidden fields that shouldn't be shown in UI
const HIDDEN_FIELDS = ['passwordHash', 'encryptedDbUrl', 'sessionId'];

// Sensitive fields that should be hidden by default
const SENSITIVE_PATTERNS = /password|hash|secret|key|token|encrypted/i;

export class SchemaConfigGenerator {
  
  static generateModuleConfig(
    modelName: string,
    overrides?: Partial<ModuleConfig>
  ): ModuleConfig {
    const model = PRISMA_SCHEMA[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found in schema`);
    }

    const columns = this.generateColumns(model);
    const defaultColumns = this.getDefaultVisibleColumns(columns);

    return {
      sourceTable: modelName,
      primaryKey: 'id',
      columns,
      display: {
        defaultColumns,
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
  }

  private static generateColumns(model: PrismaModel): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];

    // Generate columns from fields
    for (const field of model.fields) {
      if (HIDDEN_FIELDS.includes(field.name) || SENSITIVE_PATTERNS.test(field.name)) {
        continue; // Skip hidden/sensitive fields
      }

      const column = this.generateColumnFromField(field);
      columns.push(column);
    }

    // Generate columns from relations
    for (const relation of model.relations) {
      const column = this.generateColumnFromRelation(relation);
      columns.push(column);
    }

    return columns;
  }

  private static generateColumnFromField(field: PrismaField): ColumnDefinition {
    const baseType = field.isEnum ? 'enum' : PRISMA_TYPE_MAPPING[field.type] || 'string';
    const operators = TYPE_OPERATORS[baseType] || TYPE_OPERATORS.string;
    
    // Auto-detect display properties
    const isVisible = this.shouldBeVisible(field);
    const isPopular = this.shouldBePopular(field);
    const popularFilter = isPopular ? this.generatePopularFilter(field) : undefined;

    return {
      field: field.name,
      display: this.generateDisplayLabel(field.name),
      type: baseType as any,
      visible: isVisible,
      sortable: !field.relationName,
      searchable: baseType === 'string' && !FIELD_PATTERNS.id.test(field.name),
      filterable: true,
      popular: isPopular,
      popularFilter,
      operators,
      required: !field.isOptional,
      ...(field.isEnum && field.enumValues && {
        options: field.enumValues.map(value => ({
          value,
          label: this.generateDisplayLabel(value)
        }))
      })
    };
  }

  private static generateColumnFromRelation(relation: any): ColumnDefinition {
    return {
      field: relation.name,
      display: this.generateDisplayLabel(relation.name),
      type: 'reference',
      visible: true,
      sortable: false,
      searchable: false,
      filterable: true,
      popular: this.shouldRelationBePopular(relation.name),
      operators: TYPE_OPERATORS.reference,
      relationship: {
        type: relation.type as any,
        sourceField: relation.fromFields[0],
        targetField: relation.toFields[0]
      }
    };
  }

  private static shouldBeVisible(field: PrismaField): boolean {
    // Hide IDs except primary key, hide sensitive fields
    if (field.name !== 'id' && FIELD_PATTERNS.id.test(field.name)) return false;
    if (SENSITIVE_PATTERNS.test(field.name)) return false;
    if (field.name === 'updatedAt') return false; // Usually not needed in list view
    return true;
  }

  private static shouldBePopular(field: PrismaField): boolean {
    // Auto-detect popular fields
    return (
      FIELD_PATTERNS.name.test(field.name) ||
      FIELD_PATTERNS.email.test(field.name) ||
      FIELD_PATTERNS.status.test(field.name) ||
      FIELD_PATTERNS.active.test(field.name) ||
      field.name === 'createdAt' ||
      field.type === 'Boolean'
    );
  }

  private static shouldRelationBePopular(relationName: string): boolean {
    // Relations that are commonly filtered
    return ['user', 'tenant', 'permissions', 'roles'].includes(relationName);
  }

  private static generatePopularFilter(field: PrismaField): any {
    const fieldName = field.name.toLowerCase();
    
    if (AUTO_POPULAR_PATTERNS[fieldName]) {
      return AUTO_POPULAR_PATTERNS[fieldName];
    }

    // Auto-generate based on field type
    if (field.type === 'Boolean') {
      return {
        operator: 'equals' as FilterOperator,
        value: field.name.includes('active') || field.name.includes('enabled') ? true : false,
        label: `${field.name.includes('active') ? 'Active' : 'Enabled'} Only`
      };
    }

    if (field.isEnum && field.enumValues) {
      return {
        operator: 'equals' as FilterOperator,
        value: field.enumValues[0],
        label: `${this.generateDisplayLabel(field.name)} Filter`
      };
    }

    return {
      operator: 'contains' as FilterOperator,
      label: `Search by ${this.generateDisplayLabel(field.name)}`
    };
  }

  private static generateDisplayLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/Id$/, ' ID')
      .replace(/Url$/, ' URL')
      .replace(/At$/, '')
      .trim();
  }

  private static generateTitle(modelName: string): string {
    // Convert PascalCase to Title Case with pluralization
    const title = modelName.replace(/([A-Z])/g, ' $1').trim();
    return title.endsWith('s') ? title : title + 's';
  }

  private static getDefaultVisibleColumns(columns: ColumnDefinition[]): string[] {
    return columns
      .filter(col => col.visible && !col.field.endsWith('Id'))
      .slice(0, 6) // Limit to 6 columns for table view
      .map(col => col.field);
  }
}

// Export function to generate config for any model
export function generateConfigFromSchema(
  modelName: string,
  overrides?: Partial<ModuleConfig>
): ModuleConfig {
  return SchemaConfigGenerator.generateModuleConfig(modelName, overrides);
} 