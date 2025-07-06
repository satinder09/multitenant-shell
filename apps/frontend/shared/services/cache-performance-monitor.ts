/**
 * 📊 CACHE PERFORMANCE MONITOR
 * 
 * Comprehensive monitoring system for cache performance including:
 * - Hit/miss ratio tracking
 * - Performance timing analysis
 * - Memory usage monitoring
 * - Cache efficiency insights
 */

export interface CacheMetrics {
  // Basic counters
  hits: number;
  misses: number;
  totalRequests: number;
  hitRatio: number;

  // Performance timing
  averageResolutionTime: number;
  backgroundRefreshes: number;
  staleServes: number;

  // Memory and size
  cacheSize: number;
  maxCacheSize: number;
  memoryUsageEstimate: number;
  evictions: number;

  // Error tracking
  resolutionErrors: number;
  retryAttempts: number;
  circuitBreakerTrips: number;

  // Time-based metrics
  lastResetTime: number;
  uptime: number;
}

export interface CacheOperationTiming {
  operation: 'hit' | 'miss' | 'background_refresh' | 'eviction';
  subdomain: string;
  startTime: number;
  endTime: number;
  duration: number;
  fromCache: boolean;
  cacheAge?: number;
}

export interface PerformanceAlert {
  type: 'SLOW_RESOLUTION' | 'HIGH_MISS_RATIO' | 'MEMORY_PRESSURE' | 'HIGH_ERROR_RATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  suggestions: string[];
}

