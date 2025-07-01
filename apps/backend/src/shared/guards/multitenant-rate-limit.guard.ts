import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { MultitenantRateLimitService } from '../services/multitenant-rate-limit.service';
import { MULTITENANT_RATE_LIMIT_KEY, MultitenantRateLimitOptions } from '../decorators/multitenant-rate-limit.decorator';
import { TenantContext } from '../types/tenant-context';

@Injectable()
export class MultitenantRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(MultitenantRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: MultitenantRateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<MultitenantRateLimitOptions>(
      MULTITENANT_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Skip if no rate limiting configured
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { tenant?: TenantContext; user?: any }>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      const requestContext = this.analyzeRequest(request);
      const rateLimitChecks = this.buildRateLimitChecks(requestContext, options);

      // Apply rate limit checks in order (most restrictive first)
      for (const check of rateLimitChecks) {
        const result = await this.rateLimitService.checkRateLimit(check.key, {
          windowMs: check.windowMs,
          maxRequests: check.maxRequests,
          keyPrefix: check.keyPrefix,
        });

        if (!result.allowed) {
          this.logRateLimitExceeded(requestContext, check);
          this.setRateLimitHeaders(response, result);

          // Call custom handler if provided
          if (options.onRateLimitExceeded) {
            options.onRateLimitExceeded(requestContext);
          }

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: options.customMessage || check.message || 'Rate limit exceeded',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
              rateLimitLevel: check.level,
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }

        // Set informational headers for successful requests
        this.setRateLimitHeaders(response, result, check);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Rate limiting guard error', error);
      return true; // Don't block on guard errors
    }
  }

  private analyzeRequest(request: Request & { tenant?: TenantContext; user?: any }) {
    const ip = this.getClientIp(request);
    const tenant = request.tenant;
    const user = request.user;

    return {
      ip,
      tenant,
      user,
      path: request.path,
      method: request.method,
      userAgent: request.get('user-agent') || 'unknown',
    };
  }

  private buildRateLimitChecks(context: any, options: MultitenantRateLimitOptions) {
    const checks = [];

    // 1. Platform-level rate limiting
    if (!options.skipPlatformLimit && options.platformMaxRequests) {
      checks.push({
        key: `${context.ip}:${context.path}`,
        keyPrefix: 'platform',
        windowMs: options.platformWindowMs || 15 * 60 * 1000,
        maxRequests: options.platformMaxRequests,
        level: 'platform',
        message: 'Platform rate limit exceeded',
      });
    }

    // 2. Tenant-level rate limiting
    if (!options.skipTenantLimit && context.tenant && options.tenantMaxRequests) {
      checks.push({
        key: `${context.tenant.id}:${context.path}`,
        keyPrefix: 'tenant',
        windowMs: options.tenantWindowMs || 15 * 60 * 1000,
        maxRequests: options.tenantMaxRequests,
        level: 'tenant',
        message: 'Tenant rate limit exceeded',
      });
    }

    // 3. User-level rate limiting
    if (!options.skipUserLimit && context.user && options.userMaxRequests) {
      if (context.user.isSuperAdmin) {
        // Super admin gets elevated limits
        checks.push({
          key: `admin:${context.user.id}:${context.path}`,
          keyPrefix: 'platform',
          windowMs: options.userWindowMs || 15 * 60 * 1000,
          maxRequests: options.userMaxRequests * 10, // 10x limit for super admins
          level: 'super-admin',
          message: 'Super admin rate limit exceeded',
        });
      } else if (context.tenant) {
        // Regular user within tenant
        checks.push({
          key: `${context.tenant.id}:user:${context.user.id}:${context.path}`,
          keyPrefix: 'tenant',
          windowMs: options.userWindowMs || 15 * 60 * 1000,
          maxRequests: options.userMaxRequests,
          level: 'user',  
          message: 'User rate limit exceeded',
        });
      }
    }

    return checks;
  }

  private setRateLimitHeaders(response: Response, result: any, check?: any) {
    if (check) {
      response.set(`X-RateLimit-${check.level}-Limit`, check.maxRequests.toString());
      response.set(`X-RateLimit-${check.level}-Remaining`, result.remaining.toString());
      response.set(`X-RateLimit-${check.level}-Reset`, new Date(result.resetTime).toISOString());
    }

    if (!result.allowed) {
      response.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
    }
  }

  private logRateLimitExceeded(context: any, check: any) {
    this.logger.warn('Multitenant rate limit exceeded', {
      level: check.level,
      key: check.key,
      keyPrefix: check.keyPrefix,
      ip: context.ip,
      path: context.path,
      method: context.method,
      tenant: context.tenant?.id,
      user: context.user?.id,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  private getClientIp(request: Request): string {
    return (
      request.get('x-forwarded-for')?.split(',')[0] ||
      request.get('x-real-ip') ||
      request.ip ||
      (request as any).connection?.remoteAddress ||
      'unknown'
    );
  }
} 