// Standardized API types for consistent responses and error handling
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
    validationErrors?: ValidationError[];
  };
  timestamp: string;
  path: string;
}

// Query and filter types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  search?: string;
  filters?: Record<string, any>;
}

export interface FilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 
           'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 
           'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface FilterGroup {
  logic: 'AND' | 'OR';
  rules: FilterRule[];
  groups?: FilterGroup[];
}

export interface ComplexFilter {
  rootGroup: FilterGroup;
} 