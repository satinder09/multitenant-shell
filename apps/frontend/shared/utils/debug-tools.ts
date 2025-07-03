/**
 * ��� PLATFORM DEBUG TOOLS
 * 
 * Comprehensive debugging utilities for the multitenant platform
 */

export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export enum DebugCategory {
  AUTH = 'AUTH',
  API = 'API',
  PLATFORM = 'PLATFORM',
  TENANT = 'TENANT',
  USER = 'USER',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  STATE = 'STATE',
  NETWORK = 'NETWORK',
  CACHE = 'CACHE',
  SECURITY = 'SECURITY',
  TESTING = 'TESTING',
  SYSTEM = 'SYSTEM',
  MONITORING = 'MONITORING',
}

interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  categories: DebugCategory[];
  persistLogs: boolean;
  maxLogEntries: number;
  showTimestamp: boolean;
  showStackTrace: boolean;
  colorOutput: boolean;
}

class PlatformDebugger {
  private config: DebugConfig;
  private logs: Array<{
    timestamp: string;
    level: DebugLevel;
    category: DebugCategory;
    message: string;
    data?: any;
    stack?: string;
  }> = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: DebugLevel.INFO,
      categories: Object.values(DebugCategory),
      persistLogs: false,
      maxLogEntries: 1000,
      showTimestamp: true,
      showStackTrace: false,
      colorOutput: true,
      ...config,
    };
  }

  private shouldLog(level: DebugLevel, category: DebugCategory): boolean {
    return (
      this.config.enabled &&
      level <= this.config.level &&
      this.config.categories.includes(category)
    );
  }

  private formatMessage(
    level: DebugLevel,
    category: DebugCategory,
    message: string,
    data?: any
  ): string {
    const timestamp = this.config.showTimestamp ? `[${new Date().toISOString()}]` : '';
    const levelName = DebugLevel[level];
    const categoryName = `[${category}]`;
    
    let formattedMessage = `${timestamp} ${levelName} ${categoryName} ${message}`;
    
    if (data) {
      formattedMessage += ` ${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }

  private getConsoleMethod(level: DebugLevel): 'error' | 'warn' | 'info' | 'log' | 'debug' {
    switch (level) {
      case DebugLevel.ERROR:
        return 'error';
      case DebugLevel.WARN:
        return 'warn';
      case DebugLevel.INFO:
        return 'info';
      case DebugLevel.DEBUG:
        return 'debug';
      case DebugLevel.TRACE:
        return 'log';
      default:
        return 'log';
    }
  }

  private log(level: DebugLevel, category: DebugCategory, message: string, data?: any): void {
    if (!this.shouldLog(level, category)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const stack = this.config.showStackTrace ? new Error().stack : undefined;

    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data,
      stack,
    };

    this.logs.push(logEntry);

    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.shift();
    }

    const consoleMethod = this.getConsoleMethod(level);
    const formattedMessage = this.formatMessage(level, category, message, data);
    
    console[consoleMethod](formattedMessage);
    
    if (this.config.showStackTrace && stack) {
      console[consoleMethod]('Stack trace:', stack);
    }
  }

  // Public logging methods
  error(category: DebugCategory, message: string, data?: any): void {
    this.log(DebugLevel.ERROR, category, message, data);
  }

  warn(category: DebugCategory, message: string, data?: any): void {
    this.log(DebugLevel.WARN, category, message, data);
  }

  info(category: DebugCategory, message: string, data?: any): void {
    this.log(DebugLevel.INFO, category, message, data);
  }

  debug(category: DebugCategory, message: string, data?: any): void {
    this.log(DebugLevel.DEBUG, category, message, data);
  }

  trace(category: DebugCategory, message: string, data?: any): void {
    this.log(DebugLevel.TRACE, category, message, data);
  }

  // Performance monitoring
  time(label: string): void {
    if (this.config.enabled) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled) {
      console.timeEnd(label);
    }
  }

  // State inspection
  inspect(category: DebugCategory, label: string, obj: any): void {
    if (this.shouldLog(DebugLevel.DEBUG, category)) {
      console.group(`��� ${label}`);
      console.log('Type:', typeof obj);
      console.log('Value:', obj);
      console.log('JSON:', JSON.stringify(obj, null, 2));
      console.groupEnd();
    }
  }

  // API request/response logging
  logApiRequest(url: string, method: string, data?: any): void {
    this.info(DebugCategory.API, `→ ${method} ${url}`, data);
  }

  logApiResponse(url: string, method: string, status: number, data?: any): void {
    this.info(DebugCategory.API, `← ${method} ${url} ${status}`, data);
  }

  logApiError(url: string, method: string, error: any): void {
    this.error(DebugCategory.API, `✗ ${method} ${url}`, error);
  }

  // Authentication logging
  logAuthEvent(event: string, data?: any): void {
    this.info(DebugCategory.AUTH, event, data);
  }

  logAuthError(event: string, error: any): void {
    this.error(DebugCategory.AUTH, event, error);
  }

  // Platform events
  logPlatformEvent(event: string, data?: any): void {
    this.info(DebugCategory.PLATFORM, event, data);
  }

  // Tenant events
  logTenantEvent(event: string, tenantId: string, data?: any): void {
    this.info(DebugCategory.TENANT, `${event} [${tenantId}]`, data);
  }

  // User events
  logUserEvent(event: string, userId: string, data?: any): void {
    this.info(DebugCategory.USER, `${event} [${userId}]`, data);
  }

  // Performance tracking
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(DebugCategory.PERFORMANCE, `${metric}: ${value}${unit}`);
  }

  // State changes
  logStateChange(component: string, oldState: any, newState: any): void {
    this.debug(DebugCategory.STATE, `${component} state change`, {
      from: oldState,
      to: newState,
    });
  }

  // Network events
  logNetworkEvent(event: string, data?: any): void {
    this.info(DebugCategory.NETWORK, event, data);
  }

  // Cache events
  logCacheEvent(event: string, key: string, data?: any): void {
    this.debug(DebugCategory.CACHE, `${event} [${key}]`, data);
  }

  // Configuration
  setLevel(level: DebugLevel): void {
    this.config.level = level;
  }

  setCategories(categories: DebugCategory[]): void {
    this.config.categories = categories;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  // Log management
  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Development helpers
  breakpoint(message: string = 'Breakpoint reached'): void {
    if (this.config.enabled) {
      console.warn(`��� ${message}`);
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }

  assert(condition: boolean, message: string): void {
    if (this.config.enabled && !condition) {
      console.error(`��� Assertion failed: ${message}`);
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }

  todo(message: string): void {
    this.warn(DebugCategory.API, `TODO: ${message}`);
  }

  fixme(message: string): void {
    this.warn(DebugCategory.API, `FIXME: ${message}`);
  }
}

// Global debugger instance
export const platformDebugger = new PlatformDebugger();

// Convenience functions
export const debug = {
  log: (category: DebugCategory, message: string, data?: any) => 
    platformDebugger.info(category, message, data),
  
  error: (category: DebugCategory, message: string, data?: any) => 
    platformDebugger.error(category, message, data),
  
  warn: (category: DebugCategory, message: string, data?: any) => 
    platformDebugger.warn(category, message, data),
  
  time: (label: string) => platformDebugger.time(label),
  timeEnd: (label: string) => platformDebugger.timeEnd(label),
  
  inspect: (label: string, obj: any) => platformDebugger.inspect(DebugCategory.STATE, label, obj),
  
  api: {
    request: (url: string, method: string, data?: any) => 
      platformDebugger.logApiRequest(url, method, data),
    response: (url: string, method: string, status: number, data?: any) => 
      platformDebugger.logApiResponse(url, method, status, data),
    error: (url: string, method: string, error: any) => 
      platformDebugger.logApiError(url, method, error),
  },
  
  auth: {
    event: (event: string, data?: any) => platformDebugger.logAuthEvent(event, data),
    error: (event: string, error: any) => platformDebugger.logAuthError(event, error),
  },
  
  platform: {
    event: (event: string, data?: any) => platformDebugger.logPlatformEvent(event, data),
  },
  
  tenant: {
    event: (event: string, tenantId: string, data?: any) => 
      platformDebugger.logTenantEvent(event, tenantId, data),
  },
  
  user: {
    event: (event: string, userId: string, data?: any) => 
      platformDebugger.logUserEvent(event, userId, data),
  },
  
  performance: {
    metric: (metric: string, value: number, unit?: string) => 
      platformDebugger.logPerformance(metric, value, unit),
  },
  
  state: {
    change: (component: string, oldState: any, newState: any) => 
      platformDebugger.logStateChange(component, oldState, newState),
  },
  
  network: {
    event: (event: string, data?: any) => platformDebugger.logNetworkEvent(event, data),
  },
  
  cache: {
    event: (event: string, key: string, data?: any) => 
      platformDebugger.logCacheEvent(event, key, data),
  },
  
  dev: {
    breakpoint: (message?: string) => platformDebugger.breakpoint(message),
    assert: (condition: boolean, message: string) => platformDebugger.assert(condition, message),
    todo: (message: string) => platformDebugger.todo(message),
    fixme: (message: string) => platformDebugger.fixme(message),
  },
};

// Export for global access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).PlatformDebugger = platformDebugger;
  (window as any).debug = debug;
}
