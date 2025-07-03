import { Logger } from '@nestjs/common';

export interface FieldMapping {
  type: 'string' | 'number' | 'boolean' | 'date';
  operators: string[];
  relation?: {
    model: string;
    field: string;
  };
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class QueryBuilderUtils {
  private static readonly logger = new Logger(QueryBuilderUtils.name);

  /**
   * Build complete where clause from complex filter with pipe operator support
   */
  static buildWhereClause(complexFilter: any, fieldMappings?: Record<string, FieldMapping>): any {
    if (!complexFilter?.rootGroup) {
      this.logger.log('📝 No complex filters - using empty where clause');
      return {};
    }

    this.logger.log('🏗️  Building database where clause from complex filters...');
    const whereClause = this.buildGroupWhereClause(complexFilter.rootGroup, fieldMappings);
    this.logger.log('✅ Where clause construction complete');
    
    return whereClause;
  }

  /**
   * Build where clause for a group (AND/OR logic)
   */
  private static buildGroupWhereClause(group: any, fieldMappings?: Record<string, FieldMapping>): any {
    const conditions: any[] = [];

    // Process rules
    if (group.rules) {
      for (const rule of group.rules) {
        const condition = this.buildRuleWhereClause(rule, fieldMappings);
        if (condition && Object.keys(condition).length > 0) {
          conditions.push(condition);
        }
      }
    }

    // Process nested groups
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        const nestedCondition = this.buildGroupWhereClause(nestedGroup, fieldMappings);
        if (nestedCondition && Object.keys(nestedCondition).length > 0) {
          conditions.push(nestedCondition);
        }
      }
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    // Apply group logic (AND/OR)
    if (group.logic === 'OR') {
      return { OR: conditions };
    } else {
      return { AND: conditions };
    }
  }

  /**
   * Build where clause for a single rule
   */
  private static buildRuleWhereClause(rule: any, fieldMappings?: Record<string, FieldMapping>): any {
    const { field, operator, value, fieldPath } = rule;
    const path = fieldPath || [field];

    this.logger.log(`🔧 Processing rule: ${path.join('.')} ${operator} "${value}"`);

    // Handle direct fields
    if (path.length === 1) {
      return this.buildFieldConditionWithPipeSupport(path[0], operator, value);
    }

    // Handle nested fields (relations)
    return this.buildNestedFieldCondition(path, operator, value, fieldMappings);
  }

