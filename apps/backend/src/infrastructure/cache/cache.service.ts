// Cache service abstraction with in-memory fallback
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

export interface CacheStats {
  connected: boolean;
  type: 'redis' | 'memory';
  memoryUsage: number;
  keyCount: number;
  hitRate: number;
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number; tags?: string[] }>();
  private tagMap = new Map<string, Set<string>>();
  private hits = 0;
  private misses = 0;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.cleanupTags(key, entry.tags);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.value;
  }

  set<T>(key: string, value: T, ttl = 3600, tags?: string[]): boolean {
    const expires = Date.now() + (ttl * 1000);
    
    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.cleanupTags(key, oldEntry.tags);
    }
    
    this.cache.set(key, { value, expires, tags });
    
    // Add to tag map
    if (tags) {
      tags.forEach(tag => {
        if (!this.tagMap.has(tag)) {
          this.tagMap.set(tag, new Set());
        }
        this.tagMap.get(tag)!.add(key);
      });
    }
    
    return true;
  }

  del(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cleanupTags(key, entry.tags);
      return this.cache.delete(key);
    }
    return false;
  }

  exists(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.cleanupTags(key, entry.tags);
      return false;
    }
    
    return true;
  }

  ttl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return -2;
    
    const remaining = entry.expires - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : -1;
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagMap.get(tag);
    if (!keys) return 0;
    
    let count = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        count++;
      }
    });
    
    this.tagMap.delete(tag);
    return count;
  }

  private cleanupTags(key: string, tags?: string[]): void {
    if (!tags) return;
    
    tags.forEach(tag => {
      const keys = this.tagMap.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagMap.delete(tag);
        }
      }
    });
  }

  getStats(): CacheStats {
    // Clean expired entries first
    this.cleanup();
    
    const total = this.hits + this.misses;
    return {
      connected: true,
      type: 'memory',
      memoryUsage: this.estimateMemoryUsage(),
      keyCount: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    this.cache.forEach((entry, key) => {
      size += key.length * 2; // String chars are 2 bytes
      size += JSON.stringify(entry.value).length * 2;
      size += 16; // Overhead for expires timestamp
    });
    return size;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cleanupTags(key, entry.tags);
        this.cache.delete(key);
      }
    });
  }

  flushAll(): boolean {
    this.cache.clear();
    this.tagMap.clear();
    this.hits = 0;
    this.misses = 0;
    return true;
  }
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private cache: MemoryCache;
  private redisClient: any = null;
  private useRedis = false;

  constructor(private configService: ConfigService) {
    this.cache = new MemoryCache();
  }

  async onModuleInit() {
    await this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    const redisEnabled = this.configService.get('REDIS_ENABLED', 'false') === 'true';
    
    if (redisEnabled) {
      try {
        // For now, we'll use in-memory cache as Redis is optional
        // This can be extended to support Redis when the package is available
        this.logger.log('Redis support can be added by installing ioredis package');
        this.logger.log('Using in-memory cache for now');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis, using in-memory cache:', error instanceof Error ? error.message : String(error));
      }
    } else {
      this.logger.log('Using in-memory cache');
    }
  }

  // Public API methods
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        this.logger.error(`Redis get error for key ${key}:`, error);
        // Fallback to memory cache
        return this.cache.get<T>(key);
      }
    }
    
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    const ttl = options?.ttl || 3600;
    
    if (this.useRedis && this.redisClient) {
      try {
        const serialized = JSON.stringify(value);
        await this.redisClient.setex(key, ttl, serialized);
        
        // Handle tags for Redis (simplified)
        if (options?.tags) {
          const pipeline = this.redisClient.pipeline();
          options.tags.forEach(tag => {
            const tagKey = `tag:${tag}`;
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, 86400);
          });
          await pipeline.exec();
        }
        
        return true;
      } catch (error) {
        this.logger.error(`Redis set error for key ${key}:`, error);
        // Fallback to memory cache
        return this.cache.set(key, value, ttl, options?.tags);
      }
    }
    
    return this.cache.set(key, value, ttl, options?.tags);
  }

  async del(key: string): Promise<boolean> {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (error) {
        this.logger.error(`Redis delete error for key ${key}:`, error);
        return this.cache.del(key);
      }
    }
    
    return this.cache.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.useRedis && this.redisClient) {
      try {
        const result = await this.redisClient.exists(key);
        return result === 1;
      } catch (error) {
        this.logger.error(`Redis exists error for key ${key}:`, error);
        return this.cache.exists(key);
      }
    }
    
    return this.cache.exists(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.useRedis && this.redisClient) {
      try {
        return await this.redisClient.ttl(key);
      } catch (error) {
        this.logger.error(`Redis TTL error for key ${key}:`, error);
        return this.cache.ttl(key);
      }
    }
    
    return this.cache.ttl(key);
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (this.useRedis && this.redisClient) {
      try {
        const tagKey = `tag:${tag}`;
        const keys = await this.redisClient.smembers(tagKey);
        
        if (keys.length === 0) return 0;
        
        const pipeline = this.redisClient.pipeline();
        keys.forEach((key: string) => pipeline.del(key));
        pipeline.del(tagKey);
        
        await pipeline.exec();
        return keys.length;
      } catch (error) {
        this.logger.error(`Redis invalidate by tag error for ${tag}:`, error);
        return this.cache.invalidateByTag(tag);
      }
    }
    
    return this.cache.invalidateByTag(tag);
  }

  async getStats(): Promise<CacheStats> {
    if (this.useRedis && this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        const keyCount = await this.redisClient.dbsize();
        
        const memoryMatch = info.match(/used_memory:(\d+)/);
        const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
        
        return {
          connected: true,
          type: 'redis',
          memoryUsage,
          keyCount,
          hitRate: 0, // Would need Redis module for accurate hit rate
        };
      } catch (error) {
        this.logger.error('Error getting Redis stats:', error);
        return this.cache.getStats();
      }
    }
    
    return this.cache.getStats();
  }

  generateKey(...parts: string[]): string {
    return parts.join(':');
  }

  generateTenantKey(tenantId: string, ...parts: string[]): string {
    return this.generateKey('tenant', tenantId, ...parts);
  }

  // Performance monitoring methods
  async getPerformanceMetrics(): Promise<{
    stats: CacheStats;
    performance: {
      errorRate: number;
      connectionHealth: boolean;
    };
    recommendations: string[];
  }> {
    const stats = await this.getStats();
    const recommendations: string[] = [];
    
    // Analyze performance and provide recommendations
    if (stats.hitRate < 0.5) {
      recommendations.push('Cache hit rate is low (<50%). Consider increasing TTL or reviewing caching strategy.');
    }
    
    if (stats.keyCount > 10000) {
      recommendations.push('High number of cache keys detected. Consider implementing cache partitioning.');
    }
    
    if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected. Consider implementing cache eviction policies.');
    }
    
    return {
      stats,
      performance: {
        errorRate: 0, // Would be tracked in real implementation
        connectionHealth: stats.connected,
      },
      recommendations,
    };
  }

  // Batch operations for better performance
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    if (this.useRedis && this.redisClient) {
      try {
        const values = await this.redisClient.mget(...keys);
        return values.map((value: string | null) => 
          value ? JSON.parse(value) : null
        );
      } catch (error) {
        this.logger.error('Redis mget error:', error);
      }
    }
    
    // Fallback to individual gets
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<boolean[]> {
    const results: boolean[] = [];
    
    if (this.useRedis && this.redisClient && entries.length > 1) {
      try {
        const pipeline = this.redisClient.pipeline();
        
        entries.forEach(entry => {
          const ttl = entry.options?.ttl || 3600;
          const serialized = JSON.stringify(entry.value);
          pipeline.setex(entry.key, ttl, serialized);
        });
        
        await pipeline.exec();
        return entries.map(() => true);
      } catch (error) {
        this.logger.error('Redis mset error:', error);
      }
    }
    
    // Fallback to individual sets
    for (const entry of entries) {
      results.push(await this.set(entry.key, entry.value, entry.options));
    }
    
    return results;
  }

  async mdel(keys: string[]): Promise<number> {
    if (this.useRedis && this.redisClient && keys.length > 1) {
      try {
        const result = await this.redisClient.del(...keys);
        return result;
      } catch (error) {
        this.logger.error('Redis mdel error:', error);
      }
    }
    
    // Fallback to individual deletes
    let count = 0;
    for (const key of keys) {
      if (await this.del(key)) {
        count++;
      }
    }
    
    return count;
  }

  // Tenant-specific cache management
  async invalidateTenantCache(tenantId: string): Promise<number> {
    return this.invalidateByTag(`tenant:${tenantId}`);
  }

  // Health check for cache
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string;
    metrics: CacheStats;
  }> {
    try {
      const testKey = 'health:check:' + Date.now();
      const testValue = { timestamp: Date.now() };
      
      // Test write
      const setResult = await this.set(testKey, testValue, { ttl: 10 });
      if (!setResult) {
        return {
          status: 'unhealthy',
          details: 'Failed to write test key',
          metrics: await this.getStats(),
        };
      }
      
      // Test read
      const getValue = await this.get(testKey);
      if (!getValue) {
        return {
          status: 'unhealthy',
          details: 'Failed to read test key',
          metrics: await this.getStats(),
        };
      }
      
      // Cleanup
      await this.del(testKey);
      
      const stats = await this.getStats();
      
      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let details = 'Cache is operating normally';
      
      if (stats.hitRate < 0.3) {
        status = 'degraded';
        details = 'Low cache hit rate detected';
      }
      
      if (!stats.connected) {
        status = 'unhealthy';
        details = 'Cache backend is not connected';
      }
      
      return {
        status,
        details,
        metrics: stats,
      };
    } catch (error) {
      this.logger.error('Cache health check failed', error);
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error',
        metrics: await this.getStats(),
      };
    }
  }

  async flushAll(): Promise<boolean> {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushdb();
        this.logger.warn('Redis cache flushed');
        return true;
      } catch (error) {
        this.logger.error('Error flushing Redis cache:', error);
        return this.cache.flushAll();
      }
    }
    
    return this.cache.flushAll();
  }
} 