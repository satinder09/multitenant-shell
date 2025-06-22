import { Global, DynamicModule, Module, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantPrismaService } from './tenant-prisma.service';
import { getTenantClient } from './get-tenant-client';

@Global()  // <<— Make this module global so its exports are visible everywhere
@Module({})
export class PrismaTenantModule {
  static forRoot(): DynamicModule {
    return {
      module: PrismaTenantModule,
      providers: [
        {
          provide: 'TENANT_CLIENT',
          scope: Scope.REQUEST,
          useFactory: (req: any) => {
            if (!req.tenant) {
              return null;
            }
            return getTenantClient(req.tenant);
          },
          inject: [REQUEST],
        },
        TenantPrismaService,
      ],
      exports: [TenantPrismaService],
    };
  }
}
