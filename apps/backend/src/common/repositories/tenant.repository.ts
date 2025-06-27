// Tenant repository interface and implementation
// Handles all tenant-related database operations

import { Injectable } from '@nestjs/common';
import { BaseRepository, IBaseRepository, QueryOptions } from './base.repository';
import { MasterPrismaService } from '../../modules/master-prisma/master-prisma.service';
import { CreateTenantDto } from '../../modules/tenant/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../modules/tenant/dto/update-tenant.dto';

// Tenant entity type (based on Prisma schema)
export interface TenantEntity {
  id: string;
  name: string;
  subdomain: string;
  dbName: string;
  encryptedDbUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: any[];
}

// Tenant-specific repository interface
export interface ITenantRepository extends IBaseRepository<TenantEntity, CreateTenantDto, UpdateTenantDto> {
  // Tenant-specific methods
  findBySubdomain(subdomain: string): Promise<TenantEntity | null>;
  findByDbName(dbName: string): Promise<TenantEntity | null>;
  findActiveTenants(options?: QueryOptions): Promise<TenantEntity[]>;
  findTenantsWithPermissions(userId: string): Promise<TenantEntity[]>;
  
  // Complex query methods
  findWithComplexQuery(queryDto: any): Promise<{
    data: TenantEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>;
  
  // Tenant provisioning methods
  createWithProvisioning(data: CreateTenantDto, creatorId: string): Promise<TenantEntity>;
  updateTenantStatus(id: string, isActive: boolean): Promise<TenantEntity>;
  
  // Permission methods
  grantPermission(tenantId: string, userId: string): Promise<void>;
  revokePermission(tenantId: string, userId: string): Promise<void>;
  hasPermission(tenantId: string, userId: string): Promise<boolean>;
}

@Injectable()
export class TenantRepository extends BaseRepository<TenantEntity, CreateTenantDto, UpdateTenantDto> 
  implements ITenantRepository {

  constructor(private readonly prisma: MasterPrismaService) {
    super();
  }

  protected get model() {
    return this.prisma.tenant;
  }

  protected get modelName(): string {
    return 'Tenant';
  }

  async findBySubdomain(subdomain: string): Promise<TenantEntity | null> {
    this.logQuery('findBySubdomain', { subdomain });
    
    return this.model.findUnique({
      where: { subdomain },
    });
  }

  async findByDbName(dbName: string): Promise<TenantEntity | null> {
    this.logQuery('findByDbName', { dbName });
    
    return this.model.findFirst({
      where: { dbName },
    });
  }

  async findActiveTenants(options: QueryOptions = {}): Promise<TenantEntity[]> {
    this.logQuery('findActiveTenants', options);
    
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        isActive: true,
      },
    });
  }

  async findTenantsWithPermissions(userId: string): Promise<TenantEntity[]> {
    this.logQuery('findTenantsWithPermissions', { userId });
    
    return this.model.findMany({
      where: {
        permissions: {
          some: {
            userId,
          },
        },
      },
      include: {
        permissions: {
          where: {
            userId,
          },
        },
      },
    });
  }

  async findWithComplexQuery(queryDto: any): Promise<{
    data: TenantEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    this.logQuery('findWithComplexQuery', queryDto);
    
    // Analyze required includes
    const requiredIncludes = this.analyzeRequiredIncludes(queryDto);
    
    // Build where clause from complex filters
    const whereClause = this.buildComplexWhereClause(queryDto.complexFilter);
    
    // Build order by clause
    const orderBy = this.buildOrderBy(queryDto.sort);
    
    // Calculate pagination
    const skip = ((queryDto.page || 1) - 1) * (queryDto.limit || 10);
    const take = queryDto.limit || 10;
    
    // Execute query
    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        include: requiredIncludes,
        orderBy,
        skip,
        take,
      }),
      this.model.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      pagination: {
        page: queryDto.page || 1,
        limit: queryDto.limit || 10,
        total,
        totalPages: Math.ceil(total / (queryDto.limit || 10)),
        hasNext: (queryDto.page || 1) * (queryDto.limit || 10) < total,
        hasPrev: (queryDto.page || 1) > 1,
      },
    };
  }

  async createWithProvisioning(data: CreateTenantDto, creatorId: string): Promise<TenantEntity> {
    this.logQuery('createWithProvisioning', { data, creatorId });
    
    // This method will be implemented with the full provisioning logic
    // For now, create a basic tenant record
    return this.model.create({
      data: {
        ...data,
        subdomain: data.name.toLowerCase().replace(/\s/g, ''),
        dbName: `db_xl_${data.name.toLowerCase().replace(/\s/g, '')}_${Date.now()}`,
        encryptedDbUrl: '', // Will be set during provisioning
        permissions: {
          create: {
            userId: creatorId,
          },
        },
      },
    });
  }

  async updateTenantStatus(id: string, isActive: boolean): Promise<TenantEntity> {
    this.logQuery('updateTenantStatus', { id, isActive });
    
    return this.model.update({
      where: { id },
      data: { isActive },
    });
  }

  async grantPermission(tenantId: string, userId: string): Promise<void> {
    this.logQuery('grantPermission', { tenantId, userId });
    
    // Check if permission already exists
    const existingPermission = await this.prisma.tenantUserPermission.findFirst({
      where: {
        tenantId,
        userId,
      },
    });

    if (!existingPermission) {
      await this.prisma.tenantUserPermission.create({
        data: {
          tenantId,
          userId,
        },
      });
    }
  }

  async revokePermission(tenantId: string, userId: string): Promise<void> {
    this.logQuery('revokePermission', { tenantId, userId });
    
    await this.prisma.tenantUserPermission.deleteMany({
      where: {
        tenantId,
        userId,
      },
    });
  }

  async hasPermission(tenantId: string, userId: string): Promise<boolean> {
    this.logQuery('hasPermission', { tenantId, userId });
    
    const permission = await this.prisma.tenantUserPermission.findFirst({
      where: {
        tenantId,
        userId,
      },
    });

    return !!permission;
  }

  // Helper methods for complex query building
  private analyzeRequiredIncludes(queryDto: any): any {
    const includes: any = {};
    
    if (!queryDto.complexFilter?.rootGroup) {
      return includes;
    }

    // Analyze filter rules to determine required joins
    this.analyzeRulesForIncludes(queryDto.complexFilter.rootGroup, includes);
    
    return includes;
  }

  private analyzeRulesForIncludes(group: any, includes: any): void {
    if (group.rules) {
      group.rules.forEach((rule: any) => {
        this.addIncludeForFieldPath(rule.field, includes);
      });
    }

    if (group.groups) {
      group.groups.forEach((subGroup: any) => {
        this.analyzeRulesForIncludes(subGroup, includes);
      });
    }
  }

  private addIncludeForFieldPath(fieldPath: string, includes: any): void {
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      const relationName = parts[0];
      
      if (relationName === 'permissions') {
        includes.permissions = true;
      }
    }
  }

  private buildComplexWhereClause(complexFilter: any): any {
    if (!complexFilter?.rootGroup) {
      return {};
    }

    return this.buildGroupWhereClause(complexFilter.rootGroup);
  }

  private buildGroupWhereClause(group: any): any {
    const conditions: any[] = [];

    // Process rules
    if (group.rules && group.rules.length > 0) {
      group.rules.forEach((rule: any) => {
        const condition = this.buildRuleWhereClause(rule);
        if (condition) {
          conditions.push(condition);
        }
      });
    }

    // Process nested groups
    if (group.groups && group.groups.length > 0) {
      group.groups.forEach((subGroup: any) => {
        const subCondition = this.buildGroupWhereClause(subGroup);
        if (subCondition && Object.keys(subCondition).length > 0) {
          conditions.push(subCondition);
        }
      });
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    // Combine conditions based on logic
    return group.logic === 'OR' 
      ? { OR: conditions }
      : { AND: conditions };
  }

  private buildRuleWhereClause(rule: any): any {
    const { field, operator, value } = rule;

    if (field.includes('.')) {
      return this.buildNestedFieldCondition(field, operator, value);
    }

    return this.buildDirectFieldCondition(field, operator, value);
  }

  private buildDirectFieldCondition(field: string, operator: string, value: any): any {
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
      case 'greater_than_or_equal':
        return { [field]: { gte: value } };
      case 'less_than':
        return { [field]: { lt: value } };
      case 'less_than_or_equal':
        return { [field]: { lte: value } };
      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };
      case 'not_in':
        return { [field]: { notIn: Array.isArray(value) ? value : [value] } };
      case 'is_empty':
        return { [field]: null };
      case 'is_not_empty':
        return { [field]: { not: null } };
      default:
        return {};
    }
  }

  private buildNestedFieldCondition(fieldPath: string, operator: string, value: any): any {
    const parts = fieldPath.split('.');
    const relationName = parts[0];
    const relationField = parts.slice(1).join('.');

    if (relationName === 'permissions') {
      return {
        permissions: {
          some: this.buildDirectFieldCondition(relationField, operator, value),
        },
      };
    }

    return {};
  }

  private buildOrderBy(sort: any): any {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    if (sort.field.includes('.')) {
      // Handle nested field sorting if needed
      return { createdAt: 'desc' };
    }

    return { [sort.field]: sort.direction || 'desc' };
  }
} 