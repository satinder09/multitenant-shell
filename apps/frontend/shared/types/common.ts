// Core shared types for the multitenant application

// API Response Types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error Types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, RecordValue>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: RecordValue;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  tenantId?: string;
  accessType?: 'secure_login' | 'impersonation' | 'direct_access';
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  impersonatedUserName?: string;
  impersonationSessionId?: string;
  originalUserId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  expiresAt?: string;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Filter Types
export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal'
  | 'between' | 'not_between'
  | 'in' | 'not_in'
  | 'is_empty' | 'is_not_empty';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  label?: string;
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: FilterRule[];
  groups: FilterGroup[];
}

export interface ComplexFilter {
  rootGroup: FilterGroup;
}

// Sort Types
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Query Types
export interface BaseQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: SortParams;
  complexFilter?: ComplexFilter;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event Types
export interface DomainEvent {
  id: string;
  type: string;
  payload: JsonObject;
  timestamp: string;
  userId?: string;
  tenantId?: string;
}

// HTTP Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  data?: JsonData | FormData;
  params?: Record<string, RecordValue>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ResponseConfig<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Environment Types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface CacheConfig {
  host: string;
  port: number;
  ttl: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// User Profile Interface
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isSuperAdmin?: boolean;
  tenantContext?: string;
  createdAt: string;
  updatedAt: string;
}

// Database Record Interface
export interface DatabaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Filter Value Types (specific to filtering functionality)
export type FilterValue = string | number | boolean | Date | null | undefined;

// Generic JSON-compatible values for API requests/responses
export type JsonValue = string | number | boolean | null | undefined;
export type JsonObject = { [key: string]: JsonValue | JsonValue[] | JsonObject | JsonObject[] };
export type JsonArray = (JsonValue | JsonObject)[];
export type JsonData = JsonValue | JsonObject | JsonArray;

// Generic record type for key-value pairs
export type RecordValue = string | number | boolean | Date | null | undefined;
export interface PlainObject {
  [key: string]: RecordValue | RecordValue[] | PlainObject | PlainObject[];
}

// API Request/Response Types
export interface ApiRequestData {
  [key: string]: JsonValue | JsonValue[] | JsonObject | JsonObject[];
}

export interface ErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ErrorDetails[];
}

// Event/Message Types
export interface SystemEvent {
  type: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  data: JsonObject;
}

export interface WebSocketMessage {
  type: string;
  payload: JsonObject;
  timestamp: string;
}

// Generic Query Interface (specific to filters)
export interface QueryFilters {
  [key: string]: FilterValue | FilterValue[];
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  perPage: number;
} 