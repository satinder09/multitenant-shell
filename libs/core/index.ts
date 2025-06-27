// Main export file for @multitenant-shell/core

// Types
export * from './types/common';

// Utilities
export * from './utils/validation';
export * from './utils/date';
export * from './utils/security';

// Services
export * from './services/api-client';

// Re-export specific commonly used items for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  User,
  Tenant,
  FilterRule,
  FilterGroup,
  ComplexFilter,
  BaseQuery
} from './types/common';

export {
  validateData,
  validateDataSafe,
  emailSchema,
  passwordSchema,
  loginSchema,
  createTenantSchema,
  paginationSchema
} from './utils/validation';

export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  isValidDate,
  addTime,
  subtractTime,
  getDateRanges
} from './utils/date';

export {
  evaluatePasswordStrength,
  generateSecurePassword,
  sanitizeInput,
  isValidEmail,
  RateLimiter,
  isJWTExpired
} from './utils/security';

export {
  ApiClient,
  createApiClient,
  getDefaultApiClient,
  ApiClientError
} from './services/api-client'; 