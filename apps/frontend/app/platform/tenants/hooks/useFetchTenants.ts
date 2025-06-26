'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGenericFilter } from '@/lib/hooks/useGenericFilter';
import { TenantModel, TenantFilters, UseFetchTenantsReturn } from '../types';

export function useFetchTenants(
  initialFilters: TenantFilters = {},
  initialLimit: number = 10
): UseFetchTenantsReturn {
  const [fallbackMode, setFallbackMode] = useState(false);
  const [simpleData, setSimpleData] = useState<TenantModel[]>([]);
  const [simpleLoading, setSimpleLoading] = useState(false);
  const [simpleError, setSimpleError] = useState<string | null>(null);

  // Try the generic filter first
  const genericResult = useGenericFilter<TenantModel, TenantFilters>('tenants', {
    defaultLimit: initialLimit,
    defaultSort: { field: 'createdAt', direction: 'desc' },
    enableSavedSearches: true
  });

  // Simple fallback function
  const fetchSimpleData = useCallback(async () => {
    try {
      setSimpleLoading(true);
      setSimpleError(null);
      
      const response = await fetch('/api/tenants');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      
      const data = await response.json();
      const rawData = Array.isArray(data) ? data : (data.data || []);
      
      // Ensure all required fields are present for TenantModel compatibility
      const transformedData = rawData.map((tenant: any) => ({
        id: tenant.id || '',
        name: tenant.name || 'Unknown',
        subdomain: tenant.subdomain || 'unknown',
        description: tenant.description || '',
        isActive: tenant.isActive === true,
        accessLevel: tenant.accessLevel || 'read',
        userCount: tenant.userCount || 0,
        canAccess: tenant.canAccess === true,
        canImpersonate: tenant.canImpersonate === true,
        lastAccessed: tenant.lastAccessed ? new Date(tenant.lastAccessed) : undefined,
        createdAt: tenant.createdAt ? new Date(tenant.createdAt) : new Date(),
        updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt) : new Date(),
        permissions: tenant.permissions || [],
        createdBy: tenant.createdBy || null,
        createdById: tenant.createdById || null
      }));
      
      setSimpleData(transformedData);
    } catch (err) {
      console.error('Simple fetch error:', err);
      setSimpleError(err instanceof Error ? err.message : 'Failed to fetch tenants');
      setSimpleData([]);
    } finally {
      setSimpleLoading(false);
    }
  }, []);

  // Check if generic filter is failing and switch to fallback
  useEffect(() => {
    if (genericResult.error && !fallbackMode) {
      console.warn('Generic filter failed, switching to fallback mode');
      setFallbackMode(true);
      fetchSimpleData();
    }
  }, [genericResult.error, fallbackMode, fetchSimpleData]);

  // If in fallback mode, return simple data with limited functionality
  if (fallbackMode) {
    return {
      ...genericResult,
      data: simpleData,
      isLoading: simpleLoading,
      error: simpleError,
      refetch: fetchSimpleData,
      // Disable advanced features in fallback mode
      fieldDiscovery: null,
      savedSearches: [],
      complexFilter: null,
      setComplexFilter: () => {},
      saveCurrentSearch: async () => {},
      loadSavedSearch: async () => {},
      deleteSavedSearch: async () => {},
      toggleFavorite: async () => {}
    };
  }

  return genericResult;
}

export default useFetchTenants; 