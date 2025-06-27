import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }        from '@nestjs/config';
import { ScheduleModule }      from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppModule as XoroApp } from './app.module'; // if renamed
import { MasterPrismaModule }   from './modules/master-prisma/master-prisma.module';
import { TenantModule }         from './modules/tenant/tenant.module';
import { PrismaTenantModule }   from './modules/prisma-tenant/prisma-tenant.module';
import { AuthModule }           from './modules/auth/auth.module';
import { RbacModule }           from './modules/rbac/rbac.module';
import { PlatformAdminModule }  from './modules/platform-admin/platform-admin.module';
import { EvictionScheduler }    from './modules/prisma-tenant/eviction-scheduler.service';
import { TenantResolverMiddleware } from './middleware/tenant-resolver.middleware';
import { SecurityLoggerMiddleware } from './middleware/security-logger.middleware';
import { CsrfProtectionMiddleware } from './middleware/csrf-protection.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
      {
        name: 'strict',
        ttl: 60000, // 1 minute  
        limit: 20, // 20 requests per minute for sensitive endpoints
      }
    ]),
    MasterPrismaModule,
    TenantModule,
    PrismaTenantModule.forRoot(),
    AuthModule,  // <-- make sure AuthModule is here
    RbacModule,  // <-- add RBAC module
    PlatformAdminModule, // <-- add Platform Admin module
    // ...your other feature modules
  ],
  providers: [
    EvictionScheduler,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, SecurityLoggerMiddleware, CsrfProtectionMiddleware, TenantResolverMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
