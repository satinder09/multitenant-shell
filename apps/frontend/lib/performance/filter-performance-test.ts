// PHASE 1 ENHANCEMENT: Performance Testing Utilities
// This file helps verify that our caching and optimization improvements are working

interface PerformanceMetrics {
  fieldDiscoveryTime: number;
  filterApplicationTime: number;
  cacheHitRate: number;
  totalRequests: number;
}

class FilterPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fieldDiscoveryTime: 0,
    filterApplicationTime: 0,
    cacheHitRate: 0,
    totalRequests: 0
  };

  private cacheHits = 0;
  private cacheMisses = 0;

  // Track field discovery performance
  trackFieldDiscovery<T>(operation: () => Promise<T>, fromCache: boolean): Promise<T> {
    const startTime = performance.now();
    
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }

    return operation().then(result => {
      const endTime = performance.now();
      this.metrics.fieldDiscoveryTime = endTime - startTime;
      this.updateCacheHitRate();
      
      console.log(`🔍 Field Discovery: ${endTime - startTime}ms ${fromCache ? '(cached)' : '(fresh)'}`);
      return result;
    });
  }

  // Track filter application performance
  trackFilterApplication<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    return operation().then(result => {
      const endTime = performance.now();
      this.metrics.filterApplicationTime = endTime - startTime;
      
      console.log(`⚡ Filter Application: ${endTime - startTime}ms`);
      return result;
    });
  }

  private updateCacheHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  getMetrics(): PerformanceMetrics & { cacheStats: { hits: number; misses: number } } {
    return {
      ...this.metrics,
      cacheStats: {
        hits: this.cacheHits,
        misses: this.cacheMisses
      }
    };
  }

  logSummary(moduleName: string) {
    const metrics = this.getMetrics();
    console.log(`📊 Performance Summary for ${moduleName}:`);
    console.log(`   Field Discovery: ${metrics.fieldDiscoveryTime.toFixed(2)}ms`);
    console.log(`   Filter Application: ${metrics.filterApplicationTime.toFixed(2)}ms`);
    console.log(`   Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    console.log(`   Total Requests: ${metrics.totalRequests}`);
    console.log(`   Cache Stats: ${metrics.cacheStats.hits} hits, ${metrics.cacheStats.misses} misses`);
  }
}

// Global performance monitor instance
export const filterPerformanceMonitor = new FilterPerformanceMonitor();

// Utility to measure debounce effectiveness
export const measureDebounceEffectiveness = () => {
  let callCount = 0;
  let debouncedCallCount = 0;

  const originalFunction = () => {
    callCount++;
    console.log(`Original function called: ${callCount} times`);
  };

  const debouncedFunction = () => {
    debouncedCallCount++;
    console.log(`Debounced function called: ${debouncedCallCount} times`);
  };

  return {
    originalFunction,
    debouncedFunction,
    getEffectiveness: () => {
      const reduction = callCount > 0 ? ((callCount - debouncedCallCount) / callCount) * 100 : 0;
      return {
        originalCalls: callCount,
        debouncedCalls: debouncedCallCount,
        reductionPercentage: reduction
      };
    }
  };
};

// Test cache performance
export const testCachePerformance = async (moduleName: string, configGenerator: () => any) => {
  console.log(`🧪 Testing cache performance for ${moduleName}...`);
  
  // First call (should be cache miss)
  const start1 = performance.now();
  const config1 = configGenerator();
  const end1 = performance.now();
  console.log(`First call: ${end1 - start1}ms (cache miss)`);

  // Second call (should be cache hit)
  const start2 = performance.now();
  const config2 = configGenerator();
  const end2 = performance.now();
  console.log(`Second call: ${end2 - start2}ms (cache hit)`);

  const improvement = ((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100;
  console.log(`Cache improvement: ${improvement.toFixed(1)}%`);

  return {
    firstCallTime: end1 - start1,
    secondCallTime: end2 - start2,
    improvementPercentage: improvement
  };
}; 