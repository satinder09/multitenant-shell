// apps/backend/src/modules/prisma-tenant/tenant-prisma.service.ts

import { Injectable, Inject, Scope, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '../../../generated/tenant-prisma';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  constructor(
    @Inject('TENANT_CLIENT') private readonly client: PrismaClient | null,
  ) {}

  get db(): PrismaClient {
    if (!this.client) {
      throw new InternalServerErrorException(
        'Tenant client requested but not available. This service should not be used for master user requests.',
      );
    }
    return this.client;
  }
}
