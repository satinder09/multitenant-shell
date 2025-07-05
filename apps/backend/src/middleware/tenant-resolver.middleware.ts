// apps/backend/src/middleware/tenant-resolver.middleware.ts

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../domains/tenant/services/tenant.service';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../shared/types/tenant-context';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(
    req: Request & { tenant?: TenantContext },
    res: Response,
    next: NextFunction,
  ) {
    console.log(`[TenantResolver] MIDDLEWARE CALLED for ${req.method} ${req.url}`);
    console.log(`[TenantResolver] Headers:`, {
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    });
    
    const rawHost =
      (req.headers['x-forwarded-host'] as string) || (req.headers.host ?? '');
    const hostWithoutPort = rawHost.split(':')[0];
    console.log(`[TenantResolver] Raw host: "${rawHost}" → parsed: "${hostWithoutPort}"`);
    this.logger.debug(
      `Using host header: "${rawHost}" → parsed: "${hostWithoutPort}"`,
    );

    // Check if this is a root domain (master instance)
    if (this.isRootDomain(hostWithoutPort)) {
      this.logger.debug('Root domain detected, skipping tenant resolution.');
      return next();
    }

    // Extract subdomain for tenant resolution
    const subdomain = this.extractSubdomain(hostWithoutPort);
    this.logger.debug(`Detected subdomain: "${subdomain}"`);

    try {
      const { id, databaseUrl } =
        await this.tenantService.resolveTenantForMiddleware(subdomain);
      this.logger.debug(`Tenant found: id=${id}, databaseUrl=${databaseUrl}`);
      console.log(`[TenantResolver] Setting req.tenant = { id: ${id}, databaseUrl: ${databaseUrl} }`);
      req.tenant = { id, databaseUrl };
      next();
    } catch (error: any) {
      this.logger.error(
        `Tenant resolution failed for "${subdomain}": ${error.message}`,
      );
      console.log(`[TenantResolver] ERROR: Failed to resolve tenant for subdomain "${subdomain}": ${error.message}`);
      throw new UnauthorizedException(`Invalid tenant: ${subdomain}`);
    }
  }

  private isRootDomain(hostname: string): boolean {
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const rootDomains = [
      'localhost',
      baseDomain,
      '127.0.0.1',
      '',
    ];
    
    // Check if the hostname exactly matches a root domain
    if (rootDomains.includes(hostname)) {
      return true;
    }
    
    // Check if it's a root domain with port (e.g., localhost:${frontendPort}, ${baseDomain}:${frontendPort})
    const [domain, port] = hostname.split(':');
    if (rootDomains.includes(domain)) {
      return true;
    }
    
    return false;
  }

  private extractSubdomain(hostname: string): string {
    // Remove port if present
    const hostWithoutPort = hostname.split(':')[0];
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    
    // Split by dots and get the first part as subdomain
    const parts = hostWithoutPort.split('.');
    
    // For localhost:${frontendPort} or ${baseDomain}:${frontendPort}, there's no subdomain
    if (parts.length <= 1) {
      throw new Error('No subdomain found in hostname');
    }
    
    // For tenant1.localhost or tenant1.${baseDomain}, the first part is the subdomain
    return parts[0];
  }
}