  /**
   * Build field condition with pipe operator support for OR conditions
   */
  static buildFieldConditionWithPipeSupport(field: string, operator: string, value: any): any {
    // Handle pipe operator for OR conditions (e.g., "tenant1|tenant2|tenant3")
    if (typeof value === 'string' && value.includes('|') && ['contains', 'equals', 'starts_with', 'ends_with'].includes(operator)) {
      const values = value.split('|').map(v => v.trim()).filter(v => v.length > 0);
      if (values.length > 1) {
        this.logger.log(`🔄 Pipe operator detected: Converting "${value}" to OR conditions for ${field}`);
        
        const orConditions = values.map(val => {
          switch (operator) {
            case 'equals':
              return { [field]: val };
            case 'contains':
              return { [field]: { contains: val, mode: 'insensitive' } };
            case 'starts_with':
              return { [field]: { startsWith: val, mode: 'insensitive' } };
            case 'ends_with':
              return { [field]: { endsWith: val, mode: 'insensitive' } };
            default:
              return { [field]: { contains: val, mode: 'insensitive' } };
          }
        });
        
        return { OR: orConditions };
      }
    }

    // Standard single-value operations
    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'not_equals':
        return { [field]: { not: value } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'not_contains':
        return { [field]: { not: { contains: value, mode: 'insensitive' } } };
      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'ends_with':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      case 'greater_than':
        return { [field]: { gt: value } };
      case 'less_than':
        return { [field]: { lt: value } };
      case 'greater_equal':
        return { [field]: { gte: value } };
      case 'less_equal':
        return { [field]: { lte: value } };
      case 'is_empty':
        return { [field]: null };
      case 'is_not_empty':
        return { [field]: { not: null } };
      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };
      case 'not_in':
        return { [field]: { notIn: Array.isArray(value) ? value : [value] } };
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return { [field]: { gte: value[0], lte: value[1] } };
        }
        return {};
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return {};
    }
  }

  /**
   * Build nested field condition for relations
   */
  private static buildNestedFieldCondition(fieldPath: string[], operator: string, value: any, fieldMappings?: Record<string, FieldMapping>): any {
    const [firstLevel, ...restPath] = fieldPath;

    // Common relation patterns
    const relationPatterns: Record<string, { type: string }> = {
      permissions: { type: 'some' },
      userRoles: { type: 'some' },
      roles: { type: 'some' },
      impersonationSessions: { type: 'some' },
      accessLogs: { type: 'some' },
      user: { type: 'direct' },
      role: { type: 'direct' }
    };

    const pattern = relationPatterns[firstLevel];
    if (!pattern) {
      this.logger.warn(`Unknown relation: ${firstLevel}`);
      return {};
    }

    if (pattern.type === 'some') {
      return {
        [firstLevel]: {
          some: this.buildNestedCondition(restPath, operator, value)
        }
      };
    } else {
      return {
        [firstLevel]: this.buildNestedCondition(restPath, operator, value)
      };
    }
  }

  /**
   * Build nested condition recursively
   */
  private static buildNestedCondition(fieldPath: string[], operator: string, value: any): any {
    if (fieldPath.length === 1) {
      return this.buildFieldConditionWithPipeSupport(fieldPath[0], operator, value);
    }

    const [nextLevel, ...restPath] = fieldPath;
    return {
      [nextLevel]: this.buildNestedCondition(restPath, operator, value)
    };
  }

  /**
   * Build order by clause
   */
  static buildOrderBy(sort?: { field: string; direction: 'asc' | 'desc' }): any {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    // Handle nested sorting if needed
    if (sort.field.includes('.')) {
      // For now, default to createdAt for complex sorts
      this.logger.log(`Complex sort field ${sort.field} - using default createdAt`);
      return { createdAt: 'desc' };
    }

    return { [sort.field]: sort.direction };
  }

  /**
   * Build pagination options
   */
  static buildPagination(page = 1, limit = 10): { skip: number; take: number } {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
  }

  /**
   * Format paginated response
   */
  static formatResponse<T>(data: T[], total: number, queryOptions: QueryOptions): PaginatedResponse<T> {
    const page = queryOptions.page || 1;
    const limit = queryOptions.limit || 10;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Analyze required includes based on filter fields
   */
  static analyzeRequiredIncludes(complexFilter: any): Record<string, any> {
    const includes: Record<string, any> = {};
    
    if (!complexFilter?.rootGroup) {
      return includes;
    }

    this.analyzeRulesForIncludes(complexFilter.rootGroup, includes);
    return includes;
  }

  /**
   * Recursively analyze rules to determine required includes
   */
  private static analyzeRulesForIncludes(group: any, includes: Record<string, any>): void {
    if (group.rules) {
      group.rules.forEach((rule: any) => {
        const fieldPath = rule.fieldPath || [rule.field];
        this.addIncludeForPath(fieldPath, includes);
      });
    }

    if (group.groups) {
      group.groups.forEach((subGroup: any) => {
        this.analyzeRulesForIncludes(subGroup, includes);
      });
    }
  }

  /**
   * Add include for a field path
   */
  private static addIncludeForPath(fieldPath: string[], includes: Record<string, any>): void {
    if (fieldPath.length > 1) {
      const relationName = fieldPath[0];
      
      // Common relations that need includes
      const relationIncludes = ['permissions', 'userRoles', 'roles', 'impersonationSessions', 'accessLogs'];
      
      if (relationIncludes.includes(relationName)) {
        includes[relationName] = true;
      }
    }
  }

  /**
   * Validate field mappings
   */
  static validateField(field: string, operator: string, fieldMappings?: Record<string, FieldMapping>): boolean {
    if (!fieldMappings || !fieldMappings[field]) {
      return true; // Allow unknown fields by default
    }

    const mapping = fieldMappings[field];
    return mapping.operators.includes(operator);
  }

  /**
   * Get supported operators for a field
   */
  static getSupportedOperators(field: string, fieldMappings?: Record<string, FieldMapping>): string[] {
    if (!fieldMappings || !fieldMappings[field]) {
      return ['equals', 'contains', 'starts_with', 'ends_with']; // Default operators
    }

    return fieldMappings[field].operators;
  }
} 