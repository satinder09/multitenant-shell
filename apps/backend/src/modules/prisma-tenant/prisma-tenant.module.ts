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
            console.log('[TENANT_CLIENT] Factory called');
            console.log('[TENANT_CLIENT] req.tenant:', req.tenant ? { id: req.tenant.id } : 'null');
            console.log('[TENANT_CLIENT] req.user:', req.user ? { email: req.user.email, isSuperAdmin: req.user.isSuperAdmin, accessType: req.user.accessType, tenantContext: req.user.tenantContext } : 'null');
            
            if (!req.tenant) {
              console.log('[TENANT_CLIENT] No tenant in request, returning null');
              return null;
            }
            
            console.log('[TENANT_CLIENT] Creating tenant client for tenant:', req.tenant.id);
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
