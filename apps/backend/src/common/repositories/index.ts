// Repository module exports
// Provides access to all repository interfaces and implementations

// Base repository
export * from './base.repository';

// Specific repositories
export * from './tenant.repository';
export * from './user.repository';

// Repository tokens for dependency injection
export const REPOSITORY_TOKENS = {
  TENANT_REPOSITORY: 'TENANT_REPOSITORY',
  USER_REPOSITORY: 'USER_REPOSITORY',
} as const; 