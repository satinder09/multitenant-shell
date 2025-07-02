import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }        from '@nestjs/config';
import { ScheduleModule }      from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// New domain imports - CORE RESTRUCTURED DOMAINS ✅
import { DatabaseModule } from './domains/database/database.module';
import { AuthModule } from './domains/auth/auth.module';
import { PlatformModule } from './domains/platform/platform.module';
import { TenantModule } from './domains/tenant/tenant.module';
import { SearchModule } from './domains/search/search.module';

// Shared infrastructure imports ✅
// import { TenantResolverMiddleware } from './shared/middleware/tenant-resolver.middleware';
import { SecurityLoggerMiddleware } from './shared/middleware/security-logger.middleware';
import { CsrfProtectionMiddleware } from './shared/middleware/csrf-protection.middleware';
import { SecurityHeadersMiddleware } from './shared/middleware/security-headers.middleware';
import { MultitenantRateLimitMiddleware } from './shared/middleware/multitenant-rate-limit.middleware';
import { MultitenantRateLimitService } from './shared/services/multitenant-rate-limit.service';
import { MultitenantRateLimitGuard } from './shared/guards/multitenant-rate-limit.guard';

// Monitoring infrastructure
import { PerformanceMonitoringInterceptor } from './shared/interceptors/performance-monitoring.interceptor';
import { MetricsService } from './infrastructure/monitoring/metrics.service';
import { DatabasePerformanceService } from './infrastructure/performance/database.config';
import { HealthController } from './infrastructure/health/health.controller';
import { MetricsDashboardController } from './infrastructure/monitoring/metrics-dashboard.controller';
import { RedisService } from './infrastructure/cache/redis.service';
import { AuditService } from './infrastructure/audit/audit.service';

// Performance optimization infrastructure
import { DatabaseOptimizationService } from './infrastructure/performance/database-optimization.service';
import { IntelligentCacheService } from './infrastructure/cache/intelligent-cache.service';
import { PerformanceOptimizationController } from './infrastructure/performance/performance-optimization.controller';

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
    PlatformModule,
    TenantModule,
    SearchModule,
  ],
  controllers: [
    HealthController,
    MetricsDashboardController,
    PerformanceOptimizationController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MultitenantRateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceMonitoringInterceptor,
    },
    MetricsService,
    DatabasePerformanceService,
    RedisService,
    DatabaseOptimizationService,
    IntelligentCacheService,
    AuditService,
    MultitenantRateLimitService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, SecurityLoggerMiddleware, CsrfProtectionMiddleware, MultitenantRateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
