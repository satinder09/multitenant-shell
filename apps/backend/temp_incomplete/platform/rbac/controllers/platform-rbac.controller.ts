import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MasterDatabaseService } from '../../database/master/master-database.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { CreatePermissionDto } from '../dto/create-permission.dto';

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