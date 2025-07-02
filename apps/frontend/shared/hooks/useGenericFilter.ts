'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  GenericEntity, 
  UseGenericFilterReturn, 
  UseGenericFilterOptions,
  AdvancedQueryParams,
  AdvancedBaseFilters,
  ComplexFilter,
  ComplexFilterRule,
  FilterMetadata,
  DynamicFieldDiscovery,
  SavedSearch,
  PaginationMeta,
  SortParams,
  FilterOperator,
  FilterType
} from '@/shared/types/types';
import { ModuleConfig, getEffectiveOperators } from '@/shared/modules/types';
import { getModuleConfig } from '@/shared/modules/module-registry';
import { generateId, debounce } from '@/shared/utils/utils';
import { VisibilityState } from '@tanstack/react-table';

// PHASE 1 ENHANCEMENT: Cached Field Discovery
const fieldDiscoveryCache = new Map<string, {
  discovery: DynamicFieldDiscovery;
  timestamp: number;
  configHash: string;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper to create a hash of the config for cache invalidation
const createConfigHash = (config: ModuleConfig): string => {
  return JSON.stringify({
    module: config.module,
    columns: config.columns.map(col => ({
      field: col.field,
      type: col.type,
      filterable: col.filterable,
      options: col.options
    }))
  });
};

// PHASE 1 ENHANCEMENT: Enhanced field discovery with caching
const getCachedFieldDiscovery = (moduleName: string, config?: ModuleConfig): DynamicFieldDiscovery | null => {
  const cached = fieldDiscoveryCache.get(moduleName);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    fieldDiscoveryCache.delete(moduleName);
    return null;
  }
  
  // Check if config has changed
  if (config) {
    const currentHash = createConfigHash(config);
    if (cached.configHash !== currentHash) {
      fieldDiscoveryCache.delete(moduleName);
      return null;
    }
  }
  
  return cached.discovery;
};

const setCachedFieldDiscovery = (moduleName: string, discovery: DynamicFieldDiscovery, config?: ModuleConfig) => {
  fieldDiscoveryCache.set(moduleName, {
    discovery,
    timestamp: Date.now(),
    configHash: config ? createConfigHash(config) : ''
  });
};

export function useGenericFilter<
  T extends GenericEntity,
  TFilters extends AdvancedBaseFilters = AdvancedBaseFilters
>(
  moduleName: string,
  config?: ModuleConfig,
  options: UseGenericFilterOptions = {}
): UseGenericFilterReturn<T, TFilters> {
  // State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [metadata, setMetadata] = useState<FilterMetadata[]>([]);
  const [fieldDiscovery, setFieldDiscovery] = useState<DynamicFieldDiscovery | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  
  // Refs to track what we've already fetched to prevent duplicates
  const hasInitializedRef = useRef(false);
  const fetchedFieldDiscoveryRef = useRef(false);
  const fetchedSavedSearchesRef = useRef(false);
  const lastConfigKeyRef = useRef<string>('');

  // PHASE 1 ENHANCEMENT: Enhanced field discovery from config with caching
  const createFieldDiscoveryFromConfig = useCallback((config: ModuleConfig): DynamicFieldDiscovery => {
    // Check cache first
    const cached = getCachedFieldDiscovery(moduleName, config);
    if (cached) {
      console.log(`🚀 Using cached field discovery for ${moduleName}`);
      return cached;
    }

    console.log(`🔧 Generating field discovery from config for ${moduleName}`);

    // Convert operators from config format to lib/types format
    const convertOperators = (operators: any[]): FilterOperator[] => {
      return operators.map(op => {
        // Convert modules/types operators to lib/types operators
        switch (op) {
          case 'greater_than_or_equal': return 'greater_equal';
          case 'less_than_or_equal': return 'less_equal';
          default: return op as FilterOperator;
        }
      });
    };

    const fields: FilterMetadata[] = config.columns
      .filter(col => col.filterable !== false) // Only include filterable columns
      .map(col => {
        const effectiveOperators = getEffectiveOperators(col);
        
        return {
          id: `${config.module.name}-${col.field}`,
          moduleName: config.module.name,
          fieldName: col.field,
          fieldLabel: col.display,
          fieldType: (col.type || 'string') as FilterType,
          isFilterable: col.filterable !== false,
          isGroupable: false,
          isSearchable: col.searchable || false,
          operators: convertOperators(effectiveOperators),
          fieldValues: col.options?.map(opt => ({
            value: opt.value,
            label: opt.label
          }))
        };
      });

    const discovery: DynamicFieldDiscovery = {
      fields,
      nestedFields: [],
      relationPaths: []
    };

    // Cache the discovery
    setCachedFieldDiscovery(moduleName, discovery, config);

    return discovery;
  }, [moduleName]);

  // Query parameters
  const [queryParams, setQueryParams] = useState<AdvancedQueryParams<TFilters>>({
    page: 1,
    limit: options.defaultLimit || 10,
    filters: {} as TFilters,
    sort: options.defaultSort,
    groupBy: options.defaultGroupBy,
    complexFilter: null,
    savedSearchId: undefined
  });

  // PHASE 1 ENHANCEMENT: Performance optimized fetch functions
  const fetchFieldDiscovery = useCallback(async (configOverride?: ModuleConfig) => {
    // Allow config to be passed in to handle dynamic config changes
    const effectiveConfig = configOverride || config;
    
    // Reset the ref if config changes to allow refetch with new config
    const configKey = effectiveConfig ? JSON.stringify(effectiveConfig.module) : 'none';
    
    if (lastConfigKeyRef.current !== configKey) {
      fetchedFieldDiscoveryRef.current = false;
      lastConfigKeyRef.current = configKey;
    }
    
    if (fetchedFieldDiscoveryRef.current) return;
    fetchedFieldDiscoveryRef.current = true;
    
    try {
      // PHASE 1 ENHANCEMENT: Prioritize config-based discovery with caching
      if (effectiveConfig && effectiveConfig.columns && effectiveConfig.columns.length > 0) {
        const discovery = createFieldDiscoveryFromConfig(effectiveConfig);
        setFieldDiscovery(discovery);
        setMetadata(discovery.fields || []);
        return;
      }

      // Try to get config from module registry first
      const registryConfig = await getModuleConfig(moduleName);
      if (registryConfig) {
        const discovery = createFieldDiscoveryFromConfig(registryConfig);
        setFieldDiscovery(discovery);
        setMetadata(discovery.fields || []);
        return;
      }

      // Fallback to API if no config found (with caching)
      const cached = getCachedFieldDiscovery(moduleName);
      if (cached) {
        setFieldDiscovery(cached);
        setMetadata(cached.fields || []);
        return;
      }

      const response = await fetch(`/api/filters/${moduleName}/auto-discovery`);
      if (response.ok) {
        const discovery = await response.json();
        setFieldDiscovery(discovery);
        setMetadata(discovery.fields || []);
        setCachedFieldDiscovery(moduleName, discovery);
      }
    } catch (err) {
      console.error('Failed to fetch field discovery:', err);
      fetchedFieldDiscoveryRef.current = false; // Reset on error so it can retry
    }
  }, [moduleName, createFieldDiscoveryFromConfig, config]);

  const fetchSavedSearches = useCallback(async () => {
    if (fetchedSavedSearchesRef.current) return;
    fetchedSavedSearchesRef.current = true;
    
    try {
      const response = await fetch(`/api/filters/${moduleName}/saved-searches?userId=current-user`);
      if (response.ok) {
        const result = await response.json();
        setSavedSearches(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved searches:', err);
      fetchedSavedSearchesRef.current = false; // Reset on error so it can retry
    }
  }, [moduleName]);

  // Fetch field discovery and saved searches on mount and when config changes
  useEffect(() => {
    fetchFieldDiscovery(config);
    if (options.enableSavedSearches) {
      fetchSavedSearches();
    }
  }, [fetchFieldDiscovery, fetchSavedSearches, options.enableSavedSearches, config]);

  // PHASE 1 ENHANCEMENT: Performance optimized fetch functions
  const fetchData = useCallback(async (params?: AdvancedQueryParams<TFilters>) => {
    try {
      setIsLoading(true);
      setError(null);

      const requestParams = params || queryParams;

      // Remove 'filters' property to match backend DTO (GetTenantsQueryDto)
      const { filters, ...backendCompatibleParams } = requestParams;
      
      // Debug logging for users requests
      if (moduleName === 'users') {
        console.log('🔍 USERS REQUEST DEBUG:');
        console.log('🔍 Full request params:', JSON.stringify(backendCompatibleParams, null, 2));
        if (backendCompatibleParams.complexFilter) {
          console.log('🔍 Has complex filter - structure:', JSON.stringify(backendCompatibleParams.complexFilter, null, 2));
        } else {
          console.log('🔍 No complex filter in request');
        }
      }
      
      // Use custom backend endpoint if specified in config, otherwise use default
      const endpoint = config?.backendEndpoint ? `/api${config.backendEndpoint}` : `/api/modules/${moduleName}`;
      const method = config?.backendMethod || 'POST';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendCompatibleParams)
      });
      
      // Debug response for users
      if (moduleName === 'users' && !response.ok) {
        console.log('🔍 USERS ERROR RESPONSE:');
        const errorText = await response.text();
        console.log('🔍 Error details:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      if (response.ok) {
        const result = await response.json();
        
        // Debug successful response for users
        if (moduleName === 'users') {
          console.log('🔍 USERS SUCCESS RESPONSE:');
          console.log('🔍 Data count:', result.data?.length || 0);
          console.log('🔍 Pagination:', result.pagination);
        }
        
        setData(result.data || []);
        setPagination(result.pagination || null);
      } else {
        // Fallback for modules without specific endpoints
        console.log(`⚠️ No specific endpoint for ${moduleName}, using fallback`);
        
        // Mock data for development
        const mockData = Array.from({ length: 5 }, (_, i) => ({
          id: `${moduleName}-${i + 1}`,
          name: `Sample ${moduleName} ${i + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) as unknown as T[];
        
        setData(mockData);
        setPagination({
          page: requestParams.page || 1,
          limit: requestParams.limit || 10,
          total: mockData.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${moduleName} data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [moduleName, queryParams]);

  // PHASE 1 ENHANCEMENT: Debounced filter application for performance
  const debouncedFetchData = useMemo(
    () => debounce((params: AdvancedQueryParams<TFilters>) => {
      fetchData(params);
    }, 300), // 300ms debounce
    [fetchData]
  );

  // Fetch data when query params change - optimized to prevent excessive calls
  useEffect(() => {
    // Only run initial load once
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchData(queryParams);
      return;
    }

    // Only fetch data when queryParams actually change in meaningful ways
    // Don't fetch for initial default values
    const shouldFetchImmediately = 
      queryParams.page > 1 || 
      queryParams.limit !== (options.defaultLimit || 10) ||
      queryParams.complexFilter !== null;

    const shouldFetchDebounced = queryParams.filters?.search;

    if (shouldFetchImmediately) {
      fetchData(queryParams);
    } else if (shouldFetchDebounced) {
      debouncedFetchData(queryParams);
    }
  }, [
    queryParams.page,
    queryParams.limit, 
    queryParams.complexFilter,
    queryParams.filters?.search,
    options.defaultLimit,
    fetchData,
    debouncedFetchData
  ]); // Removed fetchData and debouncedFetchData to make it more stable

  // Filter actions
  const setComplexFilter = useCallback((filter: ComplexFilter | null) => {
    setQueryParams(prev => ({ 
      ...prev, 
      complexFilter: filter, 
      page: 1,
      savedSearchId: undefined 
    }));
  }, []);

  // Debounced search function to reduce API calls while typing
  const debouncedSetSearch = useCallback(
    debounce((search: string) => {
      setQueryParams(prev => ({ 
        ...prev, 
        filters: { ...prev.filters, search } as TFilters, 
        page: 1 
      }));
    }, 300), // 300ms delay
    []
  );

  const setSearch = useCallback((search: string) => {
    // Use debounced function to reduce API calls
    debouncedSetSearch(search);
  }, [debouncedSetSearch]);

  const setPage = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQueryParams(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sort: SortParams | null) => {
    setQueryParams(prev => ({ ...prev, sort: sort || undefined, page: 1 }));
  }, []);

  const setGroupBy = useCallback((groupBy: string | null) => {
    setQueryParams(prev => ({ ...prev, groupBy, page: 1 }));
  }, []);

  const addFilter = useCallback((filter: ComplexFilterRule) => {
    const currentFilter = queryParams.complexFilter;
    
    if (!currentFilter) {
      // Create new filter
      const newFilter: ComplexFilter = {
        rootGroup: {
          id: generateId(),
          logic: 'AND',
          rules: [filter],
          groups: []
        }
      };
      setComplexFilter(newFilter);
    } else {
      // Add to existing filter
      const updatedFilter: ComplexFilter = {
        ...currentFilter,
        rootGroup: {
          ...currentFilter.rootGroup,
          rules: [...currentFilter.rootGroup.rules, filter]
        }
      };
      setComplexFilter(updatedFilter);
    }
  }, [queryParams.complexFilter, setComplexFilter]);

  const removeFilter = useCallback((filterId: string) => {
    const currentFilter = queryParams.complexFilter;
    if (!currentFilter) return;

    const removeFromGroup = (group: any): any => {
      return {
        ...group,
        rules: group.rules.filter((rule: any) => rule.id !== filterId),
        groups: group.groups?.map(removeFromGroup) || []
      };
    };

    const updatedFilter: ComplexFilter = {
      ...currentFilter,
      rootGroup: removeFromGroup(currentFilter.rootGroup)
    };

    // If no rules left, clear the filter
    if (updatedFilter.rootGroup.rules.length === 0 && 
        (!updatedFilter.rootGroup.groups || updatedFilter.rootGroup.groups.length === 0)) {
      setComplexFilter(null);
    } else {
      setComplexFilter(updatedFilter);
    }
  }, [queryParams.complexFilter, setComplexFilter]);

  const clearFilters = useCallback(() => {
    setComplexFilter(null);
  }, [setComplexFilter]);

  // Saved search actions
  const saveCurrentSearch = useCallback(async (name: string, isPublic: boolean = false) => {
    try {
      const searchData = {
        name,
        moduleName,
        filters: queryParams.complexFilter?.rootGroup.rules || [],
        complexFilter: queryParams.complexFilter,
        groupBy: queryParams.groupBy,
        sortBy: queryParams.sort,
        isPublic
      };

      const response = await fetch(`/api/filters/${moduleName}/saved-searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
      });

      if (response.ok) {
        const newSearch = await response.json();
        setSavedSearches(prev => [...prev, newSearch]);
        setQueryParams(prev => ({ ...prev, savedSearchId: newSearch.id }));
      }
    } catch (err) {
      console.error('Failed to save search:', err);
      throw err;
    }
  }, [moduleName, queryParams]);

  const loadSavedSearch = useCallback(async (searchId: string) => {
    try {
      const response = await fetch(`/api/filters/${moduleName}/saved-searches/${searchId}`);
      if (response.ok) {
        const search = await response.json();
        
        setQueryParams(prev => ({
          ...prev,
          complexFilter: search.complexFilter,
          groupBy: search.groupBy,
          sort: search.sortBy,
          savedSearchId: searchId,
          page: 1
        }));
      }
    } catch (err) {
      console.error('Failed to load saved search:', err);
      throw err;
    }
  }, [moduleName]);

  const deleteSavedSearch = useCallback(async (searchId: string) => {
    try {
      const response = await fetch(`/api/filters/${moduleName}/saved-searches/${searchId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedSearches(prev => prev.filter(s => s.id !== searchId));
        
        // Clear saved search ID if it was the current one
        if (queryParams.savedSearchId === searchId) {
          setQueryParams(prev => ({ ...prev, savedSearchId: undefined }));
        }
      }
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      throw err;
    }
  }, [moduleName, queryParams.savedSearchId]);

  const toggleFavorite = useCallback(async (searchId: string) => {
    try {
      const response = await fetch(`/api/filters/${moduleName}/saved-searches/${searchId}/favorite`, {
        method: 'PATCH'
      });

      if (response.ok) {
        const updatedSearch = await response.json();
        setSavedSearches(prev => 
          prev.map(s => s.id === searchId ? updatedSearch : s)
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      throw err;
    }
  }, [moduleName]);

  const refetch = useCallback(() => {
    fetchData(queryParams);
  }, [fetchData]);

  return {
    // Data
    data,
    isLoading,
    error,
    pagination,
    metadata,
    fieldDiscovery,
    
    // Filter state
    queryParams,
    complexFilter: queryParams.complexFilter || null,
    savedSearches,
    
    // Actions
    setComplexFilter,
    setSearch,
    setPage,
    setLimit,
    setSort,
    setGroupBy,
    refetch,
    
    // Filter management
    addFilter,
    removeFilter,
    clearFilters,
    
    // Saved searches
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    toggleFavorite
  };
} 