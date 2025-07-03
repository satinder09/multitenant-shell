/**
 * 🔧 PLATFORM ERROR HANDLING SYSTEM
 * 
 * Comprehensive error handling for the platform including:
 * - Structured error types and classifications
 * - User-friendly error messages
 * - Error logging and reporting
 * - Error recovery strategies
 * - Development debugging tools
 */

import { toast } from 'sonner';

/**
 * Platform Error Types
 */
export enum PlatformErrorType {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Platform Access
  PLATFORM_ACCESS_DENIED = 'PLATFORM_ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Tenant Management
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_ALREADY_EXISTS = 'TENANT_ALREADY_EXISTS',
  TENANT_NOT_ACTIVE = 'TENANT_NOT_ACTIVE',
  SUBDOMAIN_UNAVAILABLE = 'SUBDOMAIN_UNAVAILABLE',
  TENANT_DELETION_BLOCKED = 'TENANT_DELETION_BLOCKED',
  
  // User Management
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  
  // Impersonation
  IMPERSONATION_NOT_ALLOWED = 'IMPERSONATION_NOT_ALLOWED',
  IMPERSONATION_SESSION_INVALID = 'IMPERSONATION_SESSION_INVALID',
  IMPERSONATION_REASON_REQUIRED = 'IMPERSONATION_REASON_REQUIRED',
  
  // Network & Infrastructure
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Data & Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  DATA_CONFLICT = 'DATA_CONFLICT',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',           // Minor issues, user can continue
  MEDIUM = 'MEDIUM',     // Important issues, some functionality affected
  HIGH = 'HIGH',         // Critical issues, major functionality blocked
  CRITICAL = 'CRITICAL', // System-level issues, application unusable
}

/**
 * Structured Platform Error
 */
