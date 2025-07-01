import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from './jwt-auth.guard';

// Authorization metadata keys
export const REQUIRE_ROLES_KEY = 'requireRoles';
export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const REQUIRE_SUPER_ADMIN_KEY = 'requireSuperAdmin';

// Authorization configuration interfaces
export interface RoleConfig {
  roles: string[];
  requireAll?: boolean;
}

export interface PermissionConfig {
  permissions: string[];
  requireAll?: boolean;
}

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Check super admin requirements
      await this.validateSuperAdminAccess(context, user);

      // Check role requirements
      await this.validateRoles(context, user);

      // Check permission requirements
      await this.validatePermissions(context, user);

      return true;
    } catch (error) {
      this.logAuthorizationFailure(request, user, error);
      throw error;
    }
  }

  private async validateSuperAdminAccess(context: ExecutionContext, user: AuthenticatedUser): Promise<void> {
    const requireSuperAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requireSuperAdmin && !user.isSuperAdmin) {
      this.logger.warn(`Super admin access denied for user ${user.email}`, {
        userId: user.id,
        path: context.switchToHttp().getRequest().path,
      });
      throw new ForbiddenException('Super admin access required');
    }
  }

  private async validateRoles(context: ExecutionContext, user: AuthenticatedUser): Promise<void> {
    const roleConfig = this.reflector.getAllAndOverride<RoleConfig | string[]>(REQUIRE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roleConfig) {
      return;
    }

    // Handle both legacy string array and new config object
    const roles = Array.isArray(roleConfig) ? roleConfig : roleConfig.roles;
    const requireAll = Array.isArray(roleConfig) ? false : roleConfig.requireAll || false;

    if (!roles || roles.length === 0) {
      return;
    }

    const userRoles = user.roles || [];
    let hasAccess = false;

    if (requireAll) {
      // User must have ALL required roles
      hasAccess = roles.every(role => userRoles.includes(role));
    } else {
      // User must have at least ONE required role
      hasAccess = roles.some(role => userRoles.includes(role));
    }

    if (!hasAccess) {
      this.logger.warn(`Role-based access denied for user ${user.email}`, {
        userId: user.id,
        requiredRoles: roles,
        userRoles,
        requireAll,
        path: context.switchToHttp().getRequest().path,
      });

      const errorMessage = requireAll 
        ? `Access denied: All required roles needed: ${roles.join(', ')}`
        : `Access denied: One of required roles needed: ${roles.join(', ')}`;
      
      throw new ForbiddenException(errorMessage);
    }
  }

  private async validatePermissions(context: ExecutionContext, user: AuthenticatedUser): Promise<void> {
    const permissionConfig = this.reflector.getAllAndOverride<PermissionConfig | string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissionConfig) {
      return;
    }

    // Handle both legacy string array and new config object
    const permissions = Array.isArray(permissionConfig) ? permissionConfig : permissionConfig.permissions;
    const requireAll = Array.isArray(permissionConfig) ? true : permissionConfig.requireAll || true; // Default to requireAll for permissions

    if (!permissions || permissions.length === 0) {
      return;
    }

    const userPermissions = user.permissions || [];
    let hasAccess = false;

    if (requireAll) {
      // User must have ALL required permissions
      hasAccess = permissions.every(permission => userPermissions.includes(permission));
    } else {
      // User must have at least ONE required permission
      hasAccess = permissions.some(permission => userPermissions.includes(permission));
    }

    if (!hasAccess) {
      this.logger.warn(`Permission-based access denied for user ${user.email}`, {
        userId: user.id,
        requiredPermissions: permissions,
        userPermissions,
        requireAll,
        path: context.switchToHttp().getRequest().path,
      });

      const errorMessage = requireAll 
        ? `Access denied: All required permissions needed: ${permissions.join(', ')}`
        : `Access denied: One of required permissions needed: ${permissions.join(', ')}`;
      
      throw new ForbiddenException(errorMessage);
    }
  }

  private logAuthorizationFailure(request: Request, user: AuthenticatedUser, error: any): void {
    this.logger.warn('Authorization failed', {
      userId: user.id,
      email: user.email,
      path: request.path,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
} 