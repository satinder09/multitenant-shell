import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { MasterDatabaseService } from '../../../database/master/master-database.service';
import { CreatePlatformUserDto } from '../dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from '../dto/update-platform-user.dto';
import { GetPlatformUsersQueryDto } from '../dto/get-platform-users-query.dto';
import { QueryBuilderUtils, FieldMapping } from '../../../../shared/utils/query-builder.utils';
import * as bcrypt from 'bcrypt';

// Type definitions for complex filters
interface FilterRule {
  field: string;
  operator: string;
  value: unknown;
  type?: string;
}

interface FilterGroup {
  operator: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

interface ComplexFilter {
  rootGroup: FilterGroup;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  tenantCount: number;
}

@Injectable()
export class PlatformUsersService {
  private readonly logger = new Logger(PlatformUsersService.name);

  constructor(private readonly masterPrisma: MasterDatabaseService) {}

  async create(createPlatformUserDto: CreatePlatformUserDto) {
    const { name, email, role, password } = createPlatformUserDto;

    // Check if user with this email already exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password if provided, otherwise generate a temporary one
    const saltRounds = 10;
    const hashedPassword = password 
      ? await bcrypt.hash(password, saltRounds)
      : await bcrypt.hash('temp_password_' + Date.now(), saltRounds);

    // Create the user
    const user = await this.masterPrisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        isSuperAdmin: role?.toLowerCase() === 'administrator' || role?.toLowerCase() === 'super admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Assign role if provided
    if (role) {
      // Find the role by name (case insensitive)
      const dbRole = await this.masterPrisma.role.findFirst({
        where: { 
          name: { 
            equals: role,
            mode: 'insensitive'
          }
        }
      });

      if (dbRole) {
        await this.masterPrisma.userRole.create({
          data: {
            userId: user.id,
            roleId: dbRole.id,
          },
        });
      }
    }

    this.logger.log(`Created platform user: ${user.email}`);
    return {
      ...user,
      role: role || 'user', // Include role in response
      tenantCount: 0, // New users start with 0 tenants
      lastLogin: null,
    };
  }

  async findAll() {
    const users = await this.masterPrisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        // Include tenant permissions count
        permissions: {
          select: {
            tenantId: true,
          },
        },
        // Include user roles
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
    });

    // Transform the data to match frontend expectations
    return users.map(user => {
      // Get the first role name, or fallback to admin/user based on isSuperAdmin
      const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                         (user.isSuperAdmin ? 'admin' : 'user');
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        isActive: true, // Default to active since schema doesn't have isActive field
        createdAt: user.createdAt.toISOString(),
        lastLogin: null, // You may want to track this in your schema
        tenantCount: user.permissions.length,
      };
    });
  }

  async findOne(id: string) {
    const user = await this.masterPrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
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
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Get the first role name, or fallback to admin/user based on isSuperAdmin
    const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                       (user.isSuperAdmin ? 'admin' : 'user');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole,
      isActive: true, // Default to active since schema doesn't have isActive field
      createdAt: user.createdAt.toISOString(),
      lastLogin: null,
      tenantCount: user.permissions.length,
    };
  }

  async update(id: string, updatePlatformUserDto: UpdatePlatformUserDto) {
    const { password, ...updateData } = updatePlatformUserDto;

    // Check if user exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If email is being updated, check for conflicts
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailConflict = await this.masterPrisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailConflict) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Prepare update data
    const dataToUpdate: Record<string, any> = { ...updateData };

    // Hash new password if provided
    if (password) {
      const saltRounds = 10;
      dataToUpdate.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Handle role changes
    if (updateData.role) {
      // Update isSuperAdmin based on role
      dataToUpdate.isSuperAdmin = updateData.role?.toLowerCase() === 'administrator' || updateData.role?.toLowerCase() === 'super admin';
      
      // Remove existing user roles
      await this.masterPrisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Find and assign new role
      const dbRole = await this.masterPrisma.role.findFirst({
        where: { 
          name: { 
            equals: updateData.role,
            mode: 'insensitive'
          }
        }
      });

      if (dbRole) {
        await this.masterPrisma.userRole.create({
          data: {
            userId: id,
            roleId: dbRole.id,
          },
        });
      }

      delete dataToUpdate.role; // Remove role from update data as it's not a db field
    }

    // Remove isActive from update data as it's not in the schema
    delete dataToUpdate.isActive;

    // Update the user
    const updatedUser = await this.masterPrisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
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
    });

    // Get the first role name, or fallback to admin/user based on isSuperAdmin
    const primaryRole = updatedUser.userRoles[0]?.role?.name?.toLowerCase() || 
                       (updatedUser.isSuperAdmin ? 'admin' : 'user');

    this.logger.log(`Updated platform user: ${updatedUser.email}`);
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: primaryRole,
      isActive: true, // Default to active since schema doesn't have isActive field
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: null,
      tenantCount: updatedUser.permissions.length,
    };
  }

  async remove(id: string) {
    // Check if user exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete the user (this will cascade delete permissions due to foreign key constraints)
    await this.masterPrisma.user.delete({
      where: { id },
    });

    this.logger.log(`Deleted platform user: ${existingUser.email}`);
    return { message: 'User deleted successfully' };
  }

  async findWithComplexQuery(query: GetPlatformUsersQueryDto) {
    const { search, sortField = 'createdAt', sortDirection = 'desc', ...queryOptions } = query;

    this.logger.log(`Platform Users Query - Page: ${queryOptions.page || 1}, Limit: ${queryOptions.limit || 10}, Search: ${search || 'none'}`);
    
    // Use shared utilities for query building
    const fieldMappings = this.getFieldMappings();
    const whereClause = QueryBuilderUtils.buildWhereClause(queryOptions.complexFilter, fieldMappings);
    const orderBy = QueryBuilderUtils.buildOrderBy({ field: sortField, direction: sortDirection as 'asc' | 'desc' });
    const pagination = QueryBuilderUtils.buildPagination(queryOptions.page, queryOptions.limit);

    // Handle global search separately
    let finalWhere = whereClause;
    if (search) {
      const searchWhere = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };

      if (Object.keys(whereClause).length > 0) {
        finalWhere = { AND: [searchWhere, whereClause] };
      } else {
        finalWhere = searchWhere;
      }
    }

    this.logger.log(`Platform Users Query - Where: ${JSON.stringify(finalWhere, null, 2)}`);
    this.logger.log(`Platform Users Query - OrderBy: ${JSON.stringify(orderBy, null, 2)}`);

    // Execute queries in parallel
    const [users, totalCount] = await Promise.all([
      this.masterPrisma.user.findMany({
        where: finalWhere,
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
          createdAt: true,
          updatedAt: true,
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
        orderBy,
        ...pagination,
      }),
      this.masterPrisma.user.count({ where: finalWhere })
    ]);

    // Transform the data to match frontend expectations
    const transformedUsers = users.map(user => {
      const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                         (user.isSuperAdmin ? 'admin' : 'user');
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        isActive: true, // Default to active since schema doesn't have isActive field
        createdAt: user.createdAt.toISOString(),
        lastLogin: null,
        tenantCount: user.permissions.length,
      };
    });

    this.logger.log(`Platform Users Query - Found ${transformedUsers.length} users out of ${totalCount} total`);

    // Use shared utility for response formatting
    const response = QueryBuilderUtils.formatResponse(transformedUsers, totalCount, queryOptions);
    
    // Adjust response format to match expected structure
    return {
      data: response.data,
      pagination: {
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalCount: response.pagination.total,
        totalPages: response.pagination.totalPages,
        hasNextPage: response.pagination.hasNext,
        hasPreviousPage: response.pagination.hasPrev,
      },
    };
  }

  /**
   * Get field mappings for platform user entity
   */
  private getFieldMappings(): Record<string, FieldMapping> {
    return {
      name: {
        type: 'string',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'not_contains', 'not_equals', 'is_empty', 'is_not_empty']
      },
      email: {
        type: 'string',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'not_contains', 'not_equals', 'is_empty', 'is_not_empty']
      },
      role: {
        type: 'string',
        operators: ['equals', 'not_equals', 'contains', 'in', 'not_in'],
        relation: {
          model: 'UserRole',
          field: 'role.name'
        }
      },
      isSuperAdmin: {
        type: 'boolean',
        operators: ['equals', 'not_equals']
      },
      isActive: {
        type: 'boolean',
        operators: ['equals', 'not_equals']
      },
      tenantCount: {
        type: 'number',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal']
      },
      createdAt: {
        type: 'date',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_empty', 'is_not_empty', 'date_preset']
      },
      updatedAt: {
        type: 'date',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_empty', 'is_not_empty', 'date_preset']
      }
    };
  }

  private buildWhereFromComplexFilter(complexFilter: any): Record<string, any> {
    if (!complexFilter || !complexFilter.rootGroup) return {};

    const { rootGroup } = complexFilter;
    const { operator = 'AND', rules = [] } = rootGroup;

    if (rules.length === 0) return {};

    const conditions = rules
      .map((rule: any) => this.buildConditionFromRule(rule))
      .filter(Boolean);

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];

    return {
      [operator]: conditions
    };
  }

  private buildConditionFromRule(rule: any): Record<string, any> | null {
    const { field, operator, value } = rule;

    if (!field || !operator) return null;

    // Handle different field types
    switch (field) {
      case 'name':
      case 'email':
        return this.buildStringCondition(field, operator, value);
      
      case 'role':
        return this.buildRoleCondition(operator, value);
      
      case 'isActive':
        return this.buildBooleanCondition(field, operator, value);
      
      case 'tenantCount':
        return this.buildTenantCountCondition(operator, value);
      
      case 'createdAt':
      case 'updatedAt':
        return this.buildDateCondition(field, operator, value);
      
      default:
        this.logger.warn(`Unknown field in filter: ${field}`);
        return null;
    }
  }

  private buildStringCondition(field: string, operator: string, value: unknown): Record<string, unknown> | null {
    if (!value && !['is_empty', 'is_not_empty'].includes(operator)) return null;

    // Handle pipe operator for OR conditions (e.g., "user1|user2|user3")
    if (typeof value === 'string' && value.includes('|') && ['contains', 'equals', 'starts_with', 'ends_with'].includes(operator)) {
      const values = value.split('|').map(v => v.trim()).filter(v => v.length > 0);
      if (values.length > 1) {
        this.logger.log(`🔄 Pipe operator detected: Converting "${value}" to OR conditions for ${field}`);
        
        const orConditions = values.map(val => {
          switch (operator) {
            case 'equals':
              return { [field]: { equals: val, mode: 'insensitive' } };
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
        return { [field]: { equals: value, mode: 'insensitive' } };
      case 'not_equals':
        return { [field]: { not: { equals: value, mode: 'insensitive' } } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'not_contains':
        return { [field]: { not: { contains: value, mode: 'insensitive' } } };
      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'ends_with':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      case 'is_empty':
        return { OR: [{ [field]: null }, { [field]: '' }] };
      case 'is_not_empty':
        return { AND: [{ [field]: { not: null } }, { [field]: { not: '' } }] };
      default:
        return null;
    }
  }

  private buildRoleCondition(operator: string, value: any): Record<string, any> | null {
    if (!value && !['is_empty', 'is_not_empty'].includes(operator)) return null;

    switch (operator) {
      case 'equals':
        return {
          userRoles: {
            some: {
              role: {
                name: { equals: value, mode: 'insensitive' }
              }
            }
          }
        };
      case 'not_equals':
        return {
          NOT: {
            userRoles: {
              some: {
                role: {
                  name: { equals: value, mode: 'insensitive' }
                }
              }
            }
          }
        };
      case 'contains':
        return {
          userRoles: {
            some: {
              role: {
                name: { contains: value, mode: 'insensitive' }
              }
            }
          }
        };
      case 'in': {
        const roles = Array.isArray(value) ? value : [value];
        return {
          userRoles: {
            some: {
              role: {
                name: { in: roles }
              }
            }
          }
        };
      }
      case 'not_in': {
        const notRoles = Array.isArray(value) ? value : [value];
        return {
          NOT: {
            userRoles: {
              some: {
                role: {
                  name: { in: notRoles }
                }
              }
            }
          }
        };
      }
      default:
        return null;
    }
  }

  private buildBooleanCondition(field: string, operator: string, value: any): any {
    // Note: isActive is not in the schema, so this is a placeholder
    // In a real implementation, you'd need to add this field to the schema
    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'not_equals':
        return { [field]: { not: value } };
      default:
        return null;
    }
  }

  private buildTenantCountCondition(operator: string, value: any): any {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return null;

    switch (operator) {
      case 'equals':
        return {
          permissions: {
            _count: {
              equals: numValue
            }
          }
        };
      case 'not_equals':
        return {
          permissions: {
            _count: {
              not: numValue
            }
          }
        };
      case 'greater_than':
        return {
          permissions: {
            _count: {
              gt: numValue
            }
          }
        };
      case 'greater_than_or_equal':
        return {
          permissions: {
            _count: {
              gte: numValue
            }
          }
        };
      case 'less_than':
        return {
          permissions: {
            _count: {
              lt: numValue
            }
          }
        };
      case 'less_than_or_equal':
        return {
          permissions: {
            _count: {
              lte: numValue
            }
          }
        };
      default:
        return null;
    }
  }

  private buildDateCondition(field: string, operator: string, value: any): any {
    if (!value && !['is_empty', 'is_not_empty'].includes(operator)) return null;

    let dateValue: Date;
    
    if (typeof value === 'string') {
      dateValue = new Date(value);
    } else if (value instanceof Date) {
      dateValue = value;
    } else {
      return null;
    }

    if (isNaN(dateValue.getTime())) return null;

    switch (operator) {
      case 'equals': {
        // For date equality, we'll use a range for the entire day
        const startOfDay = new Date(dateValue);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateValue);
        endOfDay.setHours(23, 59, 59, 999);
        return {
          [field]: {
            gte: startOfDay,
            lte: endOfDay
          }
        };
      }
      case 'not_equals': {
        const notStartOfDay = new Date(dateValue);
        notStartOfDay.setHours(0, 0, 0, 0);
        const notEndOfDay = new Date(dateValue);
        notEndOfDay.setHours(23, 59, 59, 999);
        return {
          NOT: {
            [field]: {
              gte: notStartOfDay,
              lte: notEndOfDay
            }
          }
        };
      }
      case 'greater_than':
        return { [field]: { gt: dateValue } };
      case 'greater_than_or_equal':
        return { [field]: { gte: dateValue } };
      case 'less_than':
        return { [field]: { lt: dateValue } };
      case 'less_than_or_equal':
        return { [field]: { lte: dateValue } };
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          const [start, end] = value.map(v => new Date(v));
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return {
              [field]: {
                gte: start,
                lte: end
              }
            };
          }
        }
        return null;
      case 'preset':
        return this.buildDatePresetCondition(field, typeof value === 'string' ? value : value.toString());
      case 'is_empty':
        return { [field]: null };
      case 'is_not_empty':
        return { [field]: { not: null } };
      default:
        return null;
    }
  }

  private buildDatePresetCondition(field: string, preset: string): any {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (preset) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_7_days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_30_days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      default:
        return null;
    }

    return {
      [field]: {
        gte: startDate,
        lte: endDate
      }
    };
  }
} 