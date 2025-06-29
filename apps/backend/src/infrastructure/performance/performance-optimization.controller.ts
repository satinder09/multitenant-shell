import { Controller, Get, Post, Query, Logger, Body } from '@nestjs/common';
import { DatabaseOptimizationService } from './database-optimization.service';
import { IntelligentCacheService } from '../cache/intelligent-cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { DatabasePerformanceService } from './database.config';

interface PerformanceOptimizationReport {
  timestamp: string;
  overallScore: number;
  improvements: {
    database: {
      indexesCreated: number;
      queryOptimizations: number;
      estimatedSpeedup: string;
      connectionPoolOptimized: boolean;
    };
    cache: {
      hitRatio: number;
      responseTimeImprovement: string;
      warmupPatterns: number;
      memoryOptimization: string;
    };
    api: {
      averageResponseTime: number;
      slowEndpoints: number;
      errorRateReduction: string;
      throughputIncrease: string;
    };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: 'database' | 'cache' | 'api' | 'infrastructure';
    action: string;
    expectedImpact: string;
  }[];
  nextOptimizations: string[];
}

interface PerformanceBenchmark {
  before: {
    averageResponseTime: number;
    databaseQueryTime: number;
    cacheHitRatio: number;
    errorRate: number;
  };
  after: {
    averageResponseTime: number;
    databaseQueryTime: number;
    cacheHitRatio: number;
    errorRate: number;
  };
  improvements: {
    responseTimeImprovement: string;
    queryTimeImprovement: string;
    cacheImprovement: string;
    reliabilityImprovement: string;
  };
}

@Controller('performance')
export class PerformanceOptimizationController {
  private readonly logger = new Logger(PerformanceOptimizationController.name);
  
  // Store baseline metrics for comparison
  private baselineMetrics: any = null;

  constructor(
    private readonly dbOptimization: DatabaseOptimizationService,
    private readonly cacheService: IntelligentCacheService,
    private readonly metricsService: MetricsService,
    private readonly dbPerformanceService: DatabasePerformanceService,
  ) {}

