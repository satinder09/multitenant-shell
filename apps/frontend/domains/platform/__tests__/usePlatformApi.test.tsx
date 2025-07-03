/**
 * 🧪 PLATFORM HOOKS BASIC TEST SUITE
 * 
 * Basic testing for platform hooks including:
 * - Hook initialization
 * - Type safety validation
 * - Error handling
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

import {
  usePlatformTenants,
  useCreatePlatformTenant,
  useUpdatePlatformTenant,
  useDeletePlatformTenant,
  useActivatePlatformTenant,
  useDeactivatePlatformTenant,
  usePlatformUsers,
  useCreatePlatformUser,
  useUpdatePlatformUser,
  useDeletePlatformUser,
  useStartPlatformImpersonation,
  useEndPlatformImpersonation,
  usePlatformStats,
} from '../hooks/usePlatformApi';
import { 
  CreatePlatformTenantRequest,
  CreatePlatformUserRequest,
} from '@/shared/types/platform.types';

// Mock the platform API client
jest.mock('../services/platformApiClient', () => ({
  platformApiClient: {
    getTenants: jest.fn(),
    getTenant: jest.fn(),
    createTenant: jest.fn(),
    updateTenant: jest.fn(),
    deleteTenant: jest.fn(),
    activateTenant: jest.fn(),
    deactivateTenant: jest.fn(),
    getUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    startImpersonation: jest.fn(),
    endImpersonation: jest.fn(),
    getStats: jest.fn(),
  },
}));

describe('Platform Hooks Basic Tests', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => React.ReactElement;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  describe('Query Hooks', () => {
    it('should initialize platform stats hook', () => {
      const { result } = renderHook(() => usePlatformStats(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should initialize platform tenants hook', () => {
      const { result } = renderHook(() => usePlatformTenants(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should initialize platform users hook', () => {
      const { result } = renderHook(() => usePlatformUsers(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Mutation Hooks', () => {
    it('should initialize create tenant mutation', () => {
      const { result } = renderHook(() => useCreatePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
    });

    it('should initialize update tenant mutation', () => {
      const { result } = renderHook(() => useUpdatePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize delete tenant mutation', () => {
      const { result } = renderHook(() => useDeletePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize activate tenant mutation', () => {
      const { result } = renderHook(() => useActivatePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize deactivate tenant mutation', () => {
      const { result } = renderHook(() => useDeactivatePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize create user mutation', () => {
      const { result } = renderHook(() => useCreatePlatformUser(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize update user mutation', () => {
      const { result } = renderHook(() => useUpdatePlatformUser(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize delete user mutation', () => {
      const { result } = renderHook(() => useDeletePlatformUser(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize start impersonation mutation', () => {
      const { result } = renderHook(() => useStartPlatformImpersonation(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should initialize end impersonation mutation', () => {
      const { result } = renderHook(() => useEndPlatformImpersonation(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for tenant creation', () => {
      const { result } = renderHook(() => useCreatePlatformTenant(), { wrapper });
      
      const validRequest: CreatePlatformTenantRequest = {
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        planType: 'enterprise',
      };

      // This should not throw compilation errors
      expect(() => {
        result.current.mutate(validRequest);
      }).not.toThrow();
    });

    it('should enforce correct types for user creation', () => {
      const { result } = renderHook(() => useCreatePlatformUser(), { wrapper });
      
      const validRequest: CreatePlatformUserRequest = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      };

      // This should not throw compilation errors
      expect(() => {
        result.current.mutate(validRequest);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization without errors', () => {
      const { result } = renderHook(() => usePlatformStats(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.isError).toBe(false);
    });

    it('should handle mutation initialization without errors', () => {
      const { result } = renderHook(() => useCreatePlatformTenant(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.isError).toBe(false);
    });
  });
}); 