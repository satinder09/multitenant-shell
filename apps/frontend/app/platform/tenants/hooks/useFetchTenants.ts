'use client';

import { useState, useEffect, useCallback } from 'react';
import type { 
  TenantModel, 
  UseFetchTenantsReturn, 
  TenantQueryParams, 
  TenantFilters, 
  TenantSortParams,
  TenantListResponse 
} from '../types';

const DEFAULT_LIMIT = 10;
const DEFAULT_FILTERS: TenantFilters = {
  search: '',
  status: 'all',
  accessLevel: 'all',
};
const DEFAULT_SORT: TenantSortParams = {
  field: 'name',
  direction: 'asc',
};

export function useFetchTenants(): UseFetchTenantsReturn {
  const [data, setData] = useState<TenantModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TenantListResponse['pagination'] | null>(null);
  
  // Query parameters state
  const [queryParams, setQueryParams] = useState<TenantQueryParams>({
    page: 1,
    limit: DEFAULT_LIMIT,
    filters: DEFAULT_FILTERS,
    sort: DEFAULT_SORT,
  });

  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string
      const searchParams = new URLSearchParams();
      searchParams.set('page', queryParams.page.toString());
      searchParams.set('limit', queryParams.limit.toString());
      
      // Add filters
      if (queryParams.filters) {
        const { search, status, accessLevel, dateFrom, dateTo } = queryParams.filters;
        if (search && search.trim()) searchParams.set('search', search.trim());
        if (status && status !== 'all') searchParams.set('status', status);
        if (accessLevel && accessLevel !== 'all') searchParams.set('accessLevel', accessLevel);
        if (dateFrom) searchParams.set('dateFrom', dateFrom);
        if (dateTo) searchParams.set('dateTo', dateTo);
      }
      
      // Add sorting
      if (queryParams.sort) {
        searchParams.set('sortField', queryParams.sort.field as string);
        searchParams.set('sortDirection', queryParams.sort.direction);
      }

      const response = await fetch(`/api/tenants?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenants: ${response.status} ${response.statusText}`);
      }
      
      const responseData: TenantListResponse = await response.json();
      
      setData(responseData.data);
      setPagination(responseData.pagination);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  // Fetch tenants when query parameters change
  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Pagination controls
  const setPage = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQueryParams(prev => ({ ...prev, limit, page: 1 })); // Reset to first page
  }, []);

  // Filter controls
  const setFilters = useCallback((filters: Partial<TenantFilters>) => {
    setQueryParams(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, ...filters } as TenantFilters, 
      page: 1 // Reset to first page when filters change
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setQueryParams(prev => ({ 
      ...prev, 
      filters: DEFAULT_FILTERS, 
      page: 1 
    }));
  }, []);

  // Sort controls
  const setSort = useCallback((sort: TenantSortParams) => {
    setQueryParams(prev => ({ ...prev, sort, page: 1 })); // Reset to first page
  }, []);

  // Manual refetch
  const refetch = useCallback(() => {
    fetchTenants();
  }, [fetchTenants]);

  return {
    data,
    isLoading,
    error,
    pagination,
    queryParams,
    setPage,
    setLimit,
    setFilters,
    setSort,
    refetch,
    resetFilters,
  };
}

export default useFetchTenants; 