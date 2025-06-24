// apps/backend/src/middleware/tenant-resolver.middleware.ts

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../modules/tenant/tenant.service';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../modules/prisma-tenant/tenant-context';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(
    req: Request & { tenant?: TenantContext },
    res: Response,
    next: NextFunction,
  ) {
    const rawHost =
      (req.headers['x-forwarded-host'] as string) || (req.headers.host ?? '');
    const hostWithoutPort = rawHost.split(':')[0];
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
        await this.tenantService.findBySubdomain(subdomain);
      this.logger.debug(`Tenant found: id=${id}`);
      req.tenant = { id, databaseUrl };
      next();
    } catch (error: any) {
      this.logger.error(
        `Tenant resolution failed for "${subdomain}": ${error.message}`,
      );
      throw new UnauthorizedException(`Invalid tenant: ${subdomain}`);
    }
  }

  private isRootDomain(hostname: string): boolean {
    // Define root domains that should bypass tenant resolution
    const rootDomains = [
      'localhost',
      'lvh.me',
      '127.0.0.1',
      '', // Empty string for cases where hostname is just the domain
    ];
    
    // Check if the hostname exactly matches a root domain
    if (rootDomains.includes(hostname)) {
      return true;
    }
    
    // Check if it's a root domain with port (e.g., localhost:3000, lvh.me:3000)
    const [domain, port] = hostname.split(':');
    if (rootDomains.includes(domain)) {
      return true;
    }
    
    return false;
  }

  private extractSubdomain(hostname: string): string {
    // Remove port if present
    const hostWithoutPort = hostname.split(':')[0];
    
    // Split by dots and get the first part as subdomain
    const parts = hostWithoutPort.split('.');
    
    // For localhost:3000 or lvh.me:3000, there's no subdomain
    if (parts.length <= 1) {
      throw new Error('No subdomain found in hostname');
    }
    
    // For tenant1.localhost or tenant1.lvh.me, the first part is the subdomain
    return parts[0];
  }
}
