import { Global, DynamicModule, Module, Scope, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantDatabaseService } from './tenant-database.service';
import { getTenantClient, startClientCleanup } from './get-tenant-client';
import { TenantContext } from '../../../shared/types/tenant-context';

@Global()
@Module({})
export class TenantDatabaseModule {
  private static initialized = false;

  static forRoot(): DynamicModule {
    // Start client cleanup only once
    if (!TenantDatabaseModule.initialized) {
      startClientCleanup();
      TenantDatabaseModule.initialized = true;
    }
    return {
      module: TenantDatabaseModule,
      providers: [
        {
          provide: 'TENANT_CLIENT',
          useFactory: async (req: any) => {
            // Check if this is a tenant request
            if (req && req.tenant) {
              try {
                return await getTenantClient(req.tenant as TenantContext);
              } catch (error) {
                                 const logger = new Logger('TenantDatabaseModule');
                 logger.error('Failed to get tenant client', { error: error instanceof Error ? error.message : 'Unknown error' });
                return null;
              }
            }
            // Return null for master/platform requests
            return null;
          },
          inject: [REQUEST],
          scope: Scope.REQUEST,
        },
        TenantDatabaseService,
      ],
      exports: [TenantDatabaseService, 'TENANT_CLIENT'],
    };
  }
} 