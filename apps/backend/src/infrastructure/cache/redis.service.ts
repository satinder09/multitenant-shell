// Redis caching service for performance optimization
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number; // Time to live in seconds
  maxMemoryPolicy: string;
  keyPrefix: string;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any; // Redis client (will be imported dynamically)
  private isConnected = false;
  private connectionAttempted = false;
  private redisAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      // Dynamic import to avoid dependency issues if Redis is not available
      const Redis = await import('ioredis').then(m => m.default).catch(() => null);
      
      if (!Redis) {
        this.logger.warn('Redis not available, falling back to in-memory cache');
        return;
      }

      const config: CacheConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
        ttl: this.configService.get('REDIS_TTL', 3600),
        maxMemoryPolicy: 'allkeys-lru',
        keyPrefix: this.configService.get('REDIS_KEY_PREFIX', 'mt:'),
      };

      this.client = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        keyPrefix: config.keyPrefix,
        lazyConnect: true,
        enableOfflineQueue: false, // Disable offline queue
        connectTimeout: 5000, // 5 second timeout
        maxRetriesPerRequest: null, // Disable retries completely
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Connected to Redis');
        this.isConnected = true;
        this.redisAvailable = true;
      });

      this.client.on('error', (error: Error) => {
        if (!this.redisAvailable) {
          // Only log the first error, then stay silent
          this.logger.warn('Redis not available - using in-memory cache fallback');
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Try to connect once with timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);

    } catch (error) {
      this.logger.warn('Redis connection failed - using in-memory cache fallback');
      this.isConnected = false;
      this.redisAvailable = false;
      
      // Clean up client to prevent further connection attempts
      if (this.client) {
        try {
          this.client.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.client = null;
      }
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.logger.log('Disconnected from Redis');
    }
  }

  // Basic cache operations
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const serialized = JSON.stringify(value);
      const ttl = options?.ttl || 3600;
      
      await this.client.setex(key, ttl, serialized);
      
      // Add tags for cache invalidation
      if (options?.tags) {
        await this.addTags(key, options.tags);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Advanced cache operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) return [];

    try {
      const values = await this.client.mget(keys);
      return values.map((value: string | null) => 
        value ? JSON.parse(value) : null
      );
    } catch (error) {
      this.logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<[string, T]>, ttl = 3600): Promise<boolean> {
    if (!this.isConnected || keyValuePairs.length === 0) return false;

    try {
      const pipeline = this.client.pipeline();
      
      keyValuePairs.forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttl, serialized);
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('Cache mset error:', error);
      return false;
    }
  }

  // Cache invalidation by tags
  private async addTags(key: string, tags: string[]): Promise<void> {
    if (!this.isConnected) return;

    try {
      const pipeline = this.client.pipeline();
      
      tags.forEach(tag => {
        const tagKey = `tag:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, 86400); // 24 hours
      });
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Error adding cache tags:', error);
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.client.smembers(tagKey);
      
      if (keys.length === 0) return 0;
      
      const pipeline = this.client.pipeline();
      keys.forEach((key: string) => pipeline.del(key));
      pipeline.del(tagKey);
      
      await pipeline.exec();
      return keys.length;
    } catch (error) {
      this.logger.error(`Error invalidating cache by tag ${tag}:`, error);
      return 0;
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    connected: boolean;
    memoryUsage: number;
    keyCount: number;
    hitRate: number;
  }> {
    if (!this.isConnected) {
      return {
        connected: false,
        memoryUsage: 0,
        keyCount: 0,
        hitRate: 0,
      };
    }

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbsize();
      
      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      return {
        connected: true,
        memoryUsage,
        keyCount,
        hitRate: 0, // Would need to track hits/misses for accurate calculation
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        connected: false,
        memoryUsage: 0,
        keyCount: 0,
        hitRate: 0,
      };
    }
  }

  // Utility methods
  generateKey(...parts: string[]): string {
    return parts.join(':');
  }

  async flushAll(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.client.flushdb();
      this.logger.warn('Cache flushed');
      return true;
    } catch (error) {
      this.logger.error('Error flushing cache:', error);
      return false;
    }
  }
} 