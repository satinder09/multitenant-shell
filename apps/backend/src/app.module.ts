import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }        from '@nestjs/config';
import { ScheduleModule }      from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// New domain imports - CORE RESTRUCTURED DOMAINS ✅
import { DatabaseModule } from './domains/database/database.module';
import { AuthModule } from './domains/auth/auth.module';

// Shared infrastructure imports ✅
// import { TenantResolverMiddleware } from './shared/middleware/tenant-resolver.middleware';
import { SecurityLoggerMiddleware } from './shared/middleware/security-logger.middleware';
import { CsrfProtectionMiddleware } from './shared/middleware/csrf-protection.middleware';
import { SecurityHeadersMiddleware } from './shared/middleware/security-headers.middleware';

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
    DatabaseModule,
    AuthModule,
    // TODO: Complete platform and tenant modules integration
  ],
  providers: [
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
