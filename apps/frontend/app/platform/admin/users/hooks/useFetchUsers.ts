'use client';

import { useState, useEffect, useCallback } from 'react';
import type { 
  PlatformUser, 
  UseFetchUsersReturn, 
  UserQueryParams, 
  UserFilters, 
  UserSortParams,
  UserListResponse,
  Role
} from '@/domains/platform/types/user.types';

const DEFAULT_LIMIT = 10;
const DEFAULT_FILTERS: UserFilters = {
  search: '',
  status: 'all',
  role: 'all',
  tenantCount: 'all',
};
const DEFAULT_SORT: UserSortParams = {
  field: 'name',
  direction: 'asc',
};

export function useFetchUsers(): UseFetchUsersReturn {
  const [data, setData] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UserListResponse['pagination'] | null>(null);
  
  // Query parameters state
  const [queryParams, setQueryParams] = useState<UserQueryParams>({
    page: 1,
    limit: DEFAULT_LIMIT,
    filters: DEFAULT_FILTERS,
    sort: DEFAULT_SORT,
  });

  // Fetch roles (separate from users for better caching)
  const fetchRoles = useCallback(async () => {
    try {
      setIsLoadingRoles(true);
      setRolesError(null);
      
      const response = await fetch('/api/platform-rbac/roles');
      
      if (response.ok) {
        const rolesData = await response.json();
        setRoles(rolesData);
      } else {
        // Fallback to default roles if API fails
        console.warn('Failed to fetch roles, using fallback');
        setRoles([
          { id: 'admin', name: 'Administrator', description: 'Full system access' },
          { id: 'user', name: 'User', description: 'Standard user access' },
          { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRolesError(err instanceof Error ? err.message : 'Failed to fetch roles');
      // Fallback roles
      setRoles([
        { id: 'admin', name: 'Administrator', description: 'Full system access' },
        { id: 'user', name: 'User', description: 'Standard user access' },
        { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
      ]);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  // Fetch users with server-side pagination
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string
      const searchParams = new URLSearchParams();
      searchParams.set('page', queryParams.page.toString());
      searchParams.set('limit', queryParams.limit.toString());
      
      // Add filters
      if (queryParams.filters) {
        const { search, status, role, tenantCount, dateFrom, dateTo } = queryParams.filters;
        if (search && search.trim()) searchParams.set('search', search.trim());
        if (status && status !== 'all') searchParams.set('status', status);
        if (role && role !== 'all') searchParams.set('role', role);
        if (tenantCount && tenantCount !== 'all') searchParams.set('tenantCount', tenantCount);
        if (dateFrom) searchParams.set('dateFrom', dateFrom);
        if (dateTo) searchParams.set('dateTo', dateTo);
      }
      
      // Add sorting
      if (queryParams.sort) {
        searchParams.set('sortField', queryParams.sort.field as string);
        searchParams.set('sortDirection', queryParams.sort.direction);
      }

      const response = await fetch(`/api/platform/admin/users?${searchParams.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
      
      const responseData: UserListResponse = await response.json();
      
      setData(responseData.data);
      setPagination(responseData.pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Fetch users when query parameters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pagination controls
  const setPage = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQueryParams(prev => ({ ...prev, limit, page: 1 })); // Reset to first page
  }, []);

  // Filter controls
  const setFilters = useCallback((filters: Partial<UserFilters>) => {
    setQueryParams(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, ...filters } as UserFilters, 
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
  const setSort = useCallback((sort: UserSortParams) => {
    setQueryParams(prev => ({ ...prev, sort, page: 1 })); // Reset to first page
  }, []);

  // Manual refetch
  const refetch = useCallback(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

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
    // Role-specific data
    roles,
    isLoadingRoles,
    rolesError,
  };
}

export default useFetchUsers; 