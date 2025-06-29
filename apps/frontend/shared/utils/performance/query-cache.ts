// Frontend query caching system with React Query integration
import { QueryClient, QueryKey, QueryFunction } from '@tanstack/react-query';

export interface CacheConfig {
  defaultStaleTime: number;
  defaultCacheTime: number;
  maxRetries: number;
  retryDelay: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
}

export const defaultCacheConfig: CacheConfig = {
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes
  defaultCacheTime: 10 * 60 * 1000, // 10 minutes
  maxRetries: 3,
  retryDelay: 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

// Cache key generators for consistency
export const cacheKeys = {
  // Auth keys
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  
  // Platform keys
  platform: {
    stats: ['platform', 'stats'] as const,
    activity: (timeRange?: string) => ['platform', 'activity', timeRange] as const,
    systemHealth: ['platform', 'systemHealth'] as const,
    tenants: (filters?: any) => ['platform', 'tenants', filters] as const,
    tenant: (id: string) => ['platform', 'tenant', id] as const,
    users: (filters?: any) => ['platform', 'users', filters] as const,
    user: (id: string) => ['platform', 'user', id] as const,
  },
  
  // Tenant keys
  tenant: {
    current: ['tenant', 'current'] as const,
    dashboard: ['tenant', 'dashboard'] as const,
    activity: (timeRange?: string) => ['tenant', 'activity', timeRange] as const,
    users: (filters?: any) => ['tenant', 'users', filters] as const,
    user: (id: string) => ['tenant', 'user', id] as const,
    roles: ['tenant', 'roles'] as const,
    role: (id: string) => ['tenant', 'role', id] as const,
    permissions: ['tenant', 'permissions'] as const,
    settings: ['tenant', 'settings'] as const,
  },
  
  // Module keys
  module: {
    list: ['modules'] as const,
    data: (module: string, filters?: any) => ['module', module, 'data', filters] as const,
    metadata: (module: string) => ['module', module, 'metadata'] as const,
    fieldTree: (module: string) => ['module', module, 'fieldTree'] as const,
    fieldValues: (module: string, field: string) => ['module', module, 'field', field, 'values'] as const,
    savedSearches: (module: string) => ['module', module, 'savedSearches'] as const,
  },
};

// Cache invalidation helpers
export class CacheInvalidator {
  constructor(private queryClient: QueryClient) {}

  // Invalidate all auth-related queries
  async invalidateAuth(): Promise<void> {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'auth';
      },
    });
  }

  // Invalidate platform queries
  async invalidatePlatform(): Promise<void> {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'platform';
      },
    });
  }

  // Invalidate tenant queries
  async invalidateTenant(): Promise<void> {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'tenant';
      },
    });
  }

  // Invalidate specific module queries
  async invalidateModule(module: string): Promise<void> {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const [type, moduleName] = query.queryKey;
        return type === 'module' && moduleName === module;
      },
    });
  }

  // Invalidate by pattern
  async invalidatePattern(pattern: string[]): Promise<void> {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        return pattern.every((part, index) => {
          return query.queryKey[index] === part || part === '*';
        });
      },
    });
  }

  // Remove all cached data
  async clearAll(): Promise<void> {
    this.queryClient.clear();
  }

  // Remove expired queries
  async removeExpired(): Promise<void> {
    this.queryClient.getQueryCache().getAll().forEach(query => {
      if (query.isStale()) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }
}

// Cache optimization utilities
export class CacheOptimizer {
  constructor(private queryClient: QueryClient) {}

  // Prefetch related data
  async prefetchRelated(currentKey: QueryKey, relatedKeys: QueryKey[], queryFn: QueryFunction): Promise<void> {
    const prefetchPromises = relatedKeys.map(key => 
      this.queryClient.prefetchQuery({
        queryKey: key,
        queryFn,
        staleTime: defaultCacheConfig.defaultStaleTime,
      })
    );

    await Promise.allSettled(prefetchPromises);
  }

  // Optimistic updates
  setOptimisticData<T>(key: QueryKey, updater: (old: T | undefined) => T): void {
    this.queryClient.setQueryData(key, updater);
  }

  // Background refetch for critical data
  async backgroundRefresh(keys: QueryKey[]): Promise<void> {
    const refetchPromises = keys.map(key => 
      this.queryClient.refetchQueries({ queryKey: key })
    );

    await Promise.allSettled(refetchPromises);
  }

  // Get cache statistics
  getCacheStats(): {
    totalQueries: number;
    staleQueries: number;
    errorQueries: number;
    cacheSize: number;
  } {
    const queries = this.queryClient.getQueryCache().getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: this.estimateCacheSize(queries),
    };
  }

  private estimateCacheSize(queries: any[]): number {
    let size = 0;
    queries.forEach(query => {
      if (query.state.data) {
        try {
          size += JSON.stringify(query.state.data).length;
        } catch {
          size += 1000; // Estimate for non-serializable data
        }
      }
    });
    return size;
  }
}

// Create configured QueryClient
export function createQueryClient(config: Partial<CacheConfig> = {}): QueryClient {
  const finalConfig = { ...defaultCacheConfig, ...config };

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: finalConfig.defaultStaleTime,
        gcTime: finalConfig.defaultCacheTime,
        retry: finalConfig.maxRetries,
        retryDelay: finalConfig.retryDelay,
        refetchOnWindowFocus: finalConfig.refetchOnWindowFocus,
        refetchOnReconnect: finalConfig.refetchOnReconnect,
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

// Cache warming utilities
export class CacheWarmer {
  constructor(private queryClient: QueryClient) {}

  // Warm essential data on app start
  async warmEssentialData(): Promise<void> {
    const essentialQueries = [
      cacheKeys.auth.currentUser,
      cacheKeys.tenant.current,
      cacheKeys.platform.systemHealth,
    ];

    const warmingPromises = essentialQueries.map(key => 
      this.queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => {
          // This would be replaced with actual API calls
          return Promise.resolve(null);
        },
        staleTime: 30000, // 30 seconds for initial warm-up
      })
    );

    await Promise.allSettled(warmingPromises);
  }

  // Warm data based on user context
  async warmContextualData(context: {
    isAuthenticated: boolean;
    tenantId?: string;
    userRole?: string;
  }): Promise<void> {
    const contextualQueries: QueryKey[] = [];

    if (context.isAuthenticated) {
      contextualQueries.push(cacheKeys.auth.currentUser);
      
      if (context.tenantId) {
        contextualQueries.push(cacheKeys.tenant.current);
        contextualQueries.push(cacheKeys.tenant.dashboard);
        
        if (context.userRole === 'admin') {
          contextualQueries.push(cacheKeys.tenant.users());
          contextualQueries.push(cacheKeys.tenant.roles);
        }
      }
    }

    const warmingPromises = contextualQueries.map(key => 
      this.queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => Promise.resolve(null),
        staleTime: 60000, // 1 minute
      })
    );

    await Promise.allSettled(warmingPromises);
  }
}

// Export utilities
export function createCacheUtils(queryClient: QueryClient) {
  return {
    invalidator: new CacheInvalidator(queryClient),
    optimizer: new CacheOptimizer(queryClient),
    warmer: new CacheWarmer(queryClient),
  };
} 