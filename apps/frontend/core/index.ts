// Frontend Core Module - Main Export
// This module provides frontend-specific utilities, types, and hooks

// Export frontend-specific types (avoiding conflicts with core types)
export type {
  // UI State types
  UIState,
  TableState,
  FormState,
  ModalState,
  ToastMessage,
  
  // Navigation types
  NavigationItem,
  BreadcrumbItem,
  
  // Theme types
  ThemeMode,
  ThemeConfig,
  
  // Context types
  PlatformContextType,
  AuthContextType,
  
  // Component prop types
  BaseComponentProps,
  ButtonProps,
  InputProps,
  
  // Data fetching types
  QueryOptions,
  MutationOptions,
  
  // Filter types for UI components
  FilterConfig,
  FilterValue,
  
  // Layout types
  LayoutProps,
  
  // Permission types
  Permission,
  Role,
  
  // Tenant-specific types
  TenantUser,
  TenantSettings,
  
  // Event types for real-time features
  WebSocketMessage,
  NotificationMessage,
  
  // Search types
  SearchResult,
  SearchOptions,
  
  // File upload types
  FileUploadProgress,
  UploadedFile,
  
  // Utility types for better TypeScript support
  RequiredFields,
  OptionalFields,
  WithId,
  WithTimestamps,
  AsyncState,
  
  // Component state types
  ComponentSize,
  ComponentVariant,
  ComponentState
} from './types';

// Re-export core types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  User,
  Tenant,
  FilterRule,
  FilterGroup,
  ComplexFilter,
  BaseQuery,
  ValidationError,
  LoginCredentials,
  AuthResponse
} from './types';

// Export all utilities
export * from './utils';

// Export all hooks
export * from './hooks';

// Export all services
export * from './services'; 