import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { TenantPrismaService } from '../prisma-tenant/tenant-prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable({ scope: Scope.REQUEST })
export class RbacService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    @Inject(REQUEST) private readonly request: Request
  ) {}

  private checkTenantContext() {
    console.log('[RBAC] checkTenantContext called');
    
    try {
      // This will throw an error if no tenant context is available
      const db = this.tenantPrisma.db;
      console.log('[RBAC] Tenant context is available, proceeding');
      return; // Tenant context is available, all good
    } catch (error) {
      console.log('[RBAC] No tenant context available, checking user privileges');
      
      // No tenant context available, check if user has super admin privileges
      const user = (this.request as any).user;
      const tenant = (this.request as any).tenant;
      
      console.log('[RBAC] User:', user ? { email: user.email, isSuperAdmin: user.isSuperAdmin, accessType: user.accessType } : 'null');
      console.log('[RBAC] Tenant:', tenant ? { id: tenant.id } : 'null');
      
      if (user && user.isSuperAdmin && tenant) {
        // Super admin accessing from a tenant subdomain
        // The middleware has detected the tenant context, but the JWT doesn't have tenantContext
        // This is allowed for super admins - they can access any tenant's resources
        console.log(`[RBAC] Super admin ${user.email} accessing tenant ${tenant.id} resources - ALLOWING ACCESS`);
        return; // Allow super admin access
      }
      
      if (user && (user.accessType === 'secure_login' || user.accessType === 'impersonation')) {
        // User is in a secure login or impersonation session but tenant context is missing
        console.log('[RBAC] Secure login or impersonation session but no tenant context');
        throw new BadRequestException(
          'Secure login or impersonation session detected but tenant context is missing. Please try logging in again.'
        );
      }
      
      if (user && user.isSuperAdmin && !tenant) {
        // Super admin on platform domain trying to access tenant resources
        console.log('[RBAC] Super admin on platform domain');
        throw new BadRequestException(
          'Super admin detected. Please use "Secure Login" or "Impersonation" from the platform tenant management, or access the tenant directly from its subdomain.'
        );
      }
      
      // Regular user without tenant context
      console.log('[RBAC] Regular user without tenant context');
      throw new BadRequestException(
        'RBAC operations require a tenant context. Please access this endpoint from a tenant subdomain (e.g., tenant1.localhost:3000) rather than the root domain.'
      );
    }
  }

  // Role Management
  async createRole(dto: CreateRoleDto) {
    this.checkTenantContext();
    
    try {
      const role = await this.tenantPrisma.db.role.create({
        data: {
          name: dto.name,
          rolePermissions: dto.permissionIds ? {
            create: dto.permissionIds.map(permissionId => ({
              permissionId
            }))
          } : undefined
        },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });

      return role;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Role with this name already exists');
      }
      throw error;
    }
  }

  async findAllRoles() {
    this.checkTenantContext();
    
    return this.tenantPrisma.db.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async findRoleById(id: string) {
    this.checkTenantContext();
    
    const role = await this.tenantPrisma.db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: true
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    this.checkTenantContext();
    
    try {
      // First, remove existing permissions if new ones are provided
      if (dto.permissionIds !== undefined) {
        await this.tenantPrisma.db.rolePermission.deleteMany({
          where: { roleId: id }
        });
      }

      const role = await this.tenantPrisma.db.role.update({
        where: { id },
        data: {
          name: dto.name,
          rolePermissions: dto.permissionIds ? {
            create: dto.permissionIds.map(permissionId => ({
              permissionId
            }))
          } : undefined
        },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });

      return role;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Role with this name already exists');
      }
      throw error;
    }
  }

  async deleteRole(id: string) {
    this.checkTenantContext();
    
    const role = await this.findRoleById(id);
    
    // Check if role is assigned to any users
    if (role.userRoles.length > 0) {
      throw new ConflictException('Cannot delete role that is assigned to users');
    }

    await this.tenantPrisma.db.role.delete({
      where: { id }
    });

    return { message: 'Role deleted successfully' };
  }

  // Permission Management
  async createPermission(dto: CreatePermissionDto) {
    this.checkTenantContext();
    
    try {
      return await this.tenantPrisma.db.permission.create({
        data: dto
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Permission with this name already exists');
      }
      throw error;
    }
  }

  async findAllPermissions() {
    this.checkTenantContext();
    
    return this.tenantPrisma.db.permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async findPermissionById(id: string) {
    this.checkTenantContext();
    
    const permission = await this.tenantPrisma.db.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: true
          }
        }
      }
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async deletePermission(id: string) {
    this.checkTenantContext();
    
    const permission = await this.findPermissionById(id);
    
    // Check if permission is assigned to any roles
    if (permission.rolePermissions.length > 0) {
      throw new ConflictException('Cannot delete permission that is assigned to roles');
    }

    await this.tenantPrisma.db.permission.delete({
      where: { id }
    });

    return { message: 'Permission deleted successfully' };
  }

  // User Role Assignment
  async assignRolesToUser(dto: AssignRoleDto) {
    this.checkTenantContext();
    
    // First, remove existing role assignments
    await this.tenantPrisma.db.userRole.deleteMany({
      where: { userId: dto.userId }
    });

    // Then assign new roles
    const userRoles = await this.tenantPrisma.db.userRole.createMany({
      data: dto.roleIds.map(roleId => ({
        userId: dto.userId,
        roleId
      }))
    });

    return { message: 'Roles assigned successfully', count: userRoles.count };
  }

  async getUserRoles(userId: string) {
    this.checkTenantContext();
    
    return this.tenantPrisma.db.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
  }

  async removeUserRoles(userId: string) {
    this.checkTenantContext();
    
    await this.tenantPrisma.db.userRole.deleteMany({
      where: { userId }
    });

    return { message: 'User roles removed successfully' };
  }

  // Helper methods for checking permissions
  async getUserPermissions(userId: string): Promise<string[]> {
    this.checkTenantContext();
    
    const userRoles = await this.getUserRoles(userId);
    
    const permissions = new Set<string>();
    
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return Array.from(permissions);
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    this.checkTenantContext();
    
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permissionName);
  }

  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    this.checkTenantContext();
    
    const userPermissions = await this.getUserPermissions(userId);
    return permissionNames.some(permission => userPermissions.includes(permission));
  }

  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    this.checkTenantContext();
    
    const userPermissions = await this.getUserPermissions(userId);
    return permissionNames.every(permission => userPermissions.includes(permission));
  }
} 