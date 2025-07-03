/**
 * 🧪 PLATFORM API CLIENT TEST SUITE
 * 
 * Comprehensive testing for platform operations including:
 * - Tenant management CRUD operations
 * - User management and access control
 * - Impersonation and security features
 * - Error handling and edge cases
 * - Type safety validation
 */

import { platformApiClient } from '../services/platformApiClient';
import { 
  PlatformTenant, 
  CreatePlatformTenantRequest, 
  UpdatePlatformTenantRequest,
  PlatformUser,
  CreatePlatformUserRequest,
  UpdatePlatformUserRequest,
  PlatformTenantImpersonationSession 
} from '@/shared/types/platform.types';

// Mock the base API client
jest.mock('@/shared/services/api/base-client', () => ({
  BaseApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    addRequestInterceptor: jest.fn(),
    addErrorInterceptor: jest.fn(),
  })),
}));

describe('PlatformApiClient', () => {
  let mockApiClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the mocked API client instance
    mockApiClient = (platformApiClient as any).client;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Platform Statistics', () => {
    it('should fetch platform stats successfully', async () => {
      const mockStats = {
        totalTenants: 50,
        activeTenants: 45,
        totalUsers: 200,
        activeUsers: 180,
        systemHealth: 'healthy' as const,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get = jest.fn().mockResolvedValue(mockStats);

      const result = await platformApiClient.getStats();

      expect(mockApiClient.get).toHaveBeenCalledWith('/stats');
      expect(result).toEqual(mockStats);
    });

    it('should handle stats fetch error gracefully', async () => {
      const mockError = new Error('Failed to fetch stats');
      mockApiClient.get = jest.fn().mockRejectedValue(mockError);

      await expect(platformApiClient.getStats()).rejects.toThrow('Failed to fetch stats');
    });
  });

  describe('Tenant Management', () => {
    const mockTenant: PlatformTenant = {
      id: 'tenant-1',
      name: 'Test Tenant',
      subdomain: 'test-tenant',
      url: 'https://test-tenant.example.com',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      planType: 'enterprise',
      features: ['advanced-analytics', 'custom-branding'],
      userCount: 25,
    };

    describe('getTenants', () => {
      it('should fetch paginated tenants successfully', async () => {
        const mockResponse = {
          data: [mockTenant],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        };

        mockApiClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await platformApiClient.getTenants({ page: 1, limit: 10 });

        expect(mockApiClient.get).toHaveBeenCalledWith('/tenants', { page: 1, limit: 10 });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getTenant', () => {
      it('should fetch single tenant by ID', async () => {
        mockApiClient.get = jest.fn().mockResolvedValue(mockTenant);

        const result = await platformApiClient.getTenant('tenant-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/tenants/tenant-1');
        expect(result).toEqual(mockTenant);
      });

      it('should handle tenant not found error', async () => {
        const mockError = new Error('Tenant not found');
        mockApiClient.get = jest.fn().mockRejectedValue(mockError);

        await expect(platformApiClient.getTenant('non-existent')).rejects.toThrow('Tenant not found');
      });
    });

    describe('createTenant', () => {
      it('should create tenant successfully', async () => {
        const createRequest: CreatePlatformTenantRequest = {
          name: 'New Tenant',
          subdomain: 'new-tenant',
          planType: 'starter',
        };

        const expectedTenant: PlatformTenant = {
          ...mockTenant,
          ...createRequest,
          id: 'tenant-2',
        };

        mockApiClient.post = jest.fn().mockResolvedValue(expectedTenant);

        const result = await platformApiClient.createTenant(createRequest);

        expect(mockApiClient.post).toHaveBeenCalledWith('/tenants', createRequest);
        expect(result).toEqual(expectedTenant);
      });

      it('should validate required fields', async () => {
        const invalidRequest = {
          name: '', // Empty name should fail
          subdomain: 'test',
        };

        const mockError = new Error('Name is required');
        mockApiClient.post = jest.fn().mockRejectedValue(mockError);

        await expect(platformApiClient.createTenant(invalidRequest as any)).rejects.toThrow('Name is required');
      });
    });

    describe('updateTenant', () => {
      it('should update tenant successfully', async () => {
        const updateRequest: UpdatePlatformTenantRequest = {
          name: 'Updated Tenant Name',
          isActive: false,
        };

        const updatedTenant: PlatformTenant = {
          ...mockTenant,
          ...updateRequest,
        };

        mockApiClient.patch = jest.fn().mockResolvedValue(updatedTenant);

        const result = await platformApiClient.updateTenant('tenant-1', updateRequest);

        expect(mockApiClient.patch).toHaveBeenCalledWith('/tenants/tenant-1', updateRequest);
        expect(result).toEqual(updatedTenant);
      });
    });

    describe('deleteTenant', () => {
      it('should delete tenant successfully', async () => {
        mockApiClient.delete = jest.fn().mockResolvedValue(undefined);

        await platformApiClient.deleteTenant('tenant-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/tenants/tenant-1');
      });

      it('should handle delete error for non-existent tenant', async () => {
        const mockError = new Error('Tenant not found');
        mockApiClient.delete = jest.fn().mockRejectedValue(mockError);

        await expect(platformApiClient.deleteTenant('non-existent')).rejects.toThrow('Tenant not found');
      });
    });

    describe('activateTenant', () => {
      it('should activate tenant successfully', async () => {
        const activatedTenant: PlatformTenant = {
          ...mockTenant,
          isActive: true,
        };

        mockApiClient.post = jest.fn().mockResolvedValue(activatedTenant);

        const result = await platformApiClient.activateTenant('tenant-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/tenants/tenant-1/activate');
        expect(result).toEqual(activatedTenant);
      });
    });

    describe('deactivateTenant', () => {
      it('should deactivate tenant successfully', async () => {
        const deactivatedTenant: PlatformTenant = {
          ...mockTenant,
          isActive: false,
        };

        mockApiClient.post = jest.fn().mockResolvedValue(deactivatedTenant);

        const result = await platformApiClient.deactivateTenant('tenant-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/tenants/tenant-1/deactivate');
        expect(result).toEqual(deactivatedTenant);
      });
    });
  });

  describe('User Management', () => {
    const mockUser: PlatformUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      isSuperAdmin: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      tenantCount: 3,
    };

    describe('getUsers', () => {
      it('should fetch paginated users successfully', async () => {
        const mockResponse = {
          data: [mockUser],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        };

        mockApiClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await platformApiClient.getUsers({ page: 1, limit: 10 });

        expect(mockApiClient.get).toHaveBeenCalledWith('/users', { page: 1, limit: 10 });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createUser', () => {
      it('should create user successfully', async () => {
        const createRequest: CreatePlatformUserRequest = {
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'support',
        };

        const expectedUser: PlatformUser = {
          ...mockUser,
          ...createRequest,
          id: 'user-2',
        };

        mockApiClient.post = jest.fn().mockResolvedValue(expectedUser);

        const result = await platformApiClient.createUser(createRequest);

        expect(mockApiClient.post).toHaveBeenCalledWith('/users', createRequest);
        expect(result).toEqual(expectedUser);
      });

      it('should validate email format', async () => {
        const invalidRequest: CreatePlatformUserRequest = {
          name: 'Test User',
          email: 'invalid-email',
          role: 'admin',
        };

        const mockError = new Error('Invalid email format');
        mockApiClient.post = jest.fn().mockRejectedValue(mockError);

        await expect(platformApiClient.createUser(invalidRequest)).rejects.toThrow('Invalid email format');
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const updateRequest: UpdatePlatformUserRequest = {
          name: 'John Smith',
          role: 'super_admin',
        };

        const updatedUser: PlatformUser = {
          ...mockUser,
          ...updateRequest,
          isSuperAdmin: true,
        };

        mockApiClient.patch = jest.fn().mockResolvedValue(updatedUser);

        const result = await platformApiClient.updateUser('user-1', updateRequest);

        expect(mockApiClient.patch).toHaveBeenCalledWith('/users/user-1', updateRequest);
        expect(result).toEqual(updatedUser);
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        mockApiClient.delete = jest.fn().mockResolvedValue(undefined);

        await platformApiClient.deleteUser('user-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1');
      });
    });
  });

  describe('Impersonation Features', () => {
    const mockSession: PlatformTenantImpersonationSession = {
      id: 'session-1',
      tenantId: 'tenant-1',
      tenantUserId: 'tenant-user-1',
      platformUserId: 'platform-user-1',
      reason: 'Customer support request',
      startTime: '2024-01-01T00:00:00Z',
      isActive: true,
    };

    describe('startImpersonation', () => {
      it('should start impersonation session successfully', async () => {
        mockApiClient.post = jest.fn().mockResolvedValue(mockSession);

        const result = await platformApiClient.startImpersonation('tenant-1', 'user-1', 'Support request');

        expect(mockApiClient.post).toHaveBeenCalledWith('/impersonation/start', {
          tenantId: 'tenant-1',
          userId: 'user-1',
          reason: 'Support request',
        });
        expect(result).toEqual(mockSession);
      });

      it('should require reason for impersonation', async () => {
        const mockError = new Error('Reason is required for impersonation');
        mockApiClient.post = jest.fn().mockRejectedValue(mockError);

        await expect(
          platformApiClient.startImpersonation('tenant-1', 'user-1', '')
        ).rejects.toThrow('Reason is required for impersonation');
      });
    });

    describe('endImpersonation', () => {
      it('should end impersonation session successfully', async () => {
        mockApiClient.post = jest.fn().mockResolvedValue(undefined);

        await platformApiClient.endImpersonation('session-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/impersonation/session-1/end');
      });
    });

    describe('getImpersonationSessions', () => {
      it('should fetch active impersonation sessions', async () => {
        const mockSessions = [mockSession];
        mockApiClient.get = jest.fn().mockResolvedValue(mockSessions);

        const result = await platformApiClient.getImpersonationSessions();

        expect(mockApiClient.get).toHaveBeenCalledWith('/impersonation/sessions');
        expect(result).toEqual(mockSessions);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockApiClient.get = jest.fn().mockRejectedValue(networkError);

      await expect(platformApiClient.getStats()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized errors', async () => {
      const authError = new Error('Unauthorized');
      mockApiClient.get = jest.fn().mockRejectedValue(authError);

      await expect(platformApiClient.getTenants()).rejects.toThrow('Unauthorized');
    });

    it('should handle 403 forbidden errors for platform access', async () => {
      const forbiddenError = new Error('Platform access denied');
      mockApiClient.get = jest.fn().mockRejectedValue(forbiddenError);

      await expect(platformApiClient.getUsers()).rejects.toThrow('Platform access denied');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockApiClient.post = jest.fn().mockRejectedValue(rateLimitError);

      await expect(
        platformApiClient.createTenant({ name: 'Test', subdomain: 'test' })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
}); 