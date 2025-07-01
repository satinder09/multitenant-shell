import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../types/tenant-context';

// Rate limiting configuration per context
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipOnSuccess?: boolean;
  skipOnError?: boolean;
  message?: string;
}

// Rate limiting storage (use Redis in production)
interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// Different rate limit tiers
const RATE_LIMIT_CONFIGS = {
  // Platform-level limits (global system protection)
  PLATFORM_STRICT: { windowMs: 15 * 60 * 1000, maxRequests: 100, message: 'Platform rate limit exceeded' },
  PLATFORM_NORMAL: { windowMs: 15 * 60 * 1000, maxRequests: 1000, message: 'Platform rate limit exceeded' },
  
  // Tenant-level limits (per tenant quotas)
  TENANT_AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 50, message: 'Tenant authentication rate limit exceeded' },
  TENANT_API: { windowMs: 15 * 60 * 1000, maxRequests: 500, message: 'Tenant API rate limit exceeded' },
  TENANT_ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 200, message: 'Tenant admin rate limit exceeded' },
  
  // User-level limits (per user within tenant)
  USER_AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'User authentication rate limit exceeded' },
  USER_API: { windowMs: 15 * 60 * 1000, maxRequests: 100, message: 'User API rate limit exceeded' },
  USER_ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 50, message: 'User admin rate limit exceeded' },
  
  // Super admin limits (elevated for platform operations)
  SUPER_ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 2000, message: 'Super admin rate limit exceeded' },
};

// Endpoint categories for different rate limiting
enum EndpointCategory {
  AUTH = 'auth',
  API = 'api',
  ADMIN = 'admin',
  PUBLIC = 'public',
}

@Injectable()
export class MultitenantRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MultitenantRateLimitMiddleware.name);
  private readonly store = new Map<string, RateLimitRecord>();
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get('RATE_LIMITING_ENABLED', 'true') === 'true';
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async use(req: Request & { tenant?: TenantContext; user?: any }, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    try {
      const context = this.analyzeRequestContext(req);
      const rateLimitChecks = this.buildRateLimitChecks(context);

      // Apply all rate limit checks in order (most restrictive first)
      for (const check of rateLimitChecks) {
        const result = this.checkRateLimit(check.key, check.config);
        
        if (!result.allowed) {
          this.logRateLimitExceeded(context, check);
          this.setRateLimitHeaders(res, result);
          
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: check.config.message || 'Rate limit exceeded',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }

        // Set informational headers for successful requests
        this.setRateLimitHeaders(res, result, check.config);
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Rate limiting middleware error', error);
      next(); // Don't block on middleware errors
    }
  }

  private analyzeRequestContext(req: Request & { tenant?: TenantContext; user?: any }) {
    const ip = this.getClientIp(req);
    const endpoint = this.categorizeEndpoint(req.path);
    const tenant = req.tenant;
    const user = req.user;
    
    return {
      ip,
      endpoint,
      tenant,
      user,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent') || 'unknown',
    };
  }

  private buildRateLimitChecks(context: any) {
    const checks = [];
    
    // 1. Platform-level protection (always applied)
    if (context.endpoint === EndpointCategory.AUTH) {
      checks.push({
        key: `platform:${context.ip}:auth`,
        config: RATE_LIMIT_CONFIGS.PLATFORM_STRICT,
        level: 'platform-auth',
      });
    } else {
      checks.push({
        key: `platform:${context.ip}:${context.endpoint}`,
        config: RATE_LIMIT_CONFIGS.PLATFORM_NORMAL,
        level: 'platform-general',
      });
    }

    // 2. Tenant-level limits (if in tenant context)
    if (context.tenant) {
      const tenantKey = `tenant:${context.tenant.id}:${context.endpoint}`;
      
      switch (context.endpoint) {
        case EndpointCategory.AUTH:
          checks.push({
            key: tenantKey,
            config: RATE_LIMIT_CONFIGS.TENANT_AUTH,
            level: 'tenant-auth',
          });
          break;
        case EndpointCategory.ADMIN:
          checks.push({
            key: tenantKey,
            config: RATE_LIMIT_CONFIGS.TENANT_ADMIN,
            level: 'tenant-admin',
          });
          break;
        default:
          checks.push({
            key: tenantKey,
            config: RATE_LIMIT_CONFIGS.TENANT_API,
            level: 'tenant-api',
          });
      }
    }

    // 3. User-level limits (if authenticated)
    if (context.user) {
      if (context.user.isSuperAdmin) {
        // Super admin gets elevated limits
        checks.push({
          key: `platform:admin:${context.user.id}:${context.endpoint}`,
          config: RATE_LIMIT_CONFIGS.SUPER_ADMIN,
          level: 'super-admin',
        });
      } else if (context.tenant) {
        // Regular user within tenant
        const userKey = `tenant:${context.tenant.id}:user:${context.user.id}:${context.endpoint}`;
        
        switch (context.endpoint) {
          case EndpointCategory.AUTH:
            checks.push({
              key: userKey,
              config: RATE_LIMIT_CONFIGS.USER_AUTH,
              level: 'user-auth',
            });
            break;
          case EndpointCategory.ADMIN:
            checks.push({
              key: userKey,
              config: RATE_LIMIT_CONFIGS.USER_ADMIN,
              level: 'user-admin',
            });
            break;
          default:
            checks.push({
              key: userKey,
              config: RATE_LIMIT_CONFIGS.USER_API,
              level: 'user-api',
            });
        }
      }
    }

    return checks;
  }

  private categorizeEndpoint(path: string): EndpointCategory {
    if (path.includes('/auth/')) return EndpointCategory.AUTH;
    if (path.includes('/admin/') || path.includes('/platform/')) return EndpointCategory.ADMIN;
    if (path.includes('/api/')) return EndpointCategory.API;
    return EndpointCategory.PUBLIC;
  }

  private checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now >= record.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        lastRequest: now,
      });
      
      return {
        allowed: true,
        resetTime: now + config.windowMs,
        remaining: config.maxRequests - 1,
      };
    }

    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0,
      };
    }

    // Increment counter
    record.count++;
    record.lastRequest = now;
    this.store.set(key, record);

    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: config.maxRequests - record.count,
    };
  }

  private setRateLimitHeaders(res: Response, result: any, config?: RateLimitConfig) {
    if (config) {
      res.set('X-RateLimit-Limit', config.maxRequests.toString());
      res.set('X-RateLimit-Remaining', result.remaining.toString());
      res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    }
    
    if (!result.allowed) {
      res.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
    }
  }

  private logRateLimitExceeded(context: any, check: any) {
    this.logger.warn('Rate limit exceeded', {
      level: check.level,
      key: check.key,
      ip: context.ip,
      path: context.path,
      method: context.method,
      tenant: context.tenant?.id,
      user: context.user?.id,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  private getClientIp(req: Request): string {
    return (
      req.get('x-forwarded-for')?.split(',')[0] ||
      req.get('x-real-ip') ||
      req.ip ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
} 