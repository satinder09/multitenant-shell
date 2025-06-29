import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from './services/rbac.service';

export interface RequiredPermissions {
  permissions?: string[];
  requireAll?: boolean;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<RequiredPermissions>(
      'permissions',
      context.getHandler(),
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || !requiredPermissions.permissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { permissions, requireAll = false } = requiredPermissions;

    if (requireAll) {
      const hasAllPermissions = await this.rbacService.hasAllPermissions(
        user.sub,
        permissions,
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `User does not have all required permissions: ${permissions.join(', ')}`,
        );
      }
    } else {
      const hasAnyPermission = await this.rbacService.hasAnyPermission(
        user.sub,
        permissions,
      );
      if (!hasAnyPermission) {
        throw new ForbiddenException(
          `User does not have any of the required permissions: ${permissions.join(', ')}`,
        );
      }
    }

    return true;
  }
} 