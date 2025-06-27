// User repository interface and implementation
// Handles all user-related database operations

import { Injectable } from '@nestjs/common';
import { BaseRepository, IBaseRepository, QueryOptions } from './base.repository';
import { MasterPrismaService } from '../../modules/master-prisma/master-prisma.service';
import { CreatePlatformUserDto } from '../../modules/platform-admin/users/dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from '../../modules/platform-admin/users/dto/update-platform-user.dto';

// User entity type (based on Prisma schema)
export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: any[];
  userRoles?: any[];
}

// User-specific repository interface
export interface IUserRepository extends IBaseRepository<UserEntity, CreatePlatformUserDto, UpdatePlatformUserDto> {
  // User-specific methods
  findByEmail(email: string): Promise<UserEntity | null>;
  findSuperAdmins(options?: QueryOptions): Promise<UserEntity[]>;
  findUsersWithTenantAccess(tenantId: string): Promise<UserEntity[]>;
  
  // Complex query methods
  findWithComplexQuery(queryDto: any): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>;
  
  // Authentication methods
  updatePassword(id: string, newPasswordHash: string): Promise<UserEntity>;
  
  // Role management methods
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  
  // Permission methods
  getTenantCount(userId: string): Promise<number>;
}

@Injectable()
export class UserRepository extends BaseRepository<UserEntity, CreatePlatformUserDto, UpdatePlatformUserDto> 
  implements IUserRepository {

  constructor(private readonly prisma: MasterPrismaService) {
    super();
  }

  protected get model() {
    return this.prisma.user;
  }

  protected get modelName(): string {
    return 'User';
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    this.logQuery('findByEmail', { email });
    
    return this.model.findUnique({
      where: { email },
      include: {
        permissions: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findSuperAdmins(options: QueryOptions = {}): Promise<UserEntity[]> {
    this.logQuery('findSuperAdmins', options);
    
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        isSuperAdmin: true,
      },
    });
  }

  async findUsersWithTenantAccess(tenantId: string): Promise<UserEntity[]> {
    this.logQuery('findUsersWithTenantAccess', { tenantId });
    
    return this.model.findMany({
      where: {
        permissions: {
          some: {
            tenantId,
          },
        },
      },
      include: {
        permissions: {
          where: {
            tenantId,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findWithComplexQuery(queryDto: any): Promise<{
    data: any[];
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
    
    // Build where clause from complex filters
    const whereClause = this.buildComplexWhereClause(queryDto.complexFilter);
    
    // Calculate pagination
    const skip = ((queryDto.page || 1) - 1) * (queryDto.limit || 10);
    const take = queryDto.limit || 10;
    
    // Execute query
    const [users, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        include: {
          permissions: {
            select: {
              tenantId: true,
            },
          },
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take,
      }),
      this.model.count({
        where: whereClause,
      }),
    ]);

    // Transform the data
    const transformedData = users.map(user => {
      const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                         (user.isSuperAdmin ? 'admin' : 'user');
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        isActive: true,
        createdAt: user.createdAt.toISOString(),
        lastLogin: null,
        tenantCount: user.permissions.length,
      };
    });

    return {
      data: transformedData,
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

  async updatePassword(id: string, newPasswordHash: string): Promise<UserEntity> {
    this.logQuery('updatePassword', { id });
    
    return this.model.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    this.logQuery('assignRole', { userId, roleId });
    
    const existingAssignment = await this.prisma.userRole.findFirst({
      where: { userId, roleId },
    });

    if (!existingAssignment) {
      await this.prisma.userRole.create({
        data: { userId, roleId },
      });
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    this.logQuery('removeRole', { userId, roleId });
    
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
  }

  async getTenantCount(userId: string): Promise<number> {
    this.logQuery('getTenantCount', { userId });
    
    return this.prisma.tenantUserPermission.count({
      where: { userId },
    });
  }

  // Helper method for complex query building
  private buildComplexWhereClause(complexFilter: any): any {
    if (!complexFilter?.rootGroup) {
      return {};
    }

    return this.buildGroupWhereClause(complexFilter.rootGroup);
  }

  private buildGroupWhereClause(group: any): any {
    const conditions: any[] = [];

    if (group.rules && group.rules.length > 0) {
      group.rules.forEach((rule: any) => {
        const condition = this.buildRuleWhereClause(rule);
        if (condition) {
          conditions.push(condition);
        }
      });
    }

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

    return group.logic === 'OR' 
      ? { OR: conditions }
      : { AND: conditions };
  }

  private buildRuleWhereClause(rule: any): any {
    const { field, operator, value } = rule;

    switch (field) {
      case 'name':
      case 'email':
        return this.buildStringCondition(field, operator, value);
      case 'isSuperAdmin':
        return this.buildBooleanCondition(field, operator, value);
      default:
        return {};
    }
  }

  private buildStringCondition(field: string, operator: string, value: any): any {
    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      default:
        return {};
    }
  }

  private buildBooleanCondition(field: string, operator: string, value: any): any {
    const boolValue = value === true || value === 'true';
    return operator === 'equals' ? { [field]: boolValue } : {};
  }
} 