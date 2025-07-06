/**
 * 🚨 TENANT RESOLUTION ERRORS
 * 
 * Comprehensive error system for tenant resolution with specific error types,
 * context information, and retry guidance.
 */

export enum TenantResolutionErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  INVALID_SUBDOMAIN = 'INVALID_SUBDOMAIN',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface TenantResolutionErrorContext {
  subdomain: string;
  timestamp: number;
  attempt: number;
  maxAttempts: number;
  httpStatus?: number;
  retryAfter?: number;
  originalError?: string;
}

export class TenantResolutionError extends Error {
  public readonly type: TenantResolutionErrorType;
  public readonly context: TenantResolutionErrorContext;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    type: TenantResolutionErrorType,
    context: TenantResolutionErrorContext,
    message?: string
  ) {
    const errorMessage = message || TenantResolutionError.getDefaultMessage(type);
    super(errorMessage);
    
    this.name = 'TenantResolutionError';
    this.type = type;
    this.context = context;
    this.retryable = TenantResolutionError.isRetryable(type);
    this.userMessage = TenantResolutionError.getUserMessage(type, context);
  }

  private static getDefaultMessage(type: TenantResolutionErrorType): string {
    switch (type) {
      case TenantResolutionErrorType.NETWORK_ERROR:
        return 'Network error while resolving tenant';
      case TenantResolutionErrorType.TENANT_NOT_FOUND:
        return 'Tenant not found for subdomain';
      case TenantResolutionErrorType.API_RATE_LIMITED:
        return 'API rate limit exceeded';
      case TenantResolutionErrorType.INVALID_SUBDOMAIN:
        return 'Invalid subdomain format';
      case TenantResolutionErrorType.API_UNAVAILABLE:
        return 'Tenant resolution API unavailable';
      case TenantResolutionErrorType.TIMEOUT:
        return 'Tenant resolution timeout';
      default:
        return 'Unknown error during tenant resolution';
    }
  }

  private static getUserMessage(type: TenantResolutionErrorType, context: TenantResolutionErrorContext): string {
    switch (type) {
      case TenantResolutionErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your internet connection.';
      case TenantResolutionErrorType.TENANT_NOT_FOUND:
        return `The subdomain "${context.subdomain}" was not found. Please check the URL.`;
      case TenantResolutionErrorType.API_RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      case TenantResolutionErrorType.INVALID_SUBDOMAIN:
        return `Invalid subdomain format: "${context.subdomain}". Please check the URL.`;
      case TenantResolutionErrorType.API_UNAVAILABLE:
        return 'Service temporarily unavailable. Please try again in a few moments.';
      case TenantResolutionErrorType.TIMEOUT:
        return 'Request timeout. Please check your connection and try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  private static isRetryable(type: TenantResolutionErrorType): boolean {
    return [
      TenantResolutionErrorType.NETWORK_ERROR,
      TenantResolutionErrorType.API_RATE_LIMITED,
      TenantResolutionErrorType.API_UNAVAILABLE,
      TenantResolutionErrorType.TIMEOUT,
      TenantResolutionErrorType.UNKNOWN_ERROR
    ].includes(type);
  }

  public shouldRetry(): boolean {
    return this.retryable && this.context.attempt < this.context.maxAttempts;
  }

  public getRetryDelay(): number {
    if (!this.shouldRetry()) {
      return 0;
    }

    // Use retryAfter from API if available
    if (this.context.retryAfter) {
      return this.context.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const maxDelay = 10000;
    const delay = Math.min(baseDelay * Math.pow(2, this.context.attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }
}

/**
 * Factory functions for common error scenarios
 */
export class TenantResolutionErrorFactory {
  public static networkError(subdomain: string, attempt: number, maxAttempts: number, originalError?: Error): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.NETWORK_ERROR,
      {
        subdomain,
        timestamp: Date.now(),
        attempt,
        maxAttempts,
        originalError: originalError?.message
      }
    );
  }

  public static tenantNotFound(subdomain: string, attempt: number, maxAttempts: number): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.TENANT_NOT_FOUND,
      {
        subdomain,
        timestamp: Date.now(),
        attempt,
        maxAttempts,
        httpStatus: 404
      }
    );
  }

  public static rateLimited(subdomain: string, attempt: number, maxAttempts: number, retryAfter?: number): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.API_RATE_LIMITED,
      {
        subdomain,
        timestamp: Date.now(),
        attempt,
        maxAttempts,
        httpStatus: 429,
        retryAfter
      }
    );
  }

  public static invalidSubdomain(subdomain: string): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.INVALID_SUBDOMAIN,
      {
        subdomain,
        timestamp: Date.now(),
        attempt: 1,
        maxAttempts: 1
      }
    );
  }

  public static apiUnavailable(subdomain: string, attempt: number, maxAttempts: number, httpStatus?: number): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.API_UNAVAILABLE,
      {
        subdomain,
        timestamp: Date.now(),
        attempt,
        maxAttempts,
        httpStatus
      }
    );
  }

  public static timeout(subdomain: string, attempt: number, maxAttempts: number): TenantResolutionError {
    return new TenantResolutionError(
      TenantResolutionErrorType.TIMEOUT,
      {
        subdomain,
        timestamp: Date.now(),
        attempt,
        maxAttempts
      }
    );
  }

  public static fromHttpResponse(
    response: Response,
    subdomain: string,
    attempt: number,
    maxAttempts: number
  ): TenantResolutionError {
    switch (response.status) {
      case 404:
        return TenantResolutionErrorFactory.tenantNotFound(subdomain, attempt, maxAttempts);
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '0');
        return TenantResolutionErrorFactory.rateLimited(subdomain, attempt, maxAttempts, retryAfter);
      case 503:
      case 502:
      case 500:
        return TenantResolutionErrorFactory.apiUnavailable(subdomain, attempt, maxAttempts, response.status);
      default:
        return new TenantResolutionError(
          TenantResolutionErrorType.UNKNOWN_ERROR,
          {
            subdomain,
            timestamp: Date.now(),
            attempt,
            maxAttempts,
            httpStatus: response.status
          },
          `HTTP ${response.status}: ${response.statusText}`
        );
    }
  }
} 