export class PlatformError extends Error {
  public readonly type: PlatformErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly debugInfo?: Record<string, any>;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    type: PlatformErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      code?: string;
      userMessage?: string;
      debugInfo?: Record<string, any>;
      requestId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'PlatformError';
    this.type = type;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.code = options.code || type;
    this.userMessage = options.userMessage || this.getDefaultUserMessage(type);
    this.debugInfo = options.debugInfo;
    this.timestamp = new Date().toISOString();
    this.requestId = options.requestId;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  private getDefaultUserMessage(type: PlatformErrorType): string {
    const messageMap: Record<PlatformErrorType, string> = {
      // Authentication & Authorization
      [PlatformErrorType.UNAUTHORIZED]: 'Please log in to access this feature.',
      [PlatformErrorType.FORBIDDEN]: 'You don\'t have permission to perform this action.',
      [PlatformErrorType.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
      [PlatformErrorType.INVALID_CREDENTIALS]: 'Invalid username or password.',
      [PlatformErrorType.PLATFORM_ACCESS_DENIED]: 'Platform access is restricted to authorized users.',
      [PlatformErrorType.INSUFFICIENT_PERMISSIONS]: 'You don\'t have sufficient permissions for this action.',
      
      // Tenant Management
      [PlatformErrorType.TENANT_NOT_FOUND]: 'The requested tenant could not be found.',
      [PlatformErrorType.TENANT_ALREADY_EXISTS]: 'A tenant with this subdomain already exists.',
      [PlatformErrorType.TENANT_NOT_ACTIVE]: 'This tenant is currently inactive.',
      [PlatformErrorType.SUBDOMAIN_UNAVAILABLE]: 'This subdomain is not available. Please choose another.',
      [PlatformErrorType.TENANT_DELETION_BLOCKED]: 'Cannot delete tenant with active users or data.',
      
      // User Management
      [PlatformErrorType.USER_NOT_FOUND]: 'The requested user could not be found.',
      [PlatformErrorType.USER_ALREADY_EXISTS]: 'A user with this information already exists.',
      [PlatformErrorType.EMAIL_ALREADY_EXISTS]: 'This email address is already registered.',
      [PlatformErrorType.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address.',
      [PlatformErrorType.USER_DEACTIVATED]: 'This user account has been deactivated.',
      
      // Impersonation
      [PlatformErrorType.IMPERSONATION_NOT_ALLOWED]: 'Impersonation is not allowed for this user.',
      [PlatformErrorType.IMPERSONATION_SESSION_INVALID]: 'Invalid impersonation session.',
      [PlatformErrorType.IMPERSONATION_REASON_REQUIRED]: 'Please provide a reason for impersonation.',
      
      // Network & Infrastructure
      [PlatformErrorType.NETWORK_ERROR]: 'Network connection failed. Please check your connection.',
      [PlatformErrorType.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
      [PlatformErrorType.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
      [PlatformErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again.',
      
      // Data & Validation
      [PlatformErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
      [PlatformErrorType.REQUIRED_FIELD_MISSING]: 'Please fill in all required fields.',
      [PlatformErrorType.INVALID_DATA_FORMAT]: 'Invalid data format. Please check your input.',
      [PlatformErrorType.DATA_CONFLICT]: 'Data conflict detected. Please refresh and try again.',
      
      // System
      [PlatformErrorType.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later.',
      [PlatformErrorType.MAINTENANCE_MODE]: 'System is under maintenance. Please try again later.',
      [PlatformErrorType.FEATURE_NOT_AVAILABLE]: 'This feature is not available in your current plan.',
      
      // Unknown
      [PlatformErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return messageMap[type] || 'An unexpected error occurred.';
  }

  /**
   * Convert to API-friendly format
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp,
      requestId: this.requestId,
      debugInfo: this.debugInfo,
    };
  }
}

/**
 * Error Classification Helper
 */
export const classifyError = (error: unknown): PlatformError => {
  if (error instanceof PlatformError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('401')) {
      return new PlatformError(PlatformErrorType.UNAUTHORIZED, error.message, { cause: error });
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return new PlatformError(PlatformErrorType.FORBIDDEN, error.message, { cause: error });
    }

    if (message.includes('not found') || message.includes('404')) {
      return new PlatformError(PlatformErrorType.TENANT_NOT_FOUND, error.message, { cause: error });
    }

    if (message.includes('already exists') || message.includes('duplicate')) {
      if (message.includes('email')) {
        return new PlatformError(PlatformErrorType.EMAIL_ALREADY_EXISTS, error.message, { cause: error });
      }
      if (message.includes('subdomain') || message.includes('tenant')) {
        return new PlatformError(PlatformErrorType.TENANT_ALREADY_EXISTS, error.message, { cause: error });
      }
    }

    if (message.includes('network') || message.includes('connection')) {
      return new PlatformError(PlatformErrorType.NETWORK_ERROR, error.message, { cause: error });
    }

    if (message.includes('timeout')) {
      return new PlatformError(PlatformErrorType.TIMEOUT_ERROR, error.message, { cause: error });
    }

    if (message.includes('rate limit')) {
      return new PlatformError(PlatformErrorType.RATE_LIMIT_EXCEEDED, error.message, { cause: error });
    }

    if (message.includes('validation')) {
      return new PlatformError(PlatformErrorType.VALIDATION_ERROR, error.message, { cause: error });
    }

    return new PlatformError(PlatformErrorType.UNKNOWN_ERROR, error.message, { cause: error });
  }

  const errorMessage = typeof error === 'string' ? error : 'An unknown error occurred';
  return new PlatformError(PlatformErrorType.UNKNOWN_ERROR, errorMessage);
};

/**
 * Error Logging System
 */
export interface ErrorLogger {
  log(error: PlatformError, context?: Record<string, any>): void;
  logToConsole(error: PlatformError, context?: Record<string, any>): void;
  logToRemote(error: PlatformError, context?: Record<string, any>): Promise<void>;
}

export class PlatformErrorLogger implements ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  log(error: PlatformError, context?: Record<string, any>): void {
    // Always log to console in development
    if (this.isDevelopment) {
      this.logToConsole(error, context);
    }

    // Log critical and high severity errors to remote service
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      this.logToRemote(error, context).catch(console.error);
    }
  }

  logToConsole(error: PlatformError, context?: Record<string, any>): void {
    const logLevel = this.getConsoleLogLevel(error.severity);
    const logData = {
      ...error.toJSON(),
      context,
      stack: error.stack,
    };

    console[logLevel](`[PlatformError:${error.type}]`, logData);
  }

  async logToRemote(error: PlatformError, context?: Record<string, any>): Promise<void> {
    try {
      // In a real implementation, this would send to a logging service
      // For now, we'll just log to console in production
      if (!this.isDevelopment) {
        console.error('[RemoteLog]', {
          ...error.toJSON(),
          context,
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      }
    } catch (logError) {
      console.error('Failed to log error remotely:', logError);
    }
  }

  private getConsoleLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }
}

// Global error logger instance
export const errorLogger = new PlatformErrorLogger();

/**
 * Error Recovery Strategies
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: PlatformError): boolean;
  recover(error: PlatformError, context?: Record<string, any>): Promise<void>;
}

export class SessionRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: PlatformError): boolean {
    return error.type === PlatformErrorType.SESSION_EXPIRED ||
           error.type === PlatformErrorType.UNAUTHORIZED;
  }

  async recover(error: PlatformError, context?: Record<string, any>): Promise<void> {
    // Redirect to login page with return URL
    const returnUrl = window.location.pathname + window.location.search;
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}

export class RetryRecoveryStrategy implements ErrorRecoveryStrategy {
  private maxRetries = 3;
  private retryDelay = 1000;

  canRecover(error: PlatformError): boolean {
    return error.type === PlatformErrorType.NETWORK_ERROR ||
           error.type === PlatformErrorType.TIMEOUT_ERROR ||
           error.type === PlatformErrorType.SERVICE_UNAVAILABLE;
  }

  async recover(error: PlatformError, context?: Record<string, any>): Promise<void> {
    const { operation, attempt = 1 } = context || {};
    
    if (attempt > this.maxRetries) {
      throw error;
    }

    // Wait before retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1)));

    if (operation && typeof operation === 'function') {
      return operation();
    }
  }
}

// Global recovery strategies
export const recoveryStrategies: ErrorRecoveryStrategy[] = [
  new SessionRecoveryStrategy(),
  new RetryRecoveryStrategy(),
];

/**
 * Error Handler with UI Integration
 */
export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  attemptRecovery?: boolean;
  context?: Record<string, any>;
}

export const handlePlatformError = async (
  error: unknown,
  options: ErrorHandlerOptions = {}
): Promise<void> => {
  const {
    showToast = true,
    logError = true,
    attemptRecovery = false,
    context = {},
  } = options;

  const platformError = classifyError(error);

  // Log the error
  if (logError) {
    errorLogger.log(platformError, context);
  }

  // Show user-friendly toast notification
  if (showToast) {
    const toastVariant = platformError.severity === ErrorSeverity.HIGH || 
                        platformError.severity === ErrorSeverity.CRITICAL ? 'error' : 'warning';
    
    toast[toastVariant](platformError.userMessage, {
      description: platformError.severity === ErrorSeverity.CRITICAL ? 
        'Please contact support if this issue persists.' : undefined,
      duration: platformError.severity === ErrorSeverity.LOW ? 3000 : 5000,
    });
  }

  // Attempt error recovery
  if (attemptRecovery) {
    for (const strategy of recoveryStrategies) {
      if (strategy.canRecover(platformError)) {
        try {
          await strategy.recover(platformError, context);
          return;
        } catch (recoveryError) {
          console.warn('Error recovery failed:', recoveryError);
        }
      }
    }
  }
};

/**
 * Development Tools
 */
export const ErrorDevTools = {
  /**
   * Create test errors for development
   */
  createTestError: (type: PlatformErrorType, customMessage?: string): PlatformError => {
    return new PlatformError(type, customMessage || `Test error: ${type}`, {
      debugInfo: { isDevelopmentTest: true },
    });
  },

  /**
   * Test all error types
   */
  testAllErrorTypes: (): void => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('ErrorDevTools should only be used in development');
      return;
    }

    Object.values(PlatformErrorType).forEach(type => {
      const testError = ErrorDevTools.createTestError(type);
      console.log(`Testing error type: ${type}`, testError.toJSON());
    });
  },

  /**
   * Simulate error scenarios
   */
  simulateError: async (type: PlatformErrorType, withRecovery = false): Promise<void> => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('ErrorDevTools should only be used in development');
      return;
    }

    const testError = ErrorDevTools.createTestError(type, `Simulated error: ${type}`);
    await handlePlatformError(testError, {
      showToast: true,
      logError: true,
      attemptRecovery: withRecovery,
      context: { isSimulation: true },
    });
  },
};

// Export for global access in development
if (process.env.NODE_ENV === 'development') {
  (window as any).PlatformErrorDevTools = ErrorDevTools;
} 