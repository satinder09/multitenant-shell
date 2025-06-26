'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@/lib/types';
import { ModuleConfig, getEffectiveOperators } from '@/lib/modules/types';
import { getModuleConfig } from '@/lib/modules/module-registry';
import { generateId, debounce } from '@/lib/utils';
import { VisibilityState } from '@tanstack/react-table';

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

  // Create field discovery from config
  const createFieldDiscoveryFromConfig = useCallback((config: ModuleConfig): DynamicFieldDiscovery => {
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

    return {
      fields,
      nestedFields: [],
      relationPaths: []
    };
  }, []);

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

  // Stable fetch functions using useCallback
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
      // Use provided config if available
      if (effectiveConfig && effectiveConfig.columns && effectiveConfig.columns.length > 0) {
        const discovery = createFieldDiscoveryFromConfig(effectiveConfig);
        setFieldDiscovery(discovery);
        setMetadata(discovery.fields || []);
      } else {
        // Try to get config from module registry first
        const registryConfig = await getModuleConfig(moduleName);
        if (registryConfig) {
          const discovery = createFieldDiscoveryFromConfig(registryConfig);
          setFieldDiscovery(discovery);
          setMetadata(discovery.fields || []);
        } else {
          // Fallback to API if no config found
          const response = await fetch(`/api/filters/${moduleName}/auto-discovery`);
          if (response.ok) {
            const discovery = await response.json();
            setFieldDiscovery(discovery);
            setMetadata(discovery.fields || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch field discovery:', err);
      fetchedFieldDiscoveryRef.current = false; // Reset on error so it can retry
    }
  }, [moduleName, createFieldDiscoveryFromConfig]);

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

  const fetchData = useCallback(async (params?: AdvancedQueryParams<TFilters>) => {
    try {
      setIsLoading(true);
      setError(null);

      const requestParams = params || queryParams;

      const response = await fetch(`/api/modules/${moduleName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestParams)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || []);
      setPagination(result.pagination || null);
      
      if (result.metadata) {
        setMetadata(result.metadata);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [moduleName]); // Only depend on moduleName, not queryParams

  // Debounced fetch data function
  const queryParamsRef = useRef(queryParams);
  queryParamsRef.current = queryParams;

  const debouncedFetchData = useRef(
    debounce(() => fetchData(queryParamsRef.current), 500)
  ).current;

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
      debouncedFetchData();
    }
  }, [
    queryParams.page,
    queryParams.limit, 
    queryParams.complexFilter,
    queryParams.filters?.search,
    options.defaultLimit
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

  const setSearch = useCallback((search: string) => {
    setQueryParams(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, search } as TFilters, 
      page: 1 
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQueryParams(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sort: SortParams) => {
    setQueryParams(prev => ({ ...prev, sort, page: 1 }));
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
    fetchData(queryParamsRef.current);
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