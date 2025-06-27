// Frontend-specific types extending core types

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
  AuthResponse,
} from '../../../../libs/core';

// Import for local usage
import type { User, LoginCredentials } from '../../../../libs/core';

// Frontend-specific UI types
export interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface TableState<T = any> extends UIState {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  } | null;
  filters: Record<string, any>;
}

export interface FormState<T = any> extends UIState {
  data: T;
  isDirty: boolean;
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  data?: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  badge?: string | number;
  children?: NavigationItem[];
  permissions?: string[];
  isActive?: boolean;
  isExpanded?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontFamily: 'system' | 'inter' | 'geist';
}

// Context types
export interface PlatformContextType {
  isPlatform: boolean;
  tenantSubdomain: string | null;
  baseDomain: string;
  currentUrl: string;
  isLoading: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  description?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

// Data fetching types
export interface QueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface MutationOptions<TData = any, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: any, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: any, variables: TVariables) => void;
}

// Filter types for UI components
export interface FilterConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
}

export interface FilterValue {
  field: string;
  operator: string;
  value: any;
  label?: string;
}

// Layout types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

// Permission types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isDefault?: boolean;
}

// Tenant-specific types
export interface TenantUser extends User {
  roles: Role[];
  lastLoginAt?: string;
  isActive: boolean;
  invitedAt?: string;
  invitedBy?: string;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  maxUsers: number;
  features: string[];
  customization: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
  };
}

// API client types
export interface RequestInterceptor {
  (config: any): any | Promise<any>;
}

export interface ResponseInterceptor {
  (response: any): any | Promise<any>;
}

export interface ErrorInterceptor {
  (error: any): any | Promise<any>;
}

// Event types for real-time features
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
  tenantId?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// Search types
export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: string;
  suggestions?: string[];
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  sort?: string;
  page?: number;
  limit?: number;
  facets?: string[];
}

// File upload types
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

// Utility types for better TypeScript support
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type WithId<T> = T & { id: string };

export type WithTimestamps<T> = T & {
  createdAt: string;
  updatedAt: string;
};

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Component state types
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type ComponentState = 'idle' | 'loading' | 'success' | 'error'; 