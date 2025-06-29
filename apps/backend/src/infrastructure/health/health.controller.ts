import { Controller, Get, Logger } from '@nestjs/common';
import { MasterDatabaseService } from '../../domains/database/master/master-database.service';
import { RedisService } from '../cache/redis.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private db: MasterDatabaseService,
    private redis: RedisService,
  ) {}

  @Get()
  async check() {
    const results = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkUptime(),
    ]);

    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, any>,
    };

    results.forEach((result, index) => {
      const checkNames = ['database', 'redis', 'memory', 'uptime'];
      const checkName = checkNames[index];
      
      if (result.status === 'fulfilled') {
        healthData.checks[checkName] = result.value;
      } else {
        healthData.checks[checkName] = {
          status: 'down',
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
        healthData.status = 'error';
      }
    });

    return healthData;
  }

  @Get('database')
  async checkDatabase() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error('Database health check failed', errorMessage);
      return {
        status: 'down',
        message: `Database connection failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('redis')
  async checkRedis() {
    try {
      // Simple Redis health check - try to set and get a test key
      const testKey = 'health-check';
      const testValue = Date.now().toString();
      
             // Set test value with 10 second expiration
       await this.redis.set(testKey, testValue, { ttl: 10 });
      
      // Get test value
      const retrievedValue = await this.redis.get(testKey);
      
      if (retrievedValue === testValue) {
        return {
          status: 'up',
          message: 'Redis connection is healthy',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: 'down',
          message: 'Redis read/write test failed',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.error('Redis health check failed', errorMessage);
      return {
        status: 'down',
        message: `Redis connection failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkMemory() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Define thresholds (in MB)
    const heapThreshold = 150;
    const rssThreshold = 150;
    
    const isHealthy = heapUsedMB < heapThreshold && rssUsedMB < rssThreshold;
    
    return {
      status: isHealthy ? 'up' : 'warning',
      message: isHealthy ? 'Memory usage is normal' : 'Memory usage is high',
      metrics: {
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        rss_used_mb: rssUsedMB,
        external_mb: Math.round(memoryUsage.external / 1024 / 1024),
      },
      thresholds: {
        heap_threshold_mb: heapThreshold,
        rss_threshold_mb: rssThreshold,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async checkUptime() {
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.round(uptimeSeconds / 3600 * 100) / 100;
    
    return {
      status: 'up',
      message: 'Application is running',
      metrics: {
        uptime_seconds: uptimeSeconds,
        uptime_hours: uptimeHours,
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  async getDetailedHealth() {
    const basicHealth = await this.check();
    
    // Add application-specific metrics
    const additionalMetrics = {
      tenant_clients: await this.getTenantClientStatus(),
      process_info: {
        pid: process.pid,
        platform: process.platform,
        architecture: process.arch,
        node_version: process.version,
      },
    };

    return {
      ...basicHealth,
      additional_metrics: additionalMetrics,
    };
  }

  private async getTenantClientStatus() {
    try {
      const { getClientCache } = await import('../../domains/database/tenant/get-tenant-client');
      const cache = getClientCache();
      
      return {
        active_connections: cache.size,
        connection_details: Array.from(cache.entries()).map(([tenantId, info]) => ({
          tenant_id: tenantId,
          last_used: new Date(info.lastUsed).toISOString(),
          connected: info.connected,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        error: 'Unable to retrieve tenant client status',
        message: errorMessage,
      };
    }
  }
} 