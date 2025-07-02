import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MasterDatabaseService } from '../../../database/master/master-database.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { SearchRolesDto } from '../dto/search-roles.dto';

@Controller('platform-rbac')
@UseGuards(JwtAuthGuard)
export class PlatformRbacController {
  constructor(private readonly masterPrisma: MasterDatabaseService) {}

  // Role Management
  @Get('roles')
  async getRoles() {
    return this.masterPrisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true }
        },
        userRoles: {
          include: { user: true }
        }
      }
    });
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    const { permissionIds, ...roleData } = dto;
    
    const role = await this.masterPrisma.role.create({
      data: {
        ...roleData,
        ...(permissionIds && permissionIds.length > 0 && {
          rolePermissions: {
            create: permissionIds.map(permissionId => ({
              permissionId
            }))
          }
        })
      },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
    
    return role;
  }

  @Get('roles/:id')
  async getRoleById(@Param('id') id: string) {
    return this.masterPrisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true }
        },
        userRoles: {
          include: { user: true }
        }
      }
    });
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const { permissionIds, ...roleData } = dto;
    
    // If permissionIds are provided, update the role permissions
    if (permissionIds !== undefined) {
      // Delete existing role permissions
      await this.masterPrisma.rolePermission.deleteMany({
        where: { roleId: id }
      });
      
      // Create new role permissions
      if (permissionIds.length > 0) {
        await this.masterPrisma.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId: id,
            permissionId
          }))
        });
      }
    }
    
    // Update the role itself
    const role = await this.masterPrisma.role.update({
      where: { id },
      data: roleData,
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
    
    return role;
  }

  @Post('roles/search')
  async searchRoles(@Body() searchDto: SearchRolesDto) {
    const { page = 1, limit = 10, sort, complexFilter } = searchDto;
    
    // Build where clause based on complex filter
    let whereClause: any = {};
    
    if (complexFilter?.rootGroup?.rules) {
      whereClause = this.buildWhereClause(complexFilter.rootGroup);
    }
    
    // Build order by clause
    let orderBy: any = {};
    if (sort?.field && sort?.direction) {
      if (sort.field === 'permissionCount') {
        orderBy = { rolePermissions: { _count: sort.direction } };
      } else if (sort.field === 'userCount') {
        orderBy = { userRoles: { _count: sort.direction } };
      } else if (sort.field === 'createdAt' || sort.field === 'updatedAt') {
        // These fields don't exist in Role model, default to name
        orderBy = { name: sort.direction };
      } else {
        orderBy = { [sort.field]: sort.direction };
      }
    } else {
      // Default to ordering by name since createdAt doesn't exist
      orderBy = { name: 'asc' };
    }
    
    // Execute query with pagination
    const [roles, total] = await Promise.all([
      this.masterPrisma.role.findMany({
        where: whereClause,
        include: {
          rolePermissions: {
            include: { permission: true }
          },
          userRoles: {
            include: { user: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.masterPrisma.role.count({ where: whereClause })
    ]);
    
    // Add computed fields
    const enrichedRoles = roles.map(role => ({
      ...role,
      permissionCount: role.rolePermissions?.length || 0,
      userCount: role.userRoles?.length || 0,
    }));
    
    return {
      data: enrichedRoles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  private buildWhereClause(group: any): any {
    const { logic, rules, groups } = group;
    
    const ruleConditions = rules.map((rule: any) => {
      const { field, operator, value } = rule;
      
      switch (operator) {
        case 'contains':
          return { [field]: { contains: value, mode: 'insensitive' } };
        case 'equals':
          return { [field]: { equals: value } };
        case 'not_equals':
          return { [field]: { not: value } };
        case 'greater_than':
          return { [field]: { gt: value } };
        case 'less_than':
          return { [field]: { lt: value } };
        case 'between':
          return { [field]: { gte: value[0], lte: value[1] } };
        default:
          return {};
      }
    });
    
    const groupConditions = groups.map((subGroup: any) => this.buildWhereClause(subGroup));
    
    const allConditions = [...ruleConditions, ...groupConditions].filter(condition => Object.keys(condition).length > 0);
    
    if (allConditions.length === 0) return {};
    
    if (logic === 'AND') {
      return { AND: allConditions };
    } else {
      return { OR: allConditions };
    }
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string) {
    // Delete role permissions first (cascade)
    await this.masterPrisma.rolePermission.deleteMany({
      where: { roleId: id }
    });
    
    // Delete user roles
    await this.masterPrisma.userRole.deleteMany({
      where: { roleId: id }
    });
    
    // Delete the role
    await this.masterPrisma.role.delete({
      where: { id }
    });
  }

  // Permission Management
  @Get('permissions')
  async getPermissions() {
    return this.masterPrisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    });
  }

  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.masterPrisma.permission.create({
      data: dto
    });
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id') id: string) {
    // Delete role permissions first
    await this.masterPrisma.rolePermission.deleteMany({
      where: { permissionId: id }
    });
    
    // Delete the permission
    await this.masterPrisma.permission.delete({
      where: { id }
    });
  }
} 