export class CachePerformanceMonitor {
  private metrics: CacheMetrics;
  private recentTimings: CacheOperationTiming[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxTimingHistory = 100;
  private alertThresholds = {
    slowResolutionMs: 2000,
    lowHitRatio: 0.7,
    highMemoryUsageMB: 50,
    highErrorRate: 0.1
  };

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRatio: 0,
      averageResolutionTime: 0,
      backgroundRefreshes: 0,
      staleServes: 0,
      cacheSize: 0,
      maxCacheSize: 50,
      memoryUsageEstimate: 0,
      evictions: 0,
      resolutionErrors: 0,
      retryAttempts: 0,
      circuitBreakerTrips: 0,
      lastResetTime: Date.now(),
      uptime: 0
    };
  }

  /**
   * Record a cache hit
   */
  public recordCacheHit(subdomain: string, cacheAge: number): void {
    const timing: CacheOperationTiming = {
      operation: 'hit',
      subdomain,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0, // Cache hits are essentially instant
      fromCache: true,
      cacheAge
    };

    this.metrics.hits++;
    this.updateBasicMetrics();
    this.addTiming(timing);
    this.checkAlerts();
  }

  /**
   * Record a cache miss with resolution timing
   */
  public recordCacheMiss(subdomain: string, resolutionTimeMs: number): void {
    const now = Date.now();
    const timing: CacheOperationTiming = {
      operation: 'miss',
      subdomain,
      startTime: now - resolutionTimeMs,
      endTime: now,
      duration: resolutionTimeMs,
      fromCache: false
    };

    this.metrics.misses++;
    this.updateBasicMetrics();
    this.updateResolutionTime(resolutionTimeMs);
    this.addTiming(timing);
    this.checkAlerts();
  }

  /**
   * Record a background refresh operation
   */
  public recordBackgroundRefresh(subdomain: string, refreshTimeMs: number): void {
    const now = Date.now();
    const timing: CacheOperationTiming = {
      operation: 'background_refresh',
      subdomain,
      startTime: now - refreshTimeMs,
      endTime: now,
      duration: refreshTimeMs,
      fromCache: false
    };

    this.metrics.backgroundRefreshes++;
    this.addTiming(timing);
  }

  /**
   * Record serving stale data while refreshing
   */
  public recordStaleServe(subdomain: string, staleAge: number): void {
    this.metrics.staleServes++;
    
    // This is still considered a "hit" for performance purposes
    this.recordCacheHit(subdomain, staleAge);
  }

  /**
   * Record cache eviction due to size limits
   */
  public recordEviction(evictedSubdomain: string): void {
    const timing: CacheOperationTiming = {
      operation: 'eviction',
      subdomain: evictedSubdomain,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      fromCache: true
    };

    this.metrics.evictions++;
    this.metrics.cacheSize = Math.max(0, this.metrics.cacheSize - 1);
    this.addTiming(timing);
  }

  /**
   * Record resolution error
   */
  public recordResolutionError(subdomain: string, isRetry: boolean = false): void {
    this.metrics.resolutionErrors++;
    if (isRetry) {
      this.metrics.retryAttempts++;
    }
    this.checkAlerts();
  }

  /**
   * Record circuit breaker activation
   */
  public recordCircuitBreakerTrip(): void {
    this.metrics.circuitBreakerTrips++;
    this.addAlert({
      type: 'HIGH_ERROR_RATE',
      severity: 'HIGH',
      message: 'Circuit breaker activated due to high error rate',
      threshold: this.alertThresholds.highErrorRate,
      currentValue: this.getErrorRate(),
      timestamp: Date.now(),
      suggestions: [
        'Check API endpoint health',
        'Verify network connectivity',
        'Review error logs for patterns',
        'Consider implementing fallback mechanisms'
      ]
    });
  }

  /**
   * Update cache size
   */
  public updateCacheSize(newSize: number, maxSize: number): void {
    this.metrics.cacheSize = newSize;
    this.metrics.maxCacheSize = maxSize;
    
    // Estimate memory usage (rough calculation)
    const avgEntrySize = 2; // KB per cache entry estimate
    this.metrics.memoryUsageEstimate = newSize * avgEntrySize;
    
    this.checkAlerts();
  }

  /**
   * Get current metrics snapshot
   */
  public getMetrics(): CacheMetrics {
    this.metrics.uptime = Date.now() - this.metrics.lastResetTime;
    return { ...this.metrics };
  }

  /**
   * Get recent performance alerts
   */
  public getAlerts(maxAge: number = 5 * 60 * 1000): PerformanceAlert[] {
    const cutoff = Date.now() - maxAge;
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Get recent timing data for analysis
   */
  public getRecentTimings(count: number = 20): CacheOperationTiming[] {
    return this.recentTimings.slice(-count);
  }

  /**
   * Get performance insights and recommendations
   */
  public getPerformanceInsights(): {
    score: number;
    insights: string[];
    recommendations: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Analyze hit ratio
    if (this.metrics.hitRatio < 0.5) {
      score -= 30;
      insights.push(`Low cache hit ratio: ${(this.metrics.hitRatio * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing cache timeout');
      recommendations.push('Review cache key strategy');
    } else if (this.metrics.hitRatio > 0.9) {
      insights.push(`Excellent cache hit ratio: ${(this.metrics.hitRatio * 100).toFixed(1)}%`);
    }

    // Analyze resolution time
    if (this.metrics.averageResolutionTime > 1000) {
      score -= 20;
      insights.push(`Slow average resolution time: ${this.metrics.averageResolutionTime}ms`);
      recommendations.push('Optimize API endpoint performance');
      recommendations.push('Consider reducing network timeout');
    }

    // Analyze error rate
    const errorRate = this.getErrorRate();
    if (errorRate > 0.05) {
      score -= 25;
      insights.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate API reliability issues');
      recommendations.push('Implement better retry strategies');
    }

    // Analyze cache efficiency
    const evictionRate = this.metrics.evictions / Math.max(this.metrics.totalRequests, 1);
    if (evictionRate > 0.1) {
      score -= 15;
      insights.push(`High cache eviction rate: ${(evictionRate * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing cache size limit');
    }

    // Analyze stale serves (good thing!)
    if (this.metrics.staleServes > 0) {
      insights.push(`Serving stale data: ${this.metrics.staleServes} times (good for performance!)`);
    }

    if (insights.length === 0) {
      insights.push('Cache performance is optimal');
    }

    return {
      score: Math.max(0, score),
      insights,
      recommendations
    };
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.recentTimings = [];
    this.alerts = [];
  }

  /**
   * Generate debug information
   */
  public getDebugInfo(): Record<string, any> {
    const insights = this.getPerformanceInsights();
    
    return {
      metrics: this.getMetrics(),
      insights,
      recentAlerts: this.getAlerts(),
      recentTimings: this.getRecentTimings(10),
      cacheUtilization: (this.metrics.cacheSize / this.metrics.maxCacheSize * 100).toFixed(1) + '%',
      estimatedMemoryMB: (this.metrics.memoryUsageEstimate / 1024).toFixed(2) + ' MB'
    };
  }

  // Private helper methods

  private updateBasicMetrics(): void {
    this.metrics.totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRatio = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;
  }

  private updateResolutionTime(newTime: number): void {
    const totalTime = this.metrics.averageResolutionTime * (this.metrics.misses - 1) + newTime;
    this.metrics.averageResolutionTime = Math.round(totalTime / this.metrics.misses);
  }

  private addTiming(timing: CacheOperationTiming): void {
    this.recentTimings.push(timing);
    if (this.recentTimings.length > this.maxTimingHistory) {
      this.recentTimings.shift();
    }
  }

  private getErrorRate(): number {
    return this.metrics.totalRequests > 0 
      ? this.metrics.resolutionErrors / this.metrics.totalRequests 
      : 0;
  }

  private checkAlerts(): void {
    // Check for slow resolution times
    if (this.metrics.averageResolutionTime > this.alertThresholds.slowResolutionMs) {
      this.addAlert({
        type: 'SLOW_RESOLUTION',
        severity: 'MEDIUM',
        message: `Slow tenant resolution detected: ${this.metrics.averageResolutionTime}ms average`,
        threshold: this.alertThresholds.slowResolutionMs,
        currentValue: this.metrics.averageResolutionTime,
        timestamp: Date.now(),
        suggestions: [
          'Check API endpoint performance',
          'Verify network connectivity',
          'Consider caching optimizations'
        ]
      });
    }

    // Check for low hit ratio
    if (this.metrics.totalRequests > 10 && this.metrics.hitRatio < this.alertThresholds.lowHitRatio) {
      this.addAlert({
        type: 'HIGH_MISS_RATIO',
        severity: 'LOW',
        message: `Low cache hit ratio: ${(this.metrics.hitRatio * 100).toFixed(1)}%`,
        threshold: this.alertThresholds.lowHitRatio,
        currentValue: this.metrics.hitRatio,
        timestamp: Date.now(),
        suggestions: [
          'Increase cache timeout duration',
          'Review cache invalidation strategy',
          'Analyze usage patterns'
        ]
      });
    }

    // Check for memory pressure
    if (this.metrics.memoryUsageEstimate > this.alertThresholds.highMemoryUsageMB * 1024) {
      this.addAlert({
        type: 'MEMORY_PRESSURE',
        severity: 'MEDIUM',
        message: `High cache memory usage: ${(this.metrics.memoryUsageEstimate / 1024).toFixed(1)}MB`,
        threshold: this.alertThresholds.highMemoryUsageMB,
        currentValue: this.metrics.memoryUsageEstimate / 1024,
        timestamp: Date.now(),
        suggestions: [
          'Reduce cache size limit',
          'Implement more aggressive eviction',
          'Monitor for memory leaks'
        ]
      });
    }

    // Check for high error rate
    const errorRate = this.getErrorRate();
    if (this.metrics.totalRequests > 5 && errorRate > this.alertThresholds.highErrorRate) {
      this.addAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'HIGH',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        threshold: this.alertThresholds.highErrorRate,
        currentValue: errorRate,
        timestamp: Date.now(),
        suggestions: [
          'Check API endpoint health',
          'Implement circuit breaker',
          'Review retry logic',
          'Add fallback mechanisms'
        ]
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts of the same type within 1 minute
    const recentSimilarAlert = this.alerts.find(a => 
      a.type === alert.type && 
      Date.now() - a.timestamp < 60 * 1000
    );
    
    if (!recentSimilarAlert) {
      this.alerts.push(alert);
      
      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts.shift();
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[CachePerformanceMonitor] ${alert.severity} Alert:`, alert.message);
      }
    }
  }
} 