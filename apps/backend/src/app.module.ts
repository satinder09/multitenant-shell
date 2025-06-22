import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }        from '@nestjs/config';
import { ScheduleModule }      from '@nestjs/schedule';

import { AppModule as XoroApp } from './app.module'; // if renamed
import { MasterPrismaModule }   from './modules/master-prisma/master-prisma.module';
import { TenantModule }         from './modules/tenant/tenant.module';
import { PrismaTenantModule }   from './modules/prisma-tenant/prisma-tenant.module';
import { AuthModule }           from './modules/auth/auth.module';
import { EvictionScheduler }    from './modules/prisma-tenant/eviction-scheduler.service';
import { TenantResolverMiddleware } from './middleware/tenant-resolver.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MasterPrismaModule,
    TenantModule,
    PrismaTenantModule.forRoot(),
    AuthModule,  // <-- make sure AuthModule is here
    // ...your other feature modules
  ],
  providers: [EvictionScheduler],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
