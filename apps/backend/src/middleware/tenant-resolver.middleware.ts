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

    const [subdomain] = hostWithoutPort.split('.');
    this.logger.debug(`Detected subdomain: "${subdomain}"`);

    // Add root domains that should bypass tenant resolution
    const rootDomains = ['localhost', '']; // Add your production domain here
    if (rootDomains.includes(subdomain)) {
      this.logger.debug('Root domain detected, skipping tenant resolution.');
      return next();
    }

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
}
