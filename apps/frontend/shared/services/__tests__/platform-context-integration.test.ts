/**
 * Platform Context Integration Tests
 * 
 * Tests for edge cases, error handling, and performance optimization
 * in the PlatformContext implementation.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { PlatformProvider, usePlatform } from '@/context/PlatformContext';
import { platformContextService } from '@/shared/services/platform-context.service';
import { PlatformTenant } from '@/shared/types/platform.types';
import { TenantResolutionError } from '@/shared/services/tenant-resolution-errors';

// Mock the platform context service
jest.mock('@/shared/services/platform-context.service');
jest.mock('@/shared/utils/contextUtils');

const mockPlatformContextService = platformContextService as jest.Mocked<typeof platformContextService>;

// Test component to access context
const TestComponent: React.FC = () => {
  const platform = usePlatform();
  return (
    <div>
      <div data-testid="is-platform">{platform.isPlatform ? 'true' : 'false'}</div>
      <div data-testid="tenant-id">{platform.tenantId || 'null'}</div>
      <div data-testid="is-loading">{platform.isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{platform.error || 'null'}</div>
      <div data-testid="tenant-subdomain">{platform.tenantSubdomain || 'null'}</div>
      <button 
        data-testid="refresh-button" 
        onClick={() => platform.refreshTenant()}
      >
        Refresh
      </button>
      <button 
        data-testid="retry-button" 
        onClick={() => platform.retryTenantResolution()}
      >
        Retry
      </button>
      <button 
        data-testid="clear-error-button" 
        onClick={() => platform.clearError()}
      >
        Clear Error
      </button>
    </div>
  );
};

describe('PlatformContext Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        host: 'test.lvh.me',
        pathname: '/dashboard',
      },
      writable: true,
    });

    // Mock contextUtils
    const contextUtils = require('@/shared/utils/contextUtils');
    contextUtils.isPlatformHost.mockReturnValue(false);
    contextUtils.getTenantSubdomain.mockReturnValue('test');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tenant Metadata Resolution', () => {
    it('should handle successful tenant metadata resolution', async () => {
      const mockTenant: PlatformTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        subdomain: 'test',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: mockTenant,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      mockPlatformContextService.getCurrentTenantId.mockReturnValue('test-tenant-id');
      mockPlatformContextService.refreshTenantMetadata.mockResolvedValue();

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('test-tenant-id');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('should handle tenant metadata resolution errors with fallback', async () => {
      const mockError = new TenantResolutionError(
        'Network error',
        'NETWORK_ERROR',
        'Failed to connect to server'
      );

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: mockError,
      });

      mockPlatformContextService.getCurrentTenantId.mockReturnValue(null);
      mockPlatformContextService.refreshTenantMetadata.mockRejectedValue(mockError);

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect to server');
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle invalid tenant subdomains gracefully', async () => {
      const contextUtils = require('@/shared/utils/contextUtils');
      contextUtils.getTenantSubdomain.mockReturnValue('invalid-tenant');

      const mockError = new TenantResolutionError(
        'Tenant not found',
        'TENANT_NOT_FOUND',
        'The requested tenant does not exist'
      );

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'invalid-tenant',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: mockError,
      });

      mockPlatformContextService.refreshTenantMetadata.mockRejectedValue(mockError);

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('The requested tenant does not exist');
        expect(screen.getByTestId('tenant-subdomain')).toHaveTextContent('invalid-tenant');
      });
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should support manual retry after error', async () => {
      const mockError = new TenantResolutionError(
        'Temporary error',
        'TEMPORARY_ERROR',
        'Temporary network issue'
      );

      // Initially return error state
      mockPlatformContextService.getState.mockReturnValueOnce({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: mockError,
      });

      // After retry, return success state
      const mockTenant: PlatformTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        subdomain: 'test',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPlatformContextService.getState.mockReturnValueOnce({
        isPlatform: false,
        currentTenant: mockTenant,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      mockPlatformContextService.getCurrentTenantId.mockReturnValue('test-tenant-id');
      mockPlatformContextService.refreshTenantMetadata.mockResolvedValueOnce();

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      // Initially should show error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Temporary network issue');
      });

      // Click retry button
      await act(async () => {
        screen.getByTestId('retry-button').click();
      });

      // Should resolve after retry
      await waitFor(() => {
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('test-tenant-id');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('should support manual error clearing', async () => {
      const mockError = new TenantResolutionError(
        'Some error',
        'GENERAL_ERROR',
        'An error occurred'
      );

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: mockError,
      });

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      // Initially should show error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('An error occurred');
      });

      // Click clear error button
      await act(async () => {
        screen.getByTestId('clear-error-button').click();
      });

      // Error should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });
  });

  describe('Public Page Optimization', () => {
    it('should skip tenant metadata resolution on login page', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          host: 'test.lvh.me',
          pathname: '/login',
        },
        writable: true,
      });

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      // Should not call refreshTenantMetadata on login page
      expect(mockPlatformContextService.refreshTenantMetadata).not.toHaveBeenCalled();
    });

    it('should skip tenant metadata resolution on signup page', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          host: 'test.lvh.me',
          pathname: '/signup',
        },
        writable: true,
      });

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      // Should not call refreshTenantMetadata on signup page
      expect(mockPlatformContextService.refreshTenantMetadata).not.toHaveBeenCalled();
    });

    it('should skip tenant metadata resolution on auth/* pages', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          host: 'test.lvh.me',
          pathname: '/auth/callback',
        },
        writable: true,
      });

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );

      // Should not call refreshTenantMetadata on auth pages
      expect(mockPlatformContextService.refreshTenantMetadata).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should provide performance metrics in development', async () => {
      const mockMetrics = {
        cacheHitRate: 0.85,
        averageResponseTime: 120,
        totalRequests: 50,
        failureRate: 0.02,
      };

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      mockPlatformContextService.getPerformanceMetrics.mockReturnValue(mockMetrics);

      const TestComponentWithMetrics: React.FC = () => {
        const { getPerformanceMetrics } = usePlatform();
        const metrics = getPerformanceMetrics();
        
        return (
          <div>
            <div data-testid="cache-hit-rate">{metrics?.cacheHitRate || 'null'}</div>
            <div data-testid="response-time">{metrics?.averageResponseTime || 'null'}</div>
          </div>
        );
      };

      render(
        <PlatformProvider>
          <TestComponentWithMetrics />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cache-hit-rate')).toHaveTextContent('0.85');
        expect(screen.getByTestId('response-time')).toHaveTextContent('120');
      });
    });

    it('should provide debug info in development', async () => {
      const mockDebugInfo = {
        cacheSize: 5,
        circuitBreakerState: 'CLOSED',
        lastErrorTime: null,
        requestCount: 25,
      };

      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      mockPlatformContextService.getDebugInfo.mockReturnValue(mockDebugInfo);

      const TestComponentWithDebug: React.FC = () => {
        const { getDebugInfo } = usePlatform();
        const debugInfo = getDebugInfo();
        
        return (
          <div>
            <div data-testid="cache-size">{debugInfo?.cacheSize || 'null'}</div>
            <div data-testid="circuit-breaker">{debugInfo?.circuitBreakerState || 'null'}</div>
          </div>
        );
      };

      render(
        <PlatformProvider>
          <TestComponentWithDebug />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cache-size')).toHaveTextContent('5');
        expect(screen.getByTestId('circuit-breaker')).toHaveTextContent('CLOSED');
      });
    });
  });

  describe('State Synchronization', () => {
    it('should efficiently sync state changes without excessive re-renders', async () => {
      let renderCount = 0;
      
      const TestComponentWithRenderCount: React.FC = () => {
        renderCount++;
        const platform = usePlatform();
        
        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="tenant-id">{platform.tenantId || 'null'}</div>
          </div>
        );
      };

      const mockTenant: PlatformTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        subdomain: 'test',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial state
      mockPlatformContextService.getState.mockReturnValueOnce({
        isPlatform: false,
        currentTenant: null,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: true,
        error: null,
      });

      // State with tenant loaded
      mockPlatformContextService.getState.mockReturnValue({
        isPlatform: false,
        currentTenant: mockTenant,
        tenantSubdomain: 'test',
        baseDomain: 'lvh.me',
        isLoading: false,
        error: null,
      });

      mockPlatformContextService.getCurrentTenantId.mockReturnValue('test-tenant-id');

      render(
        <PlatformProvider>
          <TestComponentWithRenderCount />
        </PlatformProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('test-tenant-id');
      });

      // Should not have excessive re-renders
      expect(renderCount).toBeLessThan(10);
    });
  });
}); 