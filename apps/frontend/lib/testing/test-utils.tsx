// Comprehensive frontend testing utilities
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { PlatformContext } from '../../context/PlatformContext';
import { ThemeProvider } from '../../context/theme-provider';

// Mock data generators
export class MockDataGenerator {
  static generateUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
      name: 'Test User',
      avatar: null,
      role: 'user',
      permissions: ['read:profile'],
      tenantId: 'tenant-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static generateTenant(overrides: Partial<any> = {}) {
    return {
      id: 'tenant-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Tenant',
      subdomain: 'test-' + Math.random().toString(36).substr(2, 5),
      isActive: true,
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static generateAuthState(overrides: Partial<any> = {}) {
    return {
      user: MockDataGenerator.generateUser(),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      ...overrides,
    };
  }

  static generatePlatformState(overrides: Partial<any> = {}) {
    return {
      tenant: MockDataGenerator.generateTenant(),
      isImpersonating: false,
      impersonationSession: null,
      isLoading: false,
      error: null,
      ...overrides,
    };
  }

  static generateApiResponse<T>(data: T, overrides: Partial<any> = {}) {
    return {
      success: true,
      data,
      message: 'Success',
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  static generateApiError(message: string = 'Test error', statusCode: number = 400) {
    return {
      success: false,
      error: {
        message,
        statusCode,
        code: 'TEST_ERROR',
        details: {},
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Mock contexts
export class MockContexts {
  static createAuthContext(overrides: Partial<any> = {}) {
    return {
      ...MockDataGenerator.generateAuthState(),
      login: jest.fn().mockResolvedValue({ success: true }),
      logout: jest.fn().mockResolvedValue(undefined),
      updateProfile: jest.fn().mockResolvedValue({ success: true }),
      refreshToken: jest.fn().mockResolvedValue({ success: true }),
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
      ...overrides,
    };
  }

  static createPlatformContext(overrides: Partial<any> = {}) {
    return {
      ...MockDataGenerator.generatePlatformState(),
      switchTenant: jest.fn().mockResolvedValue({ success: true }),
      startImpersonation: jest.fn().mockResolvedValue({ success: true }),
      endImpersonation: jest.fn().mockResolvedValue({ success: true }),
      updateTenant: jest.fn().mockResolvedValue({ success: true }),
      ...overrides,
    };
  }
}

// Test providers wrapper
interface TestProvidersProps {
  children: ReactNode;
  authContext?: any;
  platformContext?: any;
  queryClient?: QueryClient;
}

export function TestProviders({ 
  children, 
  authContext, 
  platformContext,
  queryClient 
}: TestProvidersProps) {
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const client = queryClient || defaultQueryClient;
  const auth = authContext || MockContexts.createAuthContext();
  const platform = platformContext || MockContexts.createPlatformContext();

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <PlatformContext.Provider value={platform}>
            {children}
          </PlatformContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: any;
  platformContext?: any;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authContext, platformContext, queryClient, ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders
        authContext={authContext}
        platformContext={platformContext}
        queryClient={queryClient}
      >
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// API mocking utilities
export class ApiMockHelper {
  static mockSuccessResponse<T>(data: T) {
    return jest.fn().mockResolvedValue(MockDataGenerator.generateApiResponse(data));
  }

  static mockErrorResponse(message: string = 'Test error', statusCode: number = 400) {
    return jest.fn().mockRejectedValue(MockDataGenerator.generateApiError(message, statusCode));
  }

  static mockLoadingResponse(delay: number = 1000) {
    return jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, delay))
    );
  }

  static mockPaginatedResponse<T>(items: T[], page: number = 1, limit: number = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return MockDataGenerator.generateApiResponse({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNext: endIndex < items.length,
        hasPrev: page > 1,
      },
    });
  }
}

// User interaction helpers
export class UserInteractionHelper {
  static async clickButton(buttonText: string | RegExp) {
    const button = screen.getByRole('button', { name: buttonText });
    await userEvent.click(button);
    return button;
  }

  static async fillInput(labelText: string | RegExp, value: string) {
    const input = screen.getByLabelText(labelText);
    await userEvent.clear(input);
    await userEvent.type(input, value);
    return input;
  }

  static async selectOption(selectLabel: string | RegExp, optionText: string | RegExp) {
    const select = screen.getByLabelText(selectLabel);
    await userEvent.selectOptions(select, screen.getByRole('option', { name: optionText }));
    return select;
  }

  static async submitForm(formName?: string | RegExp) {
    const form = formName 
      ? screen.getByRole('form', { name: formName })
      : screen.getByRole('form');
    
    fireEvent.submit(form);
    return form;
  }

  static async fillAndSubmitForm(fields: Record<string, string>, formName?: string | RegExp) {
    // Fill all fields
    for (const [label, value] of Object.entries(fields)) {
      await UserInteractionHelper.fillInput(label, value);
    }

    // Submit form
    return UserInteractionHelper.submitForm(formName);
  }

  static async waitForElement(text: string | RegExp, options?: any) {
    return waitFor(() => screen.getByText(text), options);
  }

  static async waitForElementToDisappear(text: string | RegExp, options?: any) {
    return waitFor(() => expect(screen.queryByText(text)).not.toBeInTheDocument(), options);
  }
}

// Assertion helpers
export class AssertionHelper {
  static expectElementToBeVisible(text: string | RegExp) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }

  static expectElementNotToBeVisible(text: string | RegExp) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }

  static expectButtonToBeDisabled(buttonText: string | RegExp) {
    expect(screen.getByRole('button', { name: buttonText })).toBeDisabled();
  }

  static expectButtonToBeEnabled(buttonText: string | RegExp) {
    expect(screen.getByRole('button', { name: buttonText })).toBeEnabled();
  }

  static expectInputToHaveValue(labelText: string | RegExp, value: string) {
    expect(screen.getByLabelText(labelText)).toHaveValue(value);
  }

  static expectFormToHaveError(errorMessage: string | RegExp) {
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  }

  static expectLoadingIndicator() {
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  }

  static expectNoLoadingIndicator() {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  }

  static async expectAsyncSuccess(asyncAction: () => Promise<any>, successMessage?: string | RegExp) {
    await asyncAction();
    
    if (successMessage) {
      await waitFor(() => 
        expect(screen.getByText(successMessage)).toBeInTheDocument()
      );
    }
  }

  static async expectAsyncError(asyncAction: () => Promise<any>, errorMessage?: string | RegExp) {
    await asyncAction();
    
    if (errorMessage) {
      await waitFor(() => 
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      );
    }
  }
}

// Component testing helpers
export class ComponentTestHelper {
  static async testFormValidation(
    component: ReactElement,
    validData: Record<string, string>,
    invalidData: Record<string, string>,
    expectedErrors: Record<string, string | RegExp>
  ) {
    renderWithProviders(component);

    // Test with invalid data
    await UserInteractionHelper.fillAndSubmitForm(invalidData);
    
    // Check for validation errors
    for (const [field, error] of Object.entries(expectedErrors)) {
      AssertionHelper.expectFormToHaveError(error);
    }

    // Test with valid data
    await UserInteractionHelper.fillAndSubmitForm(validData);
    
    // Errors should be gone
    for (const [field, error] of Object.entries(expectedErrors)) {
      expect(screen.queryByText(error)).not.toBeInTheDocument();
    }
  }

  static async testLoadingStates(
    component: ReactElement,
    triggerLoading: () => Promise<void>
  ) {
    renderWithProviders(component);

    // Start loading
    const loadingPromise = triggerLoading();
    
    // Should show loading indicator
    AssertionHelper.expectLoadingIndicator();
    
    // Wait for completion
    await loadingPromise;
    
    // Loading should be gone
    AssertionHelper.expectNoLoadingIndicator();
  }

  static async testErrorStates(
    component: ReactElement,
    triggerError: () => Promise<void>,
    expectedError: string | RegExp
  ) {
    renderWithProviders(component);

    // Trigger error
    await triggerError();
    
    // Should show error message
    await waitFor(() => 
      AssertionHelper.expectElementToBeVisible(expectedError)
    );
  }
}

// Performance testing
export class PerformanceTestHelper {
  static measureRenderTime(component: ReactElement): number {
    const start = performance.now();
    renderWithProviders(component);
    const end = performance.now();
    return end - start;
  }

  static async measureAsyncOperation<T>(operation: () => Promise<T>): Promise<{
    result: T;
    duration: number;
  }> {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    
    return {
      result,
      duration: end - start,
    };
  }
}

// Export everything
export const testUtils = {
  MockDataGenerator,
  MockContexts,
  TestProviders,
  renderWithProviders,
  ApiMockHelper,
  UserInteractionHelper,
  AssertionHelper,
  ComponentTestHelper,
  PerformanceTestHelper,
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { userEvent };
export { renderWithProviders as render }; 