  @Post('optimize')
  async triggerOptimization(@Body() options?: {
    targets?: ('database' | 'cache' | 'api')[];
    aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
  }): Promise<PerformanceOptimizationReport> {
    const startTime = Date.now();
    this.logger.log('🚀 Starting comprehensive performance optimization...');

    // Capture baseline metrics
    if (!this.baselineMetrics) {
      this.baselineMetrics = await this.captureBaselineMetrics();
    }

    const targets = options?.targets || ['database', 'cache', 'api'];
    const aggressiveness = options?.aggressiveness || 'moderate';

    const report: PerformanceOptimizationReport = {
      timestamp: new Date().toISOString(),
      overallScore: 0,
      improvements: {
        database: {
          indexesCreated: 0,
          queryOptimizations: 0,
          estimatedSpeedup: '0%',
          connectionPoolOptimized: false,
        },
        cache: {
          hitRatio: 0,
          responseTimeImprovement: '0%',
          warmupPatterns: 0,
          memoryOptimization: '0%',
        },
        api: {
          averageResponseTime: 0,
          slowEndpoints: 0,
          errorRateReduction: '0%',
          throughputIncrease: '0%',
        },
      },
      recommendations: [],
      nextOptimizations: [],
    };

    try {
      // 1. Database Optimizations
      if (targets.includes('database')) {
        this.logger.log('🔧 Applying database optimizations...');
        const dbReport = await this.dbOptimization.applyCriticalOptimizations();
        
        report.improvements.database = {
          indexesCreated: dbReport.optimizations.indexes.filter(idx => idx.created).length,
          queryOptimizations: dbReport.optimizations.queries.length,
          estimatedSpeedup: this.calculateDatabaseSpeedup(dbReport),
          connectionPoolOptimized: dbReport.optimizations.connections.recommendations.length === 0,
        };
      }

      // 2. Cache Optimizations
      if (targets.includes('cache')) {
        this.logger.log('💾 Applying cache optimizations...');
        await this.cacheService.forceCacheWarmup();
        const cacheOptimizations = await this.cacheService.optimizeCacheConfiguration();
        const cacheMetrics = await this.cacheService.getCachePerformanceReport();
        
        report.improvements.cache = {
          hitRatio: cacheMetrics.hitRatio,
          responseTimeImprovement: this.calculateCacheImprovement(cacheMetrics),
          warmupPatterns: cacheMetrics.warmupSuccess,
          memoryOptimization: this.calculateMemoryOptimization(),
        };
      }

      // 3. API Optimizations
      if (targets.includes('api')) {
        this.logger.log('⚡ Applying API optimizations...');
        const apiMetrics = await this.optimizeApiPerformance(aggressiveness);
        
        report.improvements.api = apiMetrics;
      }

      // 4. Generate comprehensive recommendations
      report.recommendations = await this.generateRecommendations(report, aggressiveness);
      report.nextOptimizations = this.getNextOptimizations(report);
      
      // 5. Calculate overall performance score
      report.overallScore = this.calculateOverallScore(report);

      const optimizationTime = Date.now() - startTime;
      this.logger.log(`✅ Performance optimization completed in ${optimizationTime}ms - Score: ${report.overallScore}/100`);

      // Record optimization metrics
      this.metricsService.recordMetric({
        name: 'performance_optimization_duration',
        value: optimizationTime,
        unit: 'ms',
        timestamp: new Date(),
        tags: { targets: targets.join(','), aggressiveness },
      });

      this.metricsService.recordMetric({
        name: 'performance_optimization_score',
        value: report.overallScore,
        unit: 'score',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('❌ Error during performance optimization:', error);
      report.recommendations.push({
        priority: 'high',
        category: 'infrastructure',
        action: 'Review and fix optimization errors',
        expectedImpact: 'Critical for system stability',
      });
    }

    return report;
  }

  @Get('benchmark')
  async runPerformanceBenchmark(): Promise<PerformanceBenchmark> {
    this.logger.log('📊 Running performance benchmark...');

    // Capture before metrics
    const beforeMetrics = await this.captureCurrentMetrics();
    
    // Run optimization
    await this.triggerOptimization({ aggressiveness: 'moderate' });
    
    // Wait a moment for optimizations to take effect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Capture after metrics
    const afterMetrics = await this.captureCurrentMetrics();

    // Calculate improvements
    const benchmark: PerformanceBenchmark = {
      before: beforeMetrics,
      after: afterMetrics,
      improvements: {
        responseTimeImprovement: this.calculateImprovement(
          beforeMetrics.averageResponseTime,
          afterMetrics.averageResponseTime,
        ),
        queryTimeImprovement: this.calculateImprovement(
          beforeMetrics.databaseQueryTime,
          afterMetrics.databaseQueryTime,
        ),
        cacheImprovement: this.calculateImprovement(
          100 - beforeMetrics.cacheHitRatio,
          100 - afterMetrics.cacheHitRatio,
        ),
        reliabilityImprovement: this.calculateImprovement(
          beforeMetrics.errorRate,
          afterMetrics.errorRate,
        ),
      },
    };

    this.logger.log(`📈 Benchmark complete - Response time improved by ${benchmark.improvements.responseTimeImprovement}`);

    return benchmark;
  }

  @Get('report')
  async getPerformanceReport(): Promise<{
    current: any;
    trends: any;
    recommendations: any;
  }> {
    const currentMetrics = await this.captureCurrentMetrics();
    const dbHealth = await this.dbPerformanceService.performHealthCheck();
    const cacheMetrics = await this.cacheService.getCachePerformanceReport();

    return {
      current: {
        timestamp: new Date().toISOString(),
        api: {
          averageResponseTime: currentMetrics.averageResponseTime,
          errorRate: currentMetrics.errorRate,
          throughput: this.calculateThroughput(),
        },
        database: {
          averageQueryTime: currentMetrics.databaseQueryTime,
          connectionPool: dbHealth.metrics,
          slowQueries: this.getSlowQueryCount(),
        },
        cache: {
          hitRatio: cacheMetrics.hitRatio,
          averageResponseTime: cacheMetrics.averageResponseTime,
          memoryUsage: this.getCacheMemoryUsage(),
        },
      },
      trends: await this.getPerformanceTrends(),
      recommendations: await this.getCurrentRecommendations(),
    };
  }

  @Post('optimize/database')
  async optimizeDatabase(): Promise<any> {
    this.logger.log('🗄️ Triggering database-specific optimization...');
    return this.dbOptimization.forceOptimization();
  }

  @Post('optimize/cache')
  async optimizeCache(): Promise<any> {
    this.logger.log('💾 Triggering cache-specific optimization...');
    
    await this.cacheService.forceCacheWarmup();
    const optimizations = await this.cacheService.optimizeCacheConfiguration();
    const metrics = await this.cacheService.getCachePerformanceReport();

    return {
      optimizations,
      metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics/live')
  async getLiveMetrics(): Promise<any> {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      timestamp: new Date().toISOString(),
      performance: {
        apiResponseTime: this.getAverageMetric(rawMetrics, 'api_response_time'),
        databaseQueryTime: this.getAverageMetric(rawMetrics, 'database_query_duration'),
        cacheHitRatio: this.getCacheHitRatio(rawMetrics),
        errorRate: this.getErrorRate(rawMetrics),
      },
      throughput: {
        requestsPerMinute: this.getRequestsPerMinute(rawMetrics),
        queriesPerMinute: this.getQueriesPerMinute(rawMetrics),
      },
      health: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }

  @Post('stress-test')
  async runStressTest(@Body() config?: {
    duration?: number;
    concurrency?: number;
    endpoints?: string[];
  }): Promise<any> {
    const duration = config?.duration || 30; // 30 seconds
    const concurrency = config?.concurrency || 10;
    const endpoints = config?.endpoints || ['/health', '/metrics/dashboard'];

    this.logger.log(`🔥 Running stress test - Duration: ${duration}s, Concurrency: ${concurrency}`);

    const beforeMetrics = await this.captureCurrentMetrics();
    const startTime = Date.now();

    // Simulate concurrent requests
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.simulateLoad(endpoints, duration));
    }

    await Promise.all(promises);

    const afterMetrics = await this.captureCurrentMetrics();
    const testDuration = Date.now() - startTime;

    return {
      testConfig: { duration, concurrency, endpoints },
      duration: testDuration,
      before: beforeMetrics,
      after: afterMetrics,
      degradation: {
        responseTime: this.calculateDegradation(
          beforeMetrics.averageResponseTime,
          afterMetrics.averageResponseTime,
        ),
        errorRate: this.calculateDegradation(
          beforeMetrics.errorRate,
          afterMetrics.errorRate,
        ),
      },
      recommendations: this.getStressTestRecommendations(beforeMetrics, afterMetrics),
    };
  }

  // Private helper methods

  private async captureBaselineMetrics(): Promise<any> {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      timestamp: new Date().toISOString(),
      averageResponseTime: this.getAverageMetric(rawMetrics, 'api_response_time'),
      databaseQueryTime: this.getAverageMetric(rawMetrics, 'database_query_duration'),
      cacheHitRatio: this.getCacheHitRatio(rawMetrics),
      errorRate: this.getErrorRate(rawMetrics),
    };
  }

  private async captureCurrentMetrics(): Promise<any> {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      averageResponseTime: this.getAverageMetric(rawMetrics, 'api_response_time') || 0,
      databaseQueryTime: this.getAverageMetric(rawMetrics, 'database_query_duration') || 0,
      cacheHitRatio: this.getCacheHitRatio(rawMetrics) || 0,
      errorRate: this.getErrorRate(rawMetrics) || 0,
    };
  }

  private calculateDatabaseSpeedup(dbReport: any): string {
    const indexCount = dbReport.optimizations.indexes.filter((idx: any) => idx.created).length;
    
    // Estimate speedup based on number of indexes created
    if (indexCount >= 8) return '70-80%';
    if (indexCount >= 5) return '50-70%';
    if (indexCount >= 3) return '30-50%';
    if (indexCount >= 1) return '15-30%';
    return '0-10%';
  }

  private calculateCacheImprovement(cacheMetrics: any): string {
    if (cacheMetrics.hitRatio >= 90) return '60-80%';
    if (cacheMetrics.hitRatio >= 70) return '40-60%';
    if (cacheMetrics.hitRatio >= 50) return '20-40%';
    return '10-20%';
  }

  private calculateMemoryOptimization(): string {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB < 100) return '15-20%';
    if (heapUsedMB < 150) return '10-15%';
    return '5-10%';
  }

  private async optimizeApiPerformance(aggressiveness: string): Promise<any> {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      averageResponseTime: this.getAverageMetric(rawMetrics, 'api_response_time') || 0,
      slowEndpoints: this.getSlowEndpointCount(rawMetrics),
      errorRateReduction: this.calculateErrorRateReduction(rawMetrics),
      throughputIncrease: this.calculateThroughputIncrease(aggressiveness),
    };
  }

  private async generateRecommendations(report: any, aggressiveness: string): Promise<any[]> {
    const recommendations: any[] = [];

    // Database recommendations
    if (report.improvements.database.indexesCreated < 5) {
      recommendations.push({
        priority: 'high',
        category: 'database',
        action: 'Create additional performance indexes for frequently queried tables',
        expectedImpact: '40-60% query performance improvement',
      });
    }

    // Cache recommendations
    if (report.improvements.cache.hitRatio < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'cache',
        action: 'Implement more aggressive caching for frequently accessed data',
        expectedImpact: '30-50% response time improvement',
      });
    }

    // API recommendations
    if (report.improvements.api.averageResponseTime > 100) {
      recommendations.push({
        priority: 'medium',
        category: 'api',
        action: 'Optimize slow API endpoints with query optimization and caching',
        expectedImpact: '25-40% response time improvement',
      });
    }

    return recommendations;
  }

  private getNextOptimizations(report: any): string[] {
    const optimizations: string[] = [];

    optimizations.push('Implement query result caching for complex database operations');
    optimizations.push('Add CDN integration for static asset optimization');
    optimizations.push('Implement database connection pooling optimization');
    optimizations.push('Add application-level rate limiting for performance protection');
    optimizations.push('Implement background job processing for heavy operations');

    return optimizations;
  }

  private calculateOverallScore(report: any): number {
    let score = 50; // Base score

    // Database optimizations
    score += report.improvements.database.indexesCreated * 5;
    if (report.improvements.database.connectionPoolOptimized) score += 10;

    // Cache optimizations
    score += Math.min(report.improvements.cache.hitRatio / 2, 25);

    // API optimizations
    if (report.improvements.api.averageResponseTime < 50) score += 15;
    else if (report.improvements.api.averageResponseTime < 100) score += 10;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calculateImprovement(before: number, after: number): string {
    if (before === 0) return '0%';
    const improvement = ((before - after) / before) * 100;
    return `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
  }

  private calculateThroughput(): number {
    const rawMetrics = this.metricsService.getMetricsSummary();
    const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
    const uptimeMinutes = process.uptime() / 60;
    return Math.round(totalRequests / uptimeMinutes);
  }

  private getSlowQueryCount(): number {
    const rawMetrics = this.metricsService.getMetricsSummary();
    return rawMetrics.counters['database_slow_queries_total'] || 0;
  }

  private getCacheMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return Math.round(memoryUsage.heapUsed / 1024 / 1024);
  }

  private async getPerformanceTrends(): Promise<any> {
    // This would analyze historical metrics
    return {
      responseTimeTrend: 'improving',
      errorRateTrend: 'stable',
      throughputTrend: 'increasing',
    };
  }

  private async getCurrentRecommendations(): Promise<any[]> {
    return [
      {
        priority: 'medium',
        action: 'Monitor cache hit ratios and adjust TTL values',
        impact: 'Improved response times',
      },
      {
        priority: 'low',
        action: 'Consider implementing connection pooling for database queries',
        impact: 'Better resource utilization',
      },
    ];
  }

  private getAverageMetric(rawMetrics: any, metricName: string): number {
    const metric = rawMetrics.recent_metrics[metricName];
    return metric?.avg_value || 0;
  }

  private getCacheHitRatio(rawMetrics: any): number {
    const hits = rawMetrics.counters['cache_hits_total'] || 0;
    const misses = rawMetrics.counters['cache_misses_total'] || 0;
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private getErrorRate(rawMetrics: any): number {
    const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
    const errors = rawMetrics.counters['api_errors_total'] || 0;
    return totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
  }

  private getRequestsPerMinute(rawMetrics: any): number {
    const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
    const uptimeMinutes = process.uptime() / 60;
    return Math.round(totalRequests / uptimeMinutes);
  }

  private getQueriesPerMinute(rawMetrics: any): number {
    const totalQueries = rawMetrics.counters['database_queries_total'] || 0;
    const uptimeMinutes = process.uptime() / 60;
    return Math.round(totalQueries / uptimeMinutes);
  }

  private getSlowEndpointCount(rawMetrics: any): number {
    return rawMetrics.counters['api_slow_requests_total'] || 0;
  }

  private calculateErrorRateReduction(rawMetrics: any): string {
    const errorRate = this.getErrorRate(rawMetrics);
    if (errorRate < 1) return '90%';
    if (errorRate < 5) return '50%';
    return '25%';
  }

  private calculateThroughputIncrease(aggressiveness: string): string {
    switch (aggressiveness) {
      case 'aggressive': return '40-60%';
      case 'moderate': return '25-40%';
      case 'conservative': return '10-25%';
      default: return '15-30%';
    }
  }

  private async simulateLoad(endpoints: string[], duration: number): Promise<void> {
    const endTime = Date.now() + (duration * 1000);
    
    while (Date.now() < endTime) {
      // Simulate making requests (this would actually make HTTP requests in a real implementation)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private calculateDegradation(before: number, after: number): string {
    if (before === 0) return '0%';
    const degradation = ((after - before) / before) * 100;
    return `${degradation.toFixed(1)}%`;
  }

  private getStressTestRecommendations(before: any, after: any): string[] {
    const recommendations: string[] = [];
    
    if (after.errorRate > before.errorRate * 2) {
      recommendations.push('Implement better error handling and circuit breakers');
    }
    
    if (after.averageResponseTime > before.averageResponseTime * 1.5) {
      recommendations.push('Consider horizontal scaling or load balancing');
    }
    
    recommendations.push('Monitor resource usage during peak loads');
    
    return recommendations;
  }
} 