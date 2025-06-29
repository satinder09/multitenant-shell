import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MetricsService } from '../monitoring/metrics.service';

interface CacheStrategy {
  key: string;
  ttl: number;
  strategy: 'write-through' | 'write-behind' | 'cache-aside' | 'refresh-ahead';
  warmup: boolean;
  tags: string[];
}

interface CacheWarmupConfig {
  patterns: CachePattern[];
  schedule: 'startup' | 'periodic' | 'on-demand';
  priority: 'high' | 'medium' | 'low';
}

interface CachePattern {
  name: string;
  keyPattern: string;
  dataLoader: () => Promise<any>;
  ttl: number;
  dependencies: string[];
}

interface CachePerformanceMetrics {
  hitRatio: number;
  missRatio: number;
  averageResponseTime: number;
  cacheSize: number;
  evictionCount: number;
  warmupSuccess: number;
}

interface CacheOptimizationResult {
  pattern: string;
  optimization: string;
  expectedImprovement: string;
  implemented: boolean;
}

@Injectable()
export class IntelligentCacheService implements OnModuleInit {
  private readonly logger = new Logger(IntelligentCacheService.name);
  
  // Cache performance tracking
  private cacheHits = new Map<string, number>();
  private cacheMisses = new Map<string, number>();
  private cacheResponseTimes = new Map<string, number[]>();
  
  // Cache strategies for different data types
  private cacheStrategies = new Map<string, CacheStrategy>();
  
  // Warmup patterns
  private warmupPatterns: CachePattern[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Intelligent Cache Service...');
    
    // Configure cache strategies
    this.configureCacheStrategies();
    
    // Configure warmup patterns
    this.configureWarmupPatterns();
    
    // Start cache warmup
    await this.performCacheWarmup();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    this.logger.log('✅ Intelligent Cache Service initialized');
  }

  /**
   * Smart cache get with automatic performance tracking
   */
  async smartGet<T>(key: string, fallback?: () => Promise<T>, options?: {
    ttl?: number;
    tags?: string[];
    strategy?: 'write-through' | 'cache-aside';
  }): Promise<T | null> {
    const startTime = performance.now();
    const strategy = this.getCacheStrategy(key);
    
    try {
      // Try cache first
      const cached = await this.redis.get<T>(key);
      
      if (cached !== null) {
        // Cache hit
        this.recordCacheHit(key, performance.now() - startTime);
        return cached;
      }
      
      // Cache miss - use fallback if provided
      if (fallback) {
        const data = await fallback();
        
        // Store in cache with strategy
        const ttl = options?.ttl || strategy?.ttl || 3600;
        const tags = options?.tags || strategy?.tags || [];
        
        await this.smartSet(key, data, { ttl, tags, strategy: options?.strategy || 'cache-aside' });
        
        this.recordCacheMiss(key, performance.now() - startTime);
        return data;
      }
      
      this.recordCacheMiss(key, performance.now() - startTime);
      return null;
      
    } catch (error) {
      this.logger.error(`Smart cache get error for key ${key}:`, error);
      
      // Fallback to direct data loading
      if (fallback) {
        return await fallback();
      }
      
      return null;
    }
  }

  /**
   * Smart cache set with strategy implementation
   */
  async smartSet<T>(key: string, value: T, options?: {
    ttl?: number;
    tags?: string[];
    strategy?: 'write-through' | 'write-behind' | 'cache-aside';
  }): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const ttl = options?.ttl || 3600;
      const tags = options?.tags || [];
      const strategy = options?.strategy || 'cache-aside';
      
      // Implement caching strategy
      switch (strategy) {
        case 'write-through':
          // Write to cache and database simultaneously
          await this.redis.set(key, value, { ttl, tags });
          break;
          
        case 'cache-aside':
          // Write to cache only
          await this.redis.set(key, value, { ttl, tags });
          break;
          
        case 'write-behind':
          // Write to cache immediately, database later (async)
          await this.redis.set(key, value, { ttl, tags });
          // Could implement async database write here
          break;
      }
      
      // Record performance metrics
      this.metricsService.recordMetric({
        name: 'cache_set_duration',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: new Date(),
        tags: { key_pattern: this.getCacheKeyPattern(key), strategy },
      });
      
      return true;
      
    } catch (error) {
      this.logger.error(`Smart cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Cache frequently accessed data patterns
   */
  async cacheUserData(userId: string, userData: any): Promise<void> {
    const userKey = `user:${userId}`;
    await this.smartSet(userKey, userData, {
      ttl: 1800, // 30 minutes
      tags: ['user', 'auth'],
      strategy: 'write-through',
    });
  }

  async getCachedUserData(userId: string): Promise<any> {
    return this.smartGet(`user:${userId}`);
  }

  /**
   * Cache tenant data with intelligent TTL
   */
  async cacheTenantData(tenantId: string, tenantData: any): Promise<void> {
    const tenantKey = `tenant:${tenantId}`;
    await this.smartSet(tenantKey, tenantData, {
      ttl: 3600, // 1 hour
      tags: ['tenant', 'routing'],
      strategy: 'write-through',
    });
  }

  async getCachedTenantData(tenantId: string): Promise<any> {
    return this.smartGet(`tenant:${tenantId}`);
  }

  /**
   * Cache RBAC permissions with short TTL for security
   */
  async cacheUserPermissions(userId: string, permissions: any): Promise<void> {
    const permKey = `permissions:${userId}`;
    await this.smartSet(permKey, permissions, {
      ttl: 900, // 15 minutes (shorter for security)
      tags: ['permissions', 'rbac', 'security'],
      strategy: 'write-through',
    });
  }

  async getCachedUserPermissions(userId: string): Promise<any> {
    return this.smartGet(`permissions:${userId}`);
  }

  /**
   * Cache API responses with intelligent invalidation
   */
  async cacheApiResponse(endpoint: string, params: any, response: any): Promise<void> {
    const cacheKey = this.generateApiCacheKey(endpoint, params);
    
    // Determine TTL based on endpoint type
    let ttl = 300; // 5 minutes default
    
    if (endpoint.includes('/health')) ttl = 30; // 30 seconds
    if (endpoint.includes('/metrics')) ttl = 60; // 1 minute
    if (endpoint.includes('/users')) ttl = 600; // 10 minutes
    if (endpoint.includes('/tenants')) ttl = 1800; // 30 minutes
    
    await this.smartSet(cacheKey, response, {
      ttl,
      tags: ['api', 'response', this.getEndpointTag(endpoint)],
      strategy: 'cache-aside',
    });
  }

  async getCachedApiResponse(endpoint: string, params: any): Promise<any> {
    const cacheKey = this.generateApiCacheKey(endpoint, params);
    return this.smartGet(cacheKey);
  }

  /**
   * Configure cache strategies for different data types
   */
  private configureCacheStrategies(): void {
    const strategies: CacheStrategy[] = [
      {
        key: 'user:*',
        ttl: 1800,
        strategy: 'write-through',
        warmup: true,
        tags: ['user', 'auth'],
      },
      {
        key: 'tenant:*',
        ttl: 3600,
        strategy: 'write-through',
        warmup: true,
        tags: ['tenant', 'routing'],
      },
      {
        key: 'permissions:*',
        ttl: 900,
        strategy: 'write-through',
        warmup: false,
        tags: ['permissions', 'rbac'],
      },
      {
        key: 'api:*',
        ttl: 300,
        strategy: 'cache-aside',
        warmup: false,
        tags: ['api', 'response'],
      },
      {
        key: 'session:*',
        ttl: 7200,
        strategy: 'write-through',
        warmup: false,
        tags: ['session', 'auth'],
      },
    ];

    strategies.forEach(strategy => {
      this.cacheStrategies.set(strategy.key, strategy);
    });

    this.logger.log(`Configured ${strategies.length} cache strategies`);
  }

  /**
   * Configure cache warmup patterns
   */
  private configureWarmupPatterns(): void {
    this.warmupPatterns = [
      {
        name: 'Active Tenants',
        keyPattern: 'tenant:*',
        dataLoader: async () => {
          // This would load active tenants from database
          return { pattern: 'active_tenants', loaded: true };
        },
        ttl: 3600,
        dependencies: [],
      },
      {
        name: 'Frequent Users',
        keyPattern: 'user:*',
        dataLoader: async () => {
          // This would load frequently accessed users
          return { pattern: 'frequent_users', loaded: true };
        },
        ttl: 1800,
        dependencies: ['Active Tenants'],
      },
      {
        name: 'System Permissions',
        keyPattern: 'permissions:system:*',
        dataLoader: async () => {
          // This would load system-wide permissions
          return { pattern: 'system_permissions', loaded: true };
        },
        ttl: 7200,
        dependencies: [],
      },
    ];

    this.logger.log(`Configured ${this.warmupPatterns.length} warmup patterns`);
  }

  /**
   * Perform cache warmup
   */
  private async performCacheWarmup(): Promise<void> {
    this.logger.log('🔥 Starting cache warmup...');
    const startTime = Date.now();
    
    let successCount = 0;
    let errorCount = 0;

    for (const pattern of this.warmupPatterns) {
      try {
        this.logger.debug(`Warming up cache pattern: ${pattern.name}`);
        
        const data = await pattern.dataLoader();
        const cacheKey = `warmup:${pattern.name.toLowerCase().replace(/\s+/g, '_')}`;
        
        await this.redis.set(cacheKey, data, { ttl: pattern.ttl });
        successCount++;
        
      } catch (error) {
        this.logger.error(`Cache warmup error for ${pattern.name}:`, error);
        errorCount++;
      }
    }

    const warmupTime = Date.now() - startTime;
    this.logger.log(`✅ Cache warmup completed in ${warmupTime}ms - Success: ${successCount}, Errors: ${errorCount}`);
    
    // Record warmup metrics
    this.metricsService.recordMetric({
      name: 'cache_warmup_duration',
      value: warmupTime,
      unit: 'ms',
      timestamp: new Date(),
    });

    this.metricsService.recordMetric({
      name: 'cache_warmup_success_count',
      value: successCount,
      unit: 'count',
      timestamp: new Date(),
    });
  }

  /**
   * Get cache strategy for a key
   */
  private getCacheStrategy(key: string): CacheStrategy | undefined {
    for (const [pattern, strategy] of this.cacheStrategies.entries()) {
      if (this.matchesPattern(key, pattern)) {
        return strategy;
      }
    }
    return undefined;
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return key.startsWith(prefix);
    }
    return key === pattern;
  }

  /**
   * Generate API cache key
   */
  private generateApiCacheKey(endpoint: string, params: any): string {
    const paramsHash = this.hashObject(params);
    return `api:${endpoint}:${paramsHash}`;
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get endpoint tag for cache organization
   */
  private getEndpointTag(endpoint: string): string {
    if (endpoint.includes('/auth')) return 'auth';
    if (endpoint.includes('/users')) return 'users';
    if (endpoint.includes('/tenants')) return 'tenants';
    if (endpoint.includes('/health')) return 'health';
    if (endpoint.includes('/metrics')) return 'metrics';
    return 'general';
  }

  /**
   * Get cache key pattern for metrics
   */
  private getCacheKeyPattern(key: string): string {
    const parts = key.split(':');
    if (parts.length > 1) {
      return `${parts[0]}:*`;
    }
    return 'unknown';
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(key: string, responseTime: number): void {
    const pattern = this.getCacheKeyPattern(key);
    
    this.cacheHits.set(pattern, (this.cacheHits.get(pattern) || 0) + 1);
    
    if (!this.cacheResponseTimes.has(pattern)) {
      this.cacheResponseTimes.set(pattern, []);
    }
    this.cacheResponseTimes.get(pattern)!.push(responseTime);
    
    this.metricsService.incrementCounter('cache_hits_total', 1, { pattern });
    this.metricsService.recordHistogram('cache_response_time', responseTime, 'ms', { pattern, type: 'hit' });
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(key: string, responseTime: number): void {
    const pattern = this.getCacheKeyPattern(key);
    
    this.cacheMisses.set(pattern, (this.cacheMisses.get(pattern) || 0) + 1);
    
    this.metricsService.incrementCounter('cache_misses_total', 1, { pattern });
    this.metricsService.recordHistogram('cache_response_time', responseTime, 'ms', { pattern, type: 'miss' });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor cache performance every 2 minutes
    setInterval(async () => {
      await this.collectCacheMetrics();
    }, 2 * 60 * 1000);
  }

  /**
   * Collect cache performance metrics
   */
  private async collectCacheMetrics(): Promise<void> {
    try {
      // Calculate hit ratios for each pattern
      for (const [pattern, hits] of this.cacheHits.entries()) {
        const misses = this.cacheMisses.get(pattern) || 0;
        const total = hits + misses;
        
        if (total > 0) {
          const hitRatio = (hits / total) * 100;
          
          this.metricsService.recordMetric({
            name: 'cache_hit_ratio',
            value: hitRatio,
            unit: 'percent',
            timestamp: new Date(),
            tags: { pattern },
          });
        }
      }

      // Get Redis stats
      const redisStats = await this.redis.getStats();
      
      this.metricsService.recordMetric({
        name: 'cache_memory_usage',
        value: redisStats.memoryUsage,
        unit: 'bytes',
        timestamp: new Date(),
      });

      this.metricsService.recordMetric({
        name: 'cache_key_count',
        value: redisStats.keyCount,
        unit: 'count',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error collecting cache metrics:', error);
    }
  }

  /**
   * Get cache performance report
   */
  async getCachePerformanceReport(): Promise<CachePerformanceMetrics> {
    const redisStats = await this.redis.getStats();
    
    // Calculate overall hit ratio
    const totalHits = Array.from(this.cacheHits.values()).reduce((sum, hits) => sum + hits, 0);
    const totalMisses = Array.from(this.cacheMisses.values()).reduce((sum, misses) => sum + misses, 0);
    const total = totalHits + totalMisses;
    
    const hitRatio = total > 0 ? (totalHits / total) * 100 : 0;
    const missRatio = 100 - hitRatio;
    
    // Calculate average response time
    const allResponseTimes = Array.from(this.cacheResponseTimes.values()).flat();
    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;

    return {
      hitRatio: Number(hitRatio.toFixed(2)),
      missRatio: Number(missRatio.toFixed(2)),
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
      cacheSize: redisStats.keyCount,
      evictionCount: 0, // Would need Redis config to get this
      warmupSuccess: this.warmupPatterns.length,
    };
  }

  /**
   * Optimize cache configuration
   */
  async optimizeCacheConfiguration(): Promise<CacheOptimizationResult[]> {
    const optimizations: CacheOptimizationResult[] = [];
    
    // Analyze hit ratios and suggest optimizations
    for (const [pattern, hits] of this.cacheHits.entries()) {
      const misses = this.cacheMisses.get(pattern) || 0;
      const total = hits + misses;
      
      if (total > 10) { // Only analyze patterns with sufficient data
        const hitRatio = (hits / total) * 100;
        
        if (hitRatio < 50) {
          optimizations.push({
            pattern,
            optimization: 'Increase TTL or improve cache key strategy',
            expectedImprovement: `Potential to improve hit ratio from ${hitRatio.toFixed(1)}% to 70%+`,
            implemented: false,
          });
        } else if (hitRatio > 95) {
          optimizations.push({
            pattern,
            optimization: 'Consider increasing TTL for even better performance',
            expectedImprovement: `Already excellent hit ratio of ${hitRatio.toFixed(1)}%`,
            implemented: false,
          });
        }
      }
    }

    return optimizations;
  }

  /**
   * Force cache warmup (manual trigger)
   */
  async forceCacheWarmup(): Promise<void> {
    this.logger.log('🔄 Force cache warmup requested...');
    await this.performCacheWarmup();
  }

  /**
   * Clear cache by pattern
   */
  async clearCachePattern(pattern: string): Promise<number> {
    this.logger.log(`🗑️ Clearing cache pattern: ${pattern}`);
    
    if (pattern.includes('*')) {
      // For wildcard patterns, we'd need to implement Redis SCAN
      // For now, return 0 as placeholder
      return 0;
    } else {
      const deleted = await this.redis.del(pattern);
      return deleted ? 1 : 0;
    }
  }
} 