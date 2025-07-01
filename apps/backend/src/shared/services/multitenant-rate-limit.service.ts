import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  resetTime: number;
  remaining: number;
  totalRequests: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

@Injectable()
export class MultitenantRateLimitService implements OnModuleInit {
  private readonly logger = new Logger(MultitenantRateLimitService.name);
  private redis: Redis | null = null;
  private fallbackStore = new Map<string, { count: number; resetTime: number }>();
  private readonly useRedis: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useRedis = this.configService.get('REDIS_URL') !== undefined;
  }

  async onModuleInit() {
    if (this.useRedis) {
      try {
        const redisUrl = this.configService.get('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL not configured');
        }
        
        this.redis = new Redis(redisUrl);
        
        this.redis.on('error', (error) => {
          this.logger.error('Redis connection error, falling back to memory store', error);
          this.redis = null;
        });

        this.redis.on('connect', () => {
          this.logger.log('Redis connected for rate limiting');
        });

        // Test connection
        await this.redis.ping();
        this.logger.log('Rate limiting service initialized with Redis');
      } catch (error) {
        this.logger.warn('Failed to connect to Redis, using memory store', error);
        this.redis = null;
      }
    }

    // Cleanup fallback store every 5 minutes
    setInterval(() => this.cleanupFallbackStore(), 5 * 60 * 1000);
  }

  /**
   * Check and increment rate limit for a given key
   */
  async checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const fullKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : `rate_limit:${key}`;
    
    if (this.redis) {
      return this.checkRateLimitRedis(fullKey, options);
    } else {
      return this.checkRateLimitMemory(fullKey, options);
    }
  }

  /**
   * Redis-based rate limiting (production)
   */
  private async checkRateLimitRedis(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const windowEnd = now;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis!.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request with timestamp as score
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(options.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results || results.some(([err]) => err)) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = results[1][1] as number;
      const resetTime = now + options.windowMs;

      if (currentCount >= options.maxRequests) {
        // Remove the request we just added since it's not allowed
        await this.redis!.zrem(key, `${now}-${Math.random()}`);
        
        return {
          allowed: false,
          resetTime,
          remaining: 0,
          totalRequests: currentCount,
        };
      }

      return {
        allowed: true,
        resetTime,
        remaining: options.maxRequests - currentCount - 1,
        totalRequests: currentCount + 1,
      };

    } catch (error) {
      this.logger.error('Redis rate limit check failed, falling back to memory', error);
      return this.checkRateLimitMemory(key, options);
    }
  }

  /**
   * Memory-based rate limiting (fallback)
   */
  private checkRateLimitMemory(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const record = this.fallbackStore.get(key);

    if (!record || now >= record.resetTime) {
      // First request or window expired
      this.fallbackStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      
      return {
        allowed: true,
        resetTime: now + options.windowMs,
        remaining: options.maxRequests - 1,
        totalRequests: 1,
      };
    }

    if (record.count >= options.maxRequests) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0,
        totalRequests: record.count,
      };
    }

    // Increment counter
    record.count++;
    this.fallbackStore.set(key, record);

    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: options.maxRequests - record.count,
      totalRequests: record.count,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string, keyPrefix?: string): Promise<void> {
    const fullKey = keyPrefix ? `${keyPrefix}:${key}` : `rate_limit:${key}`;
    
    if (this.redis) {
      try {
        await this.redis.del(fullKey);
      } catch (error) {
        this.logger.error('Failed to reset rate limit in Redis', error);
      }
    }
    
    this.fallbackStore.delete(fullKey);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const fullKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : `rate_limit:${key}`;
    
    if (this.redis) {
      try {
        const now = Date.now();
        const windowStart = now - options.windowMs;
        
        await this.redis.zremrangebyscore(fullKey, 0, windowStart);
        const currentCount = await this.redis.zcard(fullKey);
        
        return {
          allowed: currentCount < options.maxRequests,
          resetTime: now + options.windowMs,
          remaining: Math.max(0, options.maxRequests - currentCount),
          totalRequests: currentCount,
        };
      } catch (error) {
        this.logger.error('Failed to get rate limit status from Redis', error);
      }
    }

    // Fallback to memory store
    const now = Date.now();
    const record = this.fallbackStore.get(fullKey);

    if (!record || now >= record.resetTime) {
      return {
        allowed: true,
        resetTime: now + options.windowMs,
        remaining: options.maxRequests,
        totalRequests: 0,
      };
    }

    return {
      allowed: record.count < options.maxRequests,
      resetTime: record.resetTime,
      remaining: Math.max(0, options.maxRequests - record.count),
      totalRequests: record.count,
    };
  }

  /**
   * Clean up expired entries from memory store
   */
  private cleanupFallbackStore(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, record] of this.fallbackStore.entries()) {
      if (now >= record.resetTime) {
        this.fallbackStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries from memory store`);
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStats(): Promise<{
    redisConnected: boolean;
    memoryStoreSize: number;
    cleanupIntervalMs: number;
  }> {
    return {
      redisConnected: !!this.redis,
      memoryStoreSize: this.fallbackStore.size,
      cleanupIntervalMs: 5 * 60 * 1000,
    };
  }
} 