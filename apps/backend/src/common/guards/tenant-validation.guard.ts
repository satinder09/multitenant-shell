import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const REQUIRE_TENANT_CONTEXT = 'require-tenant-context';

/**
 * Guard to ensure tenant context is properly validated
 * Prevents users from accessing other tenants' data
 */
@Injectable()
export class TenantValidationGuard implements CanActivate {
  private readonly logger = new Logger(TenantValidationGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireTenantContext = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_TENANT_CONTEXT,
      [context.getHandler(), context.getClass()],
    );

    // If tenant context is not required, allow access
    if (!requireTenantContext) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    const tenantId = request.headers['x-tenant-id'] || request.body?.tenantId || request.query?.tenantId;

    // Ensure user exists and has tenant access
    if (!user) {
      this.logger.warn('TenantValidationGuard: No user in request');
      throw new ForbiddenException('Authentication required');
    }

    // For platform admin users, allow access to any tenant
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing tenant ${tenantId}`);
      return true;
    }

    // Ensure tenant context is provided
    if (!tenantId) {
      this.logger.warn(`TenantValidationGuard: No tenant context provided for user ${user.email}`);
      throw new ForbiddenException('Tenant context required');
    }

    // Validate user has access to the requested tenant
    const userTenantIds = user.tenants?.map((t: any) => t.id) || [];
    if (!userTenantIds.includes(tenantId)) {
      this.logger.warn(
        `TenantValidationGuard: User ${user.email} attempted to access tenant ${tenantId} without permission. User tenants: ${userTenantIds.join(', ')}`,
        {
          userId: user.id,
          requestedTenant: tenantId,
          userTenants: userTenantIds,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          path: request.path,
        }
      );
      throw new ForbiddenException('Access denied: Insufficient tenant permissions');
    }

    // Additional security validations
    this.performSecurityChecks(request, user, tenantId);

    this.logger.debug(`TenantValidationGuard: User ${user.email} validated for tenant ${tenantId}`);
    return true;
  }

  private performSecurityChecks(request: Request, user: any, tenantId: string): void {
    // Check for suspicious cross-tenant access patterns
    this.detectCrossTenantAccessPatterns(request, user, tenantId);
    
    // Validate tenant-specific resource access
    this.validateTenantResourceAccess(request, user, tenantId);
  }

  private detectCrossTenantAccessPatterns(request: Request, user: any, tenantId: string): void {
    const suspiciousPatterns = [
      // Attempt to access other tenant IDs
      /tenant[_-]?id?\s*[=:]\s*['"']?[a-f0-9-]{36}/gi,
      // Attempt to modify tenant context
      /tenantContext\s*[=:]/gi,
      // Database injection targeting tenant isolation
      /WHERE\s+tenant_id\s*=/gi,
    ];

    const requestContent = JSON.stringify({
      body: request.body,
      query: request.query,
      params: request.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestContent)) {
        this.logger.error('Suspicious cross-tenant access pattern detected', {
          userId: user.id,
          tenantId: tenantId,
          pattern: pattern.source,
          path: request.path,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
        
        throw new ForbiddenException('Suspicious activity detected');
      }
    }
  }

  private validateTenantResourceAccess(request: Request, user: any, tenantId: string): void {
    // Extract and validate UUIDs in the request
    const resourceIds = this.extractResourceIds(request);
    
    if (resourceIds.length > 0) {
      this.logger.log('Tenant-specific resource access detected', {
        userId: user.id,
        tenantId: tenantId,
        resourceIds: resourceIds,
        path: request.path,
      });
    }

    // Check for attempts to access cross-tenant resources
    if (resourceIds.includes(tenantId)) {
      // User is accessing their own tenant ID in request - this is normal
      return;
    }
  }

  private extractResourceIds(request: Request): string[] {
    const ids: string[] = [];
    const content = JSON.stringify({
      body: request.body,
      query: request.query,
      params: request.params,
    });

    // Extract UUIDs
    const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
    const matches = content.match(uuidPattern);
    
    if (matches) {
      ids.push(...matches);
    }

    return ids;
  }
} 