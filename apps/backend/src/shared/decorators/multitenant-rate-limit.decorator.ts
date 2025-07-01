import { SetMetadata } from '@nestjs/common';

export interface MultitenantRateLimitOptions {
  // Platform-level limits
  platformWindowMs?: number;
  platformMaxRequests?: number;
  
  // Tenant-level limits  
  tenantWindowMs?: number;
  tenantMaxRequests?: number;
  
  // User-level limits
  userWindowMs?: number;
  userMaxRequests?: number;
  
  // Custom configuration
  skipPlatformLimit?: boolean;
  skipTenantLimit?: boolean;
  skipUserLimit?: boolean;
  
  // Error handling
  customMessage?: string;
  onRateLimitExceeded?: (context: any) => void;
}

export const MULTITENANT_RATE_LIMIT_KEY = 'multitenant-rate-limit';

/**
 * Apply multitenant-aware rate limiting to an endpoint
 * 
 * @param options Rate limiting configuration
 * 
 * @example
 * ```typescript
 * @MultitenantRateLimit({
 *   platformMaxRequests: 100,
 *   tenantMaxRequests: 20,
 *   userMaxRequests: 5,
 *   customMessage: 'Login attempts exceeded'
 * })
 * @Post('login')
 * async login() { ... }
 * ```
 */
export const MultitenantRateLimit = (options: MultitenantRateLimitOptions = {}) =>
  SetMetadata(MULTITENANT_RATE_LIMIT_KEY, options);

/**
 * Apply strict rate limiting for authentication endpoints
 */
export const AuthRateLimit = () =>
  MultitenantRateLimit({
    platformMaxRequests: 50,
    platformWindowMs: 15 * 60 * 1000, // 15 minutes
    tenantMaxRequests: 20,
    tenantWindowMs: 15 * 60 * 1000,
    userMaxRequests: 5,
    userWindowMs: 15 * 60 * 1000,
    customMessage: 'Authentication rate limit exceeded. Please try again later.',
  });

/**
 * Apply moderate rate limiting for API endpoints
 */
export const ApiRateLimit = () =>
  MultitenantRateLimit({
    platformMaxRequests: 500,
    platformWindowMs: 15 * 60 * 1000,
    tenantMaxRequests: 200,
    tenantWindowMs: 15 * 60 * 1000,
    userMaxRequests: 50,
    userWindowMs: 15 * 60 * 1000,
    customMessage: 'API rate limit exceeded. Please slow down your requests.',
  });

/**
 * Apply relaxed rate limiting for admin endpoints
 */
export const AdminRateLimit = () =>
  MultitenantRateLimit({
    platformMaxRequests: 1000,
    platformWindowMs: 15 * 60 * 1000,
    tenantMaxRequests: 300,
    tenantWindowMs: 15 * 60 * 1000,
    userMaxRequests: 100,
    userWindowMs: 15 * 60 * 1000,
    skipUserLimit: true, // Admin users get higher limits
    customMessage: 'Admin rate limit exceeded.',
  });

/**
 * Skip rate limiting entirely (for internal/health endpoints)
 */
export const SkipRateLimit = () =>
  MultitenantRateLimit({
    skipPlatformLimit: true,
    skipTenantLimit: true,
    skipUserLimit: true,
  }); 