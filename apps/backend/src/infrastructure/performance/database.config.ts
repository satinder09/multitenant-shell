// Database performance and connection pooling configuration
import { Prisma } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';

export interface DatabasePerformanceConfig {
  connectionPool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
    createTimeoutMillis: number;
  };
  queryOptimization: {
    slowQueryThresholdMs: number;
    enableQueryLogging: boolean;
    enableExplainAnalyze: boolean;
    maxExecutionTimeMs: number;
  };
  tenantIsolation: {
    maxConnectionsPerTenant: number;
    tenantConnectionPoolSize: number;
    enableConnectionReuse: boolean;
  };
  monitoring: {
    enableMetrics: boolean;
    metricsCollectionIntervalMs: number;
    enableHealthChecks: boolean;
    healthCheckIntervalMs: number;
  };
}

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);
  private connectionStats = new Map<string, {
    activeConnections: number;
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: number;
    lastHealth: Date;
  }>();

  getOptimalConfig(): DatabasePerformanceConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProd = nodeEnv === 'production';
    
    return {
      connectionPool: {
        min: isProd ? 10 : 2,
        max: isProd ? 50 : 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000, // 10 minutes
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 500,
        createTimeoutMillis: 30000,
      },
      queryOptimization: {
        slowQueryThresholdMs: isProd ? 1000 : 500,
        enableQueryLogging: !isProd,
        enableExplainAnalyze: !isProd,
        maxExecutionTimeMs: 30000,
      },
      tenantIsolation: {
        maxConnectionsPerTenant: isProd ? 10 : 3,
        tenantConnectionPoolSize: isProd ? 20 : 5,
        enableConnectionReuse: true,
      },
      monitoring: {
        enableMetrics: true,
        metricsCollectionIntervalMs: 60000, // 1 minute
        enableHealthChecks: true,
        healthCheckIntervalMs: 30000, // 30 seconds
      },
    };
  }

  // Prisma connection pool configuration
  getPrismaConnectionConfig() {
    const config = this.getOptimalConfig();
    
    return {
      connection_limit: config.connectionPool.max,
      pool_timeout: config.connectionPool.acquireTimeoutMillis / 1000,
      connect_timeout: config.connectionPool.createTimeoutMillis / 1000,
      socket_timeout: config.queryOptimization.maxExecutionTimeMs / 1000,
    };
  }

  // Database URL with performance optimizations
  buildOptimizedDatabaseUrl(baseUrl: string): string {
    const config = this.getPrismaConnectionConfig();
    const url = new URL(baseUrl);
    
    // Add connection pool parameters
    url.searchParams.set('connection_limit', config.connection_limit.toString());
    url.searchParams.set('pool_timeout', config.pool_timeout.toString());
    url.searchParams.set('connect_timeout', config.connect_timeout.toString());
    url.searchParams.set('socket_timeout', config.socket_timeout.toString());
    
    // Add PostgreSQL-specific optimizations
    if (url.protocol === 'postgresql:') {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false'); // Better for connection pooling
      url.searchParams.set('statement_cache_size', '0');
    }
    
    return url.toString();
  }

  // Query performance monitoring
  async logQueryPerformance(
    query: string,
    params: any[],
    executionTime: number,
    tenantId?: string
  ): Promise<void> {
    const config = this.getOptimalConfig();
    
    if (executionTime > config.queryOptimization.slowQueryThresholdMs) {
      this.logger.warn('Slow query detected', {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        executionTime,
        tenantId,
        threshold: config.queryOptimization.slowQueryThresholdMs,
      });
      
      // Update tenant stats
      if (tenantId) {
        this.updateTenantStats(tenantId, executionTime, true);
      }
    } else if (config.queryOptimization.enableQueryLogging) {
      this.logger.debug('Query executed', {
        executionTime,
        tenantId,
      });
      
      if (tenantId) {
        this.updateTenantStats(tenantId, executionTime, false);
      }
    }
  }

  private updateTenantStats(tenantId: string, executionTime: number, isSlow: boolean): void {
    const stats = this.connectionStats.get(tenantId) || {
      activeConnections: 0,
      totalQueries: 0,
      avgQueryTime: 0,
      slowQueries: 0,
      lastHealth: new Date(),
    };
    
    stats.totalQueries++;
    stats.avgQueryTime = ((stats.avgQueryTime * (stats.totalQueries - 1)) + executionTime) / stats.totalQueries;
    
    if (isSlow) {
      stats.slowQueries++;
    }
    
    stats.lastHealth = new Date();
    this.connectionStats.set(tenantId, stats);
  }

  // Health check for database connections
  async performHealthCheck(tenantId?: string): Promise<{
    healthy: boolean;
    metrics: any;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const config = this.getOptimalConfig();
    
    let metrics: any = {
      totalTenants: this.connectionStats.size,
      globalStats: this.getGlobalStats(),
    };
    
    if (tenantId) {
      const tenantStats = this.connectionStats.get(tenantId);
      if (tenantStats) {
        metrics.tenantStats = tenantStats;
        
        // Check for performance issues
        if (tenantStats.slowQueries > tenantStats.totalQueries * 0.1) {
          recommendations.push(`Tenant ${tenantId} has high slow query ratio (${(tenantStats.slowQueries / tenantStats.totalQueries * 100).toFixed(1)}%)`);
        }
        
        if (tenantStats.avgQueryTime > config.queryOptimization.slowQueryThresholdMs * 0.5) {
          recommendations.push(`Tenant ${tenantId} average query time is high (${tenantStats.avgQueryTime.toFixed(2)}ms)`);
        }
      }
    }
    
    const healthy = recommendations.length === 0;
    
    return {
      healthy,
      metrics,
      recommendations,
    };
  }

  private getGlobalStats() {
    const allStats = Array.from(this.connectionStats.values());
    
    if (allStats.length === 0) {
      return {
        totalQueries: 0,
        avgQueryTime: 0,
        totalSlowQueries: 0,
        avgSlowQueryRatio: 0,
      };
    }
    
    const totalQueries = allStats.reduce((sum, stats) => sum + stats.totalQueries, 0);
    const totalSlowQueries = allStats.reduce((sum, stats) => sum + stats.slowQueries, 0);
    const avgQueryTime = allStats.reduce((sum, stats) => sum + stats.avgQueryTime, 0) / allStats.length;
    
    return {
      totalQueries,
      avgQueryTime: Number(avgQueryTime.toFixed(2)),
      totalSlowQueries,
      avgSlowQueryRatio: totalQueries > 0 ? Number((totalSlowQueries / totalQueries * 100).toFixed(2)) : 0,
    };
  }

  // Connection management
  getTenantConnectionLimit(tenantId: string): number {
    const config = this.getOptimalConfig();
    const stats = this.connectionStats.get(tenantId);
    
    if (!stats) {
      return config.tenantIsolation.maxConnectionsPerTenant;
    }
    
    // Adjust connection limit based on usage patterns
    const slowQueryRatio = stats.totalQueries > 0 ? stats.slowQueries / stats.totalQueries : 0;
    
    if (slowQueryRatio > 0.2) {
      // High slow query ratio - reduce connections to prevent resource exhaustion
      return Math.max(1, Math.floor(config.tenantIsolation.maxConnectionsPerTenant * 0.7));
    }
    
    return config.tenantIsolation.maxConnectionsPerTenant;
  }

  // Cleanup old stats
  cleanupOldStats(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [tenantId, stats] of this.connectionStats.entries()) {
      if (stats.lastHealth < cutoffTime) {
        this.connectionStats.delete(tenantId);
        this.logger.debug(`Cleaned up old stats for tenant ${tenantId}`);
      }
    }
  }
}

// Legacy database configuration (deprecated - use DatabasePerformanceService instead)
export const databaseConfig = {
  connectionPool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 180000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  queryTimeout: 30000,
  transactionTimeout: 60000,
  logging: {
    queries: process.env.NODE_ENV === 'development',
    slowQueries: true,
    slowQueryThreshold: 1000, // 1 second
  },
  metrics: {
    enabled: true,
    collectInterval: 60000, // 1 minute
  },
};

export const prismaConfig = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
};

// Query performance monitoring
export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
  model?: string;
  action?: string;
}

export class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private slowQueries: QueryMetrics[] = [];

  logQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // Track slow queries
    if (metrics.duration > databaseConfig.logging.slowQueryThreshold) {
      this.slowQueries.push(metrics);
      console.warn(`Slow query detected: ${metrics.duration}ms`, {
        query: metrics.query,
        params: metrics.params,
        model: metrics.model,
        action: metrics.action,
      });
    }

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-100);
    }
  }

  getMetrics(): QueryMetrics[] {
    return this.metrics;
  }

  getSlowQueries(): QueryMetrics[] {
    return this.slowQueries;
  }

  getAverageQueryTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.metrics.length;
  }

  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
    slowestQuery: QueryMetrics | null;
  } {
    return {
      totalQueries: this.metrics.length,
      slowQueries: this.slowQueries.length,
      averageTime: this.getAverageQueryTime(),
      slowestQuery: this.metrics.length > 0 
        ? this.metrics.reduce((slowest, current) => 
            current.duration > slowest.duration ? current : slowest
          )
        : null,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.slowQueries = [];
  }
}

export const queryMonitor = new QueryPerformanceMonitor(); 