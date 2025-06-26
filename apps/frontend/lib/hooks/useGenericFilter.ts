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
  SortParams
} from '@/lib/types';
import { generateId, debounce } from '@/lib/utils';

export function useGenericFilter<
  T extends GenericEntity,
  TFilters extends AdvancedBaseFilters = AdvancedBaseFilters
>(
  moduleName: string,
  options: UseGenericFilterOptions = {}
): UseGenericFilterReturn<T, TFilters> {
  // State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start with false to reduce initial loading
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [metadata, setMetadata] = useState<FilterMetadata[]>([]);
  const [fieldDiscovery, setFieldDiscovery] = useState<DynamicFieldDiscovery | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

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

  // Fetch field discovery metadata and initial data on mount
  useEffect(() => {
    fetchFieldDiscovery();
    if (options.enableSavedSearches) {
      fetchSavedSearches();
    }
    // Load initial data
    fetchData();
  }, [moduleName, options.enableSavedSearches]);

  const fetchFieldDiscovery = async () => {
    try {
      const response = await fetch(`/api/filters/${moduleName}/auto-discovery`);
      if (response.ok) {
        const discovery = await response.json();
        setFieldDiscovery(discovery);
        setMetadata(discovery.fields || []);
      }
    } catch (err) {
      console.error('Failed to fetch field discovery:', err);
    }
  };

  const fetchSavedSearches = async () => {
    try {
      const response = await fetch(`/api/filters/${moduleName}/saved-searches?userId=current-user`);
      if (response.ok) {
        const result = await response.json();
        setSavedSearches(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved searches:', err);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/filters/${moduleName}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryParams)
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
  }, [moduleName, queryParams]);

  // Debounced fetch data function
  const debouncedFetchData = useRef(
    debounce(() => fetchData(), 500)
  ).current;

  // Fetch data when query params change (debounced for search, immediate for pagination)
  useEffect(() => {
    // For pagination and limit changes, fetch immediately
    if (queryParams.page > 1 || queryParams.limit !== (options.defaultLimit || 10)) {
      fetchData();
    } else if (queryParams.filters?.search) {
      // For search changes, use debounced fetch
      debouncedFetchData();
    } else if (queryParams.complexFilter) {
      // For complex filter changes, fetch immediately (they are applied via button)
      fetchData();
    } else if (!queryParams.complexFilter && !queryParams.filters?.search) {
      // Initial load
      fetchData();
    }
  }, [queryParams, fetchData, debouncedFetchData, options.defaultLimit]);

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
    fetchData();
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