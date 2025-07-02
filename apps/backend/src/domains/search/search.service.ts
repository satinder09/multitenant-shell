import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MasterDatabaseService } from '../database/master/master-database.service';
import { UniversalSearchDto } from './search.controller';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly masterPrisma: MasterDatabaseService) {}

  async universalSearch(searchDto: UniversalSearchDto) {
    const { 
      sourceTable, 
      primaryKey, 
      fields, 
      page, 
      limit, 
      sort, 
      complexFilter, 
      fieldMappings,
      relations,
      virtualFields,
      computedFields 
    } = searchDto;

    this.logger.log(`🔍 Universal Search: Building query for table "${sourceTable}"`);

    // Comprehensive validation
    if (!sourceTable || typeof sourceTable !== 'string') {
      throw new BadRequestException('sourceTable is required and must be a string');
    }

    if (!primaryKey || typeof primaryKey !== 'string') {
      throw new BadRequestException('primaryKey is required and must be a string');
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      throw new BadRequestException('fields is required and must be a non-empty array');
    }

    if (page < 1 || limit < 1 || limit > 1000) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    // Validate table name (security check)
    const allowedTables = ['Tenant', 'User', 'Role', 'Permission', 'UserRole', 'RolePermission'];
    if (!allowedTables.includes(sourceTable)) {
      throw new BadRequestException(`Table "${sourceTable}" is not allowed for universal search`);
    }

    // Build where clause from complex filter
    let whereClause: any = {};
    if (complexFilter?.rootGroup?.rules) {
      whereClause = this.buildWhereClause(complexFilter.rootGroup, fieldMappings);
    }

    // Build order by clause - make it bulletproof
    let orderBy: any = {};
    if (sort?.field && sort?.direction) {
      // Validate field exists in the module config
      if (fields.includes(sort.field)) {
        orderBy = { [sort.field]: sort.direction };
      } else {
        // Default to primary key if invalid field
        orderBy = { [primaryKey]: 'asc' };
      }
    } else {
      // Safe default - always use primary key for consistent ordering
      orderBy = { [primaryKey]: 'asc' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    this.logger.log(`🎯 Query details: table=${sourceTable}, where=${JSON.stringify(whereClause)}, orderBy=${JSON.stringify(orderBy)}`);

    try {
      // Get the Prisma model dynamically
      const model = this.getPrismaModel(sourceTable);

      this.logger.log(`🎯 Query details: table=${sourceTable}, where=${JSON.stringify(whereClause)}, orderBy=${JSON.stringify(orderBy)}, page=${page}, limit=${limit}`);

      // Execute query with pagination - use bulletproof approach
      const queryOptions: any = {
        where: whereClause,
        orderBy,
        skip,
        take
      };

      // Add relations if specified
      if (relations && Object.keys(relations).length > 0) {
        queryOptions.include = this.buildIncludeClause(relations);
        this.logger.log(`🔗 Including relations: ${JSON.stringify(queryOptions.include, null, 2)}`);
      } else {
        // Only add select if we have a safe field list and no relations
        const selectClause = this.buildSelectClause(fields, primaryKey, sourceTable);
        if (selectClause) {
          queryOptions.select = selectClause;
        }
      }

      const [rawData, total] = await Promise.all([
        model.findMany(queryOptions),
        model.count({ where: whereClause })
      ]);

      // Process computed fields and virtual fields
      let processedData = rawData;
      
      if (relations || virtualFields || computedFields) {
        this.logger.log(`🔄 Processing computed fields. Sample raw data: ${JSON.stringify(rawData[0], null, 2)}`);
        processedData = await this.processComputedFields(rawData, {
          relations,
          virtualFields,
          computedFields,
          sourceTable,
          primaryKey
        });
        this.logger.log(`✅ Processed data sample: ${JSON.stringify(processedData[0], null, 2)}`);
      }

      this.logger.log(`✅ Universal Search: Retrieved ${processedData.length}/${total} records from "${sourceTable}"`);

      return {
        data: processedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      this.logger.error(`❌ Universal Search failed for table "${sourceTable}":`, error);
      
      // Provide more specific error messages
      if (error.message?.includes('Unknown field')) {
        throw new BadRequestException(`Invalid field in query for table "${sourceTable}". Please check your module configuration.`);
      } else if (error.message?.includes('Unknown argument')) {
        throw new BadRequestException(`Invalid query parameter for table "${sourceTable}". Please check your sort/filter configuration.`);
      } else if (error.code === 'P2001') {
        throw new BadRequestException(`Record not found in table "${sourceTable}"`);
      } else if (error.code === 'P2002') {
        throw new BadRequestException(`Unique constraint violation in table "${sourceTable}"`);
      } else {
        throw new BadRequestException(`Search failed for table "${sourceTable}": ${error?.message || 'Unknown database error'}`);
      }
    }
  }

  private getPrismaModel(tableName: string) {
    // Map table names to Prisma models
    const modelMap: Record<string, any> = {
      'Tenant': this.masterPrisma.tenant,
      'User': this.masterPrisma.user,
      'Role': this.masterPrisma.role,
      'Permission': this.masterPrisma.permission,
      'UserRole': this.masterPrisma.userRole,
      'RolePermission': this.masterPrisma.rolePermission,
    };

    const model = modelMap[tableName];
    if (!model) {
      throw new BadRequestException(`Model for table "${tableName}" not found`);
    }

    return model;
  }

  private buildSelectClause(fields: string[], primaryKey: string, sourceTable: string): Record<string, boolean> | undefined {
    // For complex queries with relations, it's safer to not use select
    // Let Prisma return all fields and we'll handle filtering later if needed
    
    // Get the model to validate fields exist
    const model = this.getPrismaModel(sourceTable);
    
    // For now, return undefined to select all fields
    // This prevents "Unknown field" errors while still being secure
    // because we validate the sourceTable against whitelist
    return undefined;
  }

  private buildWhereClause(group: any, fieldMappings: Record<string, any>): any {
    if (!group || typeof group !== 'object') {
      this.logger.warn('Invalid group structure in buildWhereClause');
      return {};
    }

    const { logic, rules = [], groups = [] } = group;
    
    // Validate logic
    if (logic && !['AND', 'OR'].includes(logic)) {
      this.logger.warn(`Invalid logic operator: ${logic}, defaulting to AND`);
    }

    const ruleConditions = rules
      .filter((rule: any) => rule && typeof rule === 'object' && rule.field && rule.operator)
      .map((rule: any) => {
        const { field, operator, value } = rule;
        const fieldMapping = fieldMappings[field];
        
        if (!fieldMapping) {
          this.logger.warn(`Field mapping not found for field: ${field}`);
          return {};
        }

        try {
          return this.buildRuleCondition(field, operator, value, fieldMapping);
        } catch (error) {
          this.logger.error(`Error building rule condition for field ${field}:`, error);
          return {};
        }
      });
    
    const groupConditions = groups
      .filter((subGroup: any) => subGroup && typeof subGroup === 'object')
      .map((subGroup: any) => {
        try {
          return this.buildWhereClause(subGroup, fieldMappings);
        } catch (error) {
          this.logger.error('Error building sub-group condition:', error);
          return {};
        }
      });
    
    const allConditions = [...ruleConditions, ...groupConditions]
      .filter(condition => condition && typeof condition === 'object' && Object.keys(condition).length > 0);
    
    if (allConditions.length === 0) return {};
    
    const effectiveLogic = logic === 'OR' ? 'OR' : 'AND'; // Default to AND
    
    if (effectiveLogic === 'AND') {
      return allConditions.length === 1 ? allConditions[0] : { AND: allConditions };
    } else {
      return allConditions.length === 1 ? allConditions[0] : { OR: allConditions };
    }
  }

  private buildRuleCondition(field: string, operator: string, value: any, fieldMapping: any): any {
    const { type } = fieldMapping;

    switch (operator) {
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      
      case 'not_contains':
        return { [field]: { not: { contains: value, mode: 'insensitive' } } };
      
      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      
      case 'ends_with':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      
      case 'equals':
        return { [field]: { equals: this.convertValue(value, type) } };
      
      case 'not_equals':
        return { [field]: { not: this.convertValue(value, type) } };
      
      case 'greater_than':
        return { [field]: { gt: this.convertValue(value, type) } };
      
      case 'greater_than_or_equal':
        return { [field]: { gte: this.convertValue(value, type) } };
      
      case 'less_than':
        return { [field]: { lt: this.convertValue(value, type) } };
      
      case 'less_than_or_equal':
        return { [field]: { lte: this.convertValue(value, type) } };
      
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return {
            [field]: {
              gte: this.convertValue(value[0], type),
              lte: this.convertValue(value[1], type)
            }
          };
        }
        return {};
      
      case 'in':
        if (Array.isArray(value)) {
          return { [field]: { in: value.map(v => this.convertValue(v, type)) } };
        }
        return {};
      
      case 'not_in':
        if (Array.isArray(value)) {
          return { [field]: { notIn: value.map(v => this.convertValue(v, type)) } };
        }
        return {};
      
      case 'is_empty':
        return {
          OR: [
            { [field]: { equals: null } },
            { [field]: { equals: '' } }
          ]
        };
      
      case 'is_not_empty':
        return {
          AND: [
            { [field]: { not: null } },
            { [field]: { not: '' } }
          ]
        };
      
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return {};
    }
  }

  private convertValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value);
      
      case 'boolean':
        return typeof value === 'boolean' ? value : value === 'true';
      
      case 'date':
      case 'datetime':
        return value instanceof Date ? value : new Date(value);
      
      default:
        return value;
    }
  }

  private buildIncludeClause(relations: Record<string, any>): any {
    const include: any = {};
    
    Object.entries(relations).forEach(([relationName, config]) => {
      // Start with basic relation include
      include[relationName] = true;
      
      // Handle where conditions if specified
      if (config.where) {
        include[relationName] = {
          where: config.where
        };
      }
      
      // Handle specific field selection
      if (Array.isArray(config.include)) {
        include[relationName] = {
          select: config.include.reduce((acc: any, field: string) => {
            acc[field] = true;
            return acc;
          }, {}),
          ...(config.where && { where: config.where })
        };
      }
    });
    
    // Add _count for aggregations
    const hasCountAggregations = Object.entries(relations).some(([_, config]) => 
      config.aggregate && config.aggregate.count
    );
    
    if (hasCountAggregations) {
      include._count = {};
      Object.entries(relations).forEach(([relationName, config]) => {
        if (config.aggregate && config.aggregate.count) {
          include._count[relationName] = config.where ? { where: config.where } : true;
        }
      });
    }
    
    return include;
  }

  private async processComputedFields(data: any[], options: {
    relations?: Record<string, any>;
    virtualFields?: Record<string, any>;
    computedFields?: Record<string, string>;
    sourceTable: string;
    primaryKey: string;
  }): Promise<any[]> {
    const { relations, virtualFields, computedFields } = options;
    
    let processedData = [...data];
    
    // Process relation-based computed fields
    if (relations && computedFields) {
      processedData = processedData.map(record => {
        const computedRecord = { ...record };
        
        // Apply computed field mappings
        Object.entries(computedFields).forEach(([sourceField, targetField]) => {
          if (sourceField.startsWith('_count.')) {
            const relationName = sourceField.replace('_count.', '');
            // Check if _count exists at top level (new structure)
            if (record._count && record._count[relationName] !== undefined) {
              computedRecord[targetField] = record._count[relationName];
            }
            // Fallback to old structure if needed
            else if (record[relationName] && record[relationName]._count !== undefined) {
              computedRecord[targetField] = record[relationName]._count;
            }
            // Default to 0 if no count found
            else {
              computedRecord[targetField] = 0;
            }
          } else if (sourceField.startsWith('_max.') || sourceField.startsWith('_min.')) {
            // Handle other aggregations
            const [aggregation, relationName, field] = sourceField.split('.');
            if (record[relationName] && Array.isArray(record[relationName])) {
              const values = record[relationName].map((item: any) => item[field]).filter(Boolean);
              if (values.length > 0) {
                computedRecord[targetField] = aggregation === '_max' 
                  ? Math.max(...values)
                  : Math.min(...values);
              }
            }
          }
        });
        
        return computedRecord;
      });
    }
    
    // Process virtual fields (placeholder for future implementation)
    if (virtualFields) {
      this.logger.log('Virtual fields processing not yet implemented');
      // TODO: Implement virtual field resolvers
      // This would involve calling custom resolver functions
      // and batching the results efficiently
    }
    
    return processedData;
  }
} 