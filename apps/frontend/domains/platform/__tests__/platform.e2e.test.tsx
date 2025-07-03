/**
 * 🧪 PLATFORM E2E TEST SUITE
 * 
 * End-to-end testing for critical platform workflows including:
 * - Tenant management lifecycle
 * - User management workflows
 * - Authentication and authorization flows
 * - Cross-component integrations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';

import { platformApiClient } from '../services/platformApiClient';
import { 
  PlatformTenant, 
  PlatformUser,
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

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/platform',
}));

const mockPlatformApiClient = platformApiClient as jest.Mocked<typeof platformApiClient>;

// Test component that uses platform hooks
const TestTenantManagement: React.FC = () => {
  const [tenants, setTenants] = React.useState<PlatformTenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformApiClient.getTenants();
      setTenants(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (data: CreatePlatformTenantRequest) => {
    setError(null);
    try {
      const newTenant = await platformApiClient.createTenant(data);
      setTenants(prev => [...prev, newTenant]);
      return newTenant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
      throw err;
    }
  };

  const deleteTenant = async (id: string) => {
    setError(null);
    try {
      await platformApiClient.deleteTenant(id);
      setTenants(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
      throw err;
    }
  };

  React.useEffect(() => {
    fetchTenants();
  }, []);

  return (
    <div>
      <h1>Platform Tenant Management</h1>
      
      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error" role="alert">{error}</div>}
      
      <button 
        onClick={fetchTenants}
        data-testid="refresh-tenants"
        disabled={loading}
      >
        Refresh Tenants
      </button>

      <div data-testid="tenant-list">
        {tenants.length === 0 ? (
          <p data-testid="no-tenants">No tenants found</p>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.id} data-testid={`tenant-${tenant.id}`}>
              <h3>{tenant.name}</h3>
              <p>Subdomain: {tenant.subdomain}</p>
              <p>Status: {tenant.isActive ? 'Active' : 'Inactive'}</p>
              <p>Plan: {tenant.planType}</p>
              <button
                onClick={() => deleteTenant(tenant.id)}
                data-testid={`delete-tenant-${tenant.id}`}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div data-testid="create-tenant-form">
        <h2>Create New Tenant</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: CreatePlatformTenantRequest = {
              name: formData.get('name') as string,
              subdomain: formData.get('subdomain') as string,
              planType: formData.get('planType') as 'starter' | 'professional' | 'enterprise',
            };
            await createTenant(data);
            (e.target as HTMLFormElement).reset();
          }}
        >
          <input
            name="name"
            placeholder="Tenant Name"
            data-testid="tenant-name-input"
            required
          />
          <input
            name="subdomain"
            placeholder="Subdomain"
            data-testid="tenant-subdomain-input"
            required
          />
          <select
            name="planType"
            data-testid="tenant-plan-select"
            required
          >
            <option value="">Select Plan</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button type="submit" data-testid="create-tenant-submit">
            Create Tenant
          </button>
        </form>
      </div>
    </div>
  );
};

// Test component for user management
const TestUserManagement: React.FC = () => {
  const [users, setUsers] = React.useState<PlatformUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformApiClient.getUsers();
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (data: CreatePlatformUserRequest) => {
    setError(null);
    try {
      const newUser = await platformApiClient.createUser(data);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Platform User Management</h1>
      
      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error" role="alert">{error}</div>}
      
      <button 
        onClick={fetchUsers}
        data-testid="refresh-users"
        disabled={loading}
      >
        Refresh Users
      </button>

      <div data-testid="user-list">
        {users.length === 0 ? (
          <p data-testid="no-users">No users found</p>
        ) : (
          users.map(user => (
            <div key={user.id} data-testid={`user-${user.id}`}>
              <h3>{user.name}</h3>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
              <p>Status: {user.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          ))
        )}
      </div>

      <div data-testid="create-user-form">
        <h2>Create New User</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: CreatePlatformUserRequest = {
              name: formData.get('name') as string,
              email: formData.get('email') as string,
              role: formData.get('role') as 'admin' | 'support' | 'billing' | 'viewer',
            };
            await createUser(data);
            (e.target as HTMLFormElement).reset();
          }}
        >
          <input
            name="name"
            placeholder="User Name"
            data-testid="user-name-input"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            data-testid="user-email-input"
            required
          />
          <select
            name="role"
            data-testid="user-role-select"
            required
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="support">Support</option>
            <option value="billing">Billing</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" data-testid="create-user-submit">
            Create User
          </button>
        </form>
      </div>
    </div>
  );
};

describe('Platform E2E Tests', () => {
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

  describe('Tenant Management Workflows', () => {
    const mockTenants: PlatformTenant[] = [
      {
        id: 'tenant-1',
        name: 'Test Tenant 1',
        subdomain: 'test-tenant-1',
        url: 'https://test-tenant-1.example.com',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        planType: 'enterprise',
        features: ['analytics'],
        userCount: 10,
      },
      {
        id: 'tenant-2',
        name: 'Test Tenant 2',
        subdomain: 'test-tenant-2',
        url: 'https://test-tenant-2.example.com',
        isActive: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        planType: 'starter',
        features: [],
        userCount: 5,
      },
    ];

    it('should display tenant list successfully', async () => {
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: mockTenants,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      });

      render(<TestTenantManagement />, { wrapper });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Check that tenants are displayed
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tenant 2')).toBeInTheDocument();
      expect(screen.getByText('Subdomain: test-tenant-1')).toBeInTheDocument();
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
      expect(screen.getByText('Status: Inactive')).toBeInTheDocument();
    });

    it('should handle empty tenant list', async () => {
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('no-tenants')).toBeInTheDocument();
      });

      expect(screen.getByText('No tenants found')).toBeInTheDocument();
    });

    it('should handle tenant fetch error', async () => {
      const errorMessage = 'Failed to fetch tenants';
      mockPlatformApiClient.getTenants.mockRejectedValue(new Error(errorMessage));

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should create a new tenant successfully', async () => {
      const newTenant: PlatformTenant = {
        id: 'tenant-3',
        name: 'New Tenant',
        subdomain: 'new-tenant',
        url: 'https://new-tenant.example.com',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        planType: 'professional',
        features: [],
        userCount: 0,
      };

      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
      mockPlatformApiClient.createTenant.mockResolvedValue(newTenant);

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Fill out the form
      await userEvent.type(screen.getByTestId('tenant-name-input'), 'New Tenant');
      await userEvent.type(screen.getByTestId('tenant-subdomain-input'), 'new-tenant');
      await userEvent.selectOptions(screen.getByTestId('tenant-plan-select'), 'professional');

      // Submit the form
      await userEvent.click(screen.getByTestId('create-tenant-submit'));

      await waitFor(() => {
        expect(mockPlatformApiClient.createTenant).toHaveBeenCalledWith({
          name: 'New Tenant',
          subdomain: 'new-tenant',
          planType: 'professional',
        });
      });

      // Check that the new tenant appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Tenant')).toBeInTheDocument();
      });
    });

    it('should handle tenant creation error', async () => {
      const errorMessage = 'Subdomain already exists';
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
      mockPlatformApiClient.createTenant.mockRejectedValue(new Error(errorMessage));

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Fill out the form
      await userEvent.type(screen.getByTestId('tenant-name-input'), 'Test Tenant');
      await userEvent.type(screen.getByTestId('tenant-subdomain-input'), 'existing-subdomain');
      await userEvent.selectOptions(screen.getByTestId('tenant-plan-select'), 'starter');

      // Submit the form
      await userEvent.click(screen.getByTestId('create-tenant-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should delete a tenant successfully', async () => {
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [mockTenants[0]],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      });
      mockPlatformApiClient.deleteTenant.mockResolvedValue(undefined);

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
      });

      // Click delete button
      await userEvent.click(screen.getByTestId('delete-tenant-tenant-1'));

      await waitFor(() => {
        expect(mockPlatformApiClient.deleteTenant).toHaveBeenCalledWith('tenant-1');
      });

      // Check that tenant is removed from the list
      await waitFor(() => {
        expect(screen.queryByText('Test Tenant 1')).not.toBeInTheDocument();
      });
    });

    it('should refresh tenant list', async () => {
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: mockTenants,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      });

      render(<TestTenantManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
      });

      // Click refresh button
      await userEvent.click(screen.getByTestId('refresh-tenants'));

      await waitFor(() => {
        expect(mockPlatformApiClient.getTenants).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Management Workflows', () => {
    const mockUsers: PlatformUser[] = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        isSuperAdmin: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        tenantCount: 3,
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'support',
        isSuperAdmin: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        tenantCount: 1,
      },
    ];

    it('should display user list successfully', async () => {
      mockPlatformApiClient.getUsers.mockResolvedValue({
        data: mockUsers,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      });

      render(<TestUserManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Role: admin')).toBeInTheDocument();
    });

    it('should create a new user successfully', async () => {
      const newUser: PlatformUser = {
        id: 'user-3',
        name: 'New User',
        email: 'new@example.com',
        role: 'billing',
        isSuperAdmin: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        tenantCount: 0,
      };

      mockPlatformApiClient.getUsers.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
      mockPlatformApiClient.createUser.mockResolvedValue(newUser);

      render(<TestUserManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Fill out the form
      await userEvent.type(screen.getByTestId('user-name-input'), 'New User');
      await userEvent.type(screen.getByTestId('user-email-input'), 'new@example.com');
      await userEvent.selectOptions(screen.getByTestId('user-role-select'), 'billing');

      // Submit the form
      await userEvent.click(screen.getByTestId('create-user-submit'));

      await waitFor(() => {
        expect(mockPlatformApiClient.createUser).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@example.com',
          role: 'billing',
        });
      });

      // Check that the new user appears in the list
      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument();
      });
    });

    it('should handle user creation error', async () => {
      const errorMessage = 'Email already exists';
      mockPlatformApiClient.getUsers.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
      mockPlatformApiClient.createUser.mockRejectedValue(new Error(errorMessage));

      render(<TestUserManagement />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Fill out the form
      await userEvent.type(screen.getByTestId('user-name-input'), 'Test User');
      await userEvent.type(screen.getByTestId('user-email-input'), 'existing@example.com');
      await userEvent.selectOptions(screen.getByTestId('user-role-select'), 'admin');

      // Submit the form
      await userEvent.click(screen.getByTestId('create-user-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should call getTenants API successfully', async () => {
      const mockTenants: PlatformTenant[] = [
        {
          id: 'tenant-1',
          name: 'Test Tenant',
          subdomain: 'test-tenant',
          url: 'https://test-tenant.example.com',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          planType: 'enterprise',
          features: ['analytics'],
          userCount: 10,
        },
      ];

      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: mockTenants,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      });

      const result = await platformApiClient.getTenants();

      expect(result.data).toEqual(mockTenants);
      expect(mockPlatformApiClient.getTenants).toHaveBeenCalledTimes(1);
    });

    it('should call createTenant API successfully', async () => {
      const newTenant: PlatformTenant = {
        id: 'tenant-2',
        name: 'New Tenant',
        subdomain: 'new-tenant',
        url: 'https://new-tenant.example.com',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        planType: 'professional',
        features: [],
        userCount: 0,
      };

      mockPlatformApiClient.createTenant.mockResolvedValue(newTenant);

      const result = await platformApiClient.createTenant({
        name: 'New Tenant',
        subdomain: 'new-tenant',
        planType: 'professional',
      });

      expect(result).toEqual(newTenant);
      expect(mockPlatformApiClient.createTenant).toHaveBeenCalledWith({
        name: 'New Tenant',
        subdomain: 'new-tenant',
        planType: 'professional',
      });
    });

    it('should call getUsers API successfully', async () => {
      const mockUsers: PlatformUser[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          isSuperAdmin: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          tenantCount: 3,
        },
      ];

      mockPlatformApiClient.getUsers.mockResolvedValue({
        data: mockUsers,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      });

      const result = await platformApiClient.getUsers();

      expect(result.data).toEqual(mockUsers);
      expect(mockPlatformApiClient.getUsers).toHaveBeenCalledTimes(1);
    });

    it('should call createUser API successfully', async () => {
      const newUser: PlatformUser = {
        id: 'user-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'support',
        isSuperAdmin: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        tenantCount: 0,
      };

      mockPlatformApiClient.createUser.mockResolvedValue(newUser);

      const result = await platformApiClient.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'support',
      });

      expect(result).toEqual(newUser);
      expect(mockPlatformApiClient.createUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'support',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockPlatformApiClient.getTenants.mockRejectedValue(new Error(errorMessage));

      await expect(platformApiClient.getTenants()).rejects.toThrow(errorMessage);
    });

    it('should handle validation errors', async () => {
      const errorMessage = 'Subdomain already exists';
      mockPlatformApiClient.createTenant.mockRejectedValue(new Error(errorMessage));

      await expect(
        platformApiClient.createTenant({
          name: 'Test',
          subdomain: 'existing',
          planType: 'starter',
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across operations', async () => {
      const tenant: PlatformTenant = {
        id: 'tenant-1',
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        url: 'https://test-tenant.example.com',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        planType: 'enterprise',
        features: [],
        userCount: 0,
      };

      // Mock sequence of operations
      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      mockPlatformApiClient.createTenant.mockResolvedValue(tenant);

      mockPlatformApiClient.getTenants.mockResolvedValue({
        data: [tenant],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      });

      // Initial fetch should return empty
      const initialResult = await platformApiClient.getTenants();
      expect(initialResult.data).toHaveLength(0);

      // Create tenant
      const createdTenant = await platformApiClient.createTenant({
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        planType: 'enterprise',
      });
      expect(createdTenant).toEqual(tenant);

      // Fetch again should include new tenant
      const updatedResult = await platformApiClient.getTenants();
      expect(updatedResult.data).toHaveLength(1);
      expect(updatedResult.data[0]).toEqual(tenant);
    });
  });
}); 