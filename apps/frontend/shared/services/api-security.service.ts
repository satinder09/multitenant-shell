/**
 * 🔐 API SECURITY SERVICE
 * 
 * Comprehensive API security with versioning, rate limiting, 
 * request/response logging, and security analysis
 */

import { debug, DebugCategory } from '../utils/debug-tools';
import { securityValidator } from '../utils/security-validation';

// API Security interfaces
export interface ApiSecurityConfig {
  enableVersioning: boolean;
  enableRateLimiting: boolean;
  enableRequestLogging: boolean;
  enableSecurityAnalysis: boolean;
  enableResponseValidation: boolean;
  defaultVersion: string;
  supportedVersions: string[];
  rateLimitWindow: number;
  maxRequestsPerWindow: number;
  logRetentionDays: number;
}

export interface ApiVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  changelog?: string;
  breaking: boolean;
}

export interface RateLimitRule {
  endpoint: string;
  method: string;
  limit: number;
  window: number;
  skipAuth?: boolean;
}

export interface ApiRequest {
  id: string;
  endpoint: string;
  method: string;
  version: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  userId?: string;
  tenantId?: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  size: number;
}

export interface ApiResponse {
  requestId: string;
  statusCode: number;
  timestamp: Date;
  responseTime: number;
  body?: any;
  headers: Record<string, string>;
  size: number;
  cached: boolean;
  error?: string;
}

export interface ApiSecurityEvent {
  id: string;
  type: 'RATE_LIMIT_EXCEEDED' | 'INVALID_VERSION' | 'SUSPICIOUS_REQUEST' | 'SECURITY_VIOLATION' | 'AUTHENTICATION_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  blocked: boolean;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitedRequests: number;
  securityEvents: number;
  versionDistribution: Record<string, number>;
  endpointStats: Record<string, { count: number; avgTime: number; errorRate: number }>;
}

class ApiSecurityService {
  private config: ApiSecurityConfig;
  private supportedVersions: Map<string, ApiVersion> = new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private requestLogs: Map<string, ApiRequest> = new Map();
  private responseLogs: Map<string, ApiResponse> = new Map();
  private securityEvents: ApiSecurityEvent[] = [];
  private metrics: ApiMetrics = this.initializeMetrics();

  constructor(config: Partial<ApiSecurityConfig> = {}) {
    this.config = {
      enableVersioning: true,
      enableRateLimiting: true,
      enableRequestLogging: true,
      enableSecurityAnalysis: true,
      enableResponseValidation: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2'],
      rateLimitWindow: 60000, // 1 minute
      maxRequestsPerWindow: 1000,
      logRetentionDays: 7,
      ...config
    };

    this.initializeVersions();
    this.initializeRateLimitRules();
    this.startCleanupTasks();

    debug.log(DebugCategory.SECURITY, 'API Security Service initialized', {
      config: this.config,
      supportedVersions: Array.from(this.supportedVersions.keys())
    });
  }

  /**
   * Initialize API versions
   */
  private initializeVersions(): void {
    const versions: ApiVersion[] = [
      {
        version: 'v1',
        deprecated: false,
        breaking: false,
        changelog: 'Initial API version with core platform functionality'
      },
      {
        version: 'v2',
        deprecated: false,
        breaking: true,
        changelog: 'Enhanced security features, improved performance, breaking changes in authentication'
      },
      {
        version: 'v0',
        deprecated: true,
        deprecationDate: new Date('2024-01-01'),
        sunsetDate: new Date('2024-06-01'),
        breaking: false,
        changelog: 'Legacy API version - deprecated, use v1 or v2'
      }
    ];

    versions.forEach(version => {
      this.supportedVersions.set(version.version, version);
    });
  }

  /**
   * Initialize rate limit rules
   */
  private initializeRateLimitRules(): void {
    const rules: RateLimitRule[] = [
      // Authentication endpoints - stricter limits
      { endpoint: '/api/auth/login', method: 'POST', limit: 5, window: 60000 },
      { endpoint: '/api/auth/register', method: 'POST', limit: 3, window: 60000 },
      { endpoint: '/api/auth/forgot-password', method: 'POST', limit: 2, window: 300000 },
      
      // Platform management - moderate limits
      { endpoint: '/api/platform/tenants', method: 'GET', limit: 100, window: 60000 },
      { endpoint: '/api/platform/tenants', method: 'POST', limit: 10, window: 60000 },
      { endpoint: '/api/platform/users', method: 'GET', limit: 200, window: 60000 },
      
      // Search endpoints - higher limits
      { endpoint: '/api/search', method: 'GET', limit: 500, window: 60000 },
      { endpoint: '/api/dynamic-search', method: 'POST', limit: 200, window: 60000 },
      
      // Health checks - unlimited
      { endpoint: '/api/health', method: 'GET', limit: 0, window: 0, skipAuth: true },
      
      // Default rule
      { endpoint: '*', method: '*', limit: this.config.maxRequestsPerWindow, window: this.config.rateLimitWindow }
    ];

    rules.forEach(rule => {
      const key = `${rule.method}:${rule.endpoint}`;
      this.rateLimitRules.set(key, rule);
    });
  }

  /**
   * Process API request with security checks
   */
  async processApiRequest(request: Omit<ApiRequest, 'id' | 'timestamp'>): Promise<{
    allowed: boolean;
    version: string;
    reason?: string;
    securityEvents: ApiSecurityEvent[];
    headers: Record<string, string>;
  }> {
    const apiRequest: ApiRequest = {
      ...request,
      id: this.generateRequestId(),
      timestamp: new Date()
    };

    const result = {
      allowed: true,
      version: this.config.defaultVersion,
      reason: undefined as string | undefined,
      securityEvents: [] as ApiSecurityEvent[],
      headers: {} as Record<string, string>
    };

    try {
      // Log request
      if (this.config.enableRequestLogging) {
        this.logRequest(apiRequest);
      }

      // Version validation
      if (this.config.enableVersioning) {
        const versionResult = this.validateApiVersion(apiRequest);
        if (!versionResult.valid) {
          result.allowed = false;
          result.reason = versionResult.reason;
          result.securityEvents.push(...versionResult.events);
          return result;
        }
        result.version = versionResult.version;
        result.headers = { ...result.headers, ...versionResult.headers };
      }

      // Rate limiting
      if (this.config.enableRateLimiting) {
        const rateLimitResult = this.checkRateLimit(apiRequest);
        if (!rateLimitResult.allowed) {
          result.allowed = false;
          result.reason = rateLimitResult.reason;
          result.securityEvents.push(...rateLimitResult.events);
          return result;
        }
        result.headers = { ...result.headers, ...rateLimitResult.headers };
      }

      // Security analysis
      if (this.config.enableSecurityAnalysis) {
        const securityResult = this.analyzeRequestSecurity(apiRequest);
        result.securityEvents.push(...securityResult.events);
        
        if (securityResult.blocked) {
          result.allowed = false;
          result.reason = securityResult.reason;
          return result;
        }
      }

      // Update metrics
      this.updateMetrics(apiRequest, true);

      debug.log(DebugCategory.API, 'API request processed', {
        requestId: apiRequest.id,
        endpoint: apiRequest.endpoint,
        method: apiRequest.method,
        version: result.version,
        allowed: result.allowed
      });

      return result;

    } catch (error) {
      debug.error(DebugCategory.API, 'API request processing failed', {
        requestId: apiRequest.id,
        endpoint: apiRequest.endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      result.allowed = false;
      result.reason = 'Internal security error';
      return result;
    }
  }

  /**
   * Log API response
   */
  async logApiResponse(response: Omit<ApiResponse, 'timestamp'>): Promise<void> {
    if (!this.config.enableRequestLogging) return;

    const apiResponse: ApiResponse = {
      ...response,
      timestamp: new Date()
    };

    this.responseLogs.set(response.requestId, apiResponse);

    // Update metrics
    this.updateResponseMetrics(apiResponse);

    debug.log(DebugCategory.API, 'API response logged', {
      requestId: response.requestId,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      size: response.size
    });
  }

  /**
   * Validate API version
   */
  private validateApiVersion(request: ApiRequest): {
    valid: boolean;
    version: string;
    reason?: string;
    events: ApiSecurityEvent[];
    headers: Record<string, string>;
  } {
    const result = {
      valid: true,
      version: this.config.defaultVersion,
      reason: undefined as string | undefined,
      events: [] as ApiSecurityEvent[],
      headers: {} as Record<string, string>
    };

    // Extract version from headers or path
    const versionFromHeader = request.headers['api-version'] || request.headers['x-api-version'];
    const versionFromPath = request.endpoint.match(/^\/api\/v(\d+)/)?.[1];
    const requestedVersion = versionFromHeader || (versionFromPath ? `v${versionFromPath}` : request.version);

    // Check if version is supported
    const versionInfo = this.supportedVersions.get(requestedVersion);
    if (!versionInfo) {
      result.valid = false;
      result.reason = `Unsupported API version: ${requestedVersion}`;
      
      const event: ApiSecurityEvent = {
        id: this.generateEventId(),
        type: 'INVALID_VERSION',
        severity: 'MEDIUM',
        endpoint: request.endpoint,
        method: request.method,
        ip: request.ip,
        userAgent: request.userAgent,
        timestamp: new Date(),
        details: { requestedVersion, supportedVersions: this.config.supportedVersions },
        blocked: true
      };
      
      result.events.push(event);
      return result;
    }

    // Check if version is deprecated
    if (versionInfo.deprecated) {
      const event: ApiSecurityEvent = {
        id: this.generateEventId(),
        type: 'INVALID_VERSION',
        severity: 'LOW',
        endpoint: request.endpoint,
        method: request.method,
        ip: request.ip,
        userAgent: request.userAgent,
        timestamp: new Date(),
        details: { 
          version: requestedVersion,
          deprecationDate: versionInfo.deprecationDate,
          sunsetDate: versionInfo.sunsetDate
        },
        blocked: false
      };
      
      result.events.push(event);
      result.headers['Warning'] = `299 - "API version ${requestedVersion} is deprecated"`;
      
      if (versionInfo.sunsetDate) {
        result.headers['Sunset'] = versionInfo.sunsetDate.toISOString();
      }
    }

    result.version = requestedVersion;
    result.headers['API-Version'] = requestedVersion;

    return result;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(request: ApiRequest): {
    allowed: boolean;
    reason?: string;
    events: ApiSecurityEvent[];
    headers: Record<string, string>;
  } {
    const result = {
      allowed: true,
      reason: undefined as string | undefined,
      events: [] as ApiSecurityEvent[],
      headers: {} as Record<string, string>
    };

    // Find applicable rate limit rule
    const specificRule = this.rateLimitRules.get(`${request.method}:${request.endpoint}`);
    const wildcardRule = this.rateLimitRules.get('*:*');
    const rule = specificRule || wildcardRule;

    if (!rule || rule.limit === 0) {
      return result; // No rate limiting for this endpoint
    }

    // Create rate limit key
    const key = `${request.ip}:${request.method}:${request.endpoint}`;
    const now = Date.now();

    // Get or create counter
    let counter = this.rateLimitCounters.get(key);
    if (!counter || now > counter.resetTime) {
      counter = {
        count: 0,
        resetTime: now + rule.window
      };
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);

    // Check if limit exceeded
    if (counter.count > rule.limit) {
      result.allowed = false;
      result.reason = `Rate limit exceeded: ${rule.limit} requests per ${rule.window}ms`;

      const event: ApiSecurityEvent = {
        id: this.generateEventId(),
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        endpoint: request.endpoint,
        method: request.method,
        ip: request.ip,
        userAgent: request.userAgent,
        timestamp: new Date(),
        details: { 
          limit: rule.limit,
          window: rule.window,
          count: counter.count,
          resetTime: counter.resetTime
        },
        blocked: true
      };

      result.events.push(event);
    }

    // Add rate limit headers
    result.headers['X-RateLimit-Limit'] = rule.limit.toString();
    result.headers['X-RateLimit-Remaining'] = Math.max(0, rule.limit - counter.count).toString();
    result.headers['X-RateLimit-Reset'] = Math.ceil(counter.resetTime / 1000).toString();

    return result;
  }

  /**
   * Analyze request security
   */
  private analyzeRequestSecurity(request: ApiRequest): {
    blocked: boolean;
    reason?: string;
    events: ApiSecurityEvent[];
  } {
    const result = {
      blocked: false,
      reason: undefined as string | undefined,
      events: [] as ApiSecurityEvent[]
    };

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /\b(union|select|insert|update|delete|drop|create|alter)\b/i, type: 'SQL_INJECTION' },
      { pattern: /<script|javascript:|data:text\/html/i, type: 'XSS_ATTEMPT' },
      { pattern: /\.\.\//g, type: 'PATH_TRAVERSAL' },
      { pattern: /\b(eval|exec|system|shell_exec)\b/i, type: 'CODE_INJECTION' }
    ];

    // Check endpoint URL
    const endpoint = request.endpoint.toLowerCase();
    for (const { pattern, type } of suspiciousPatterns) {
      if (pattern.test(endpoint)) {
        const event: ApiSecurityEvent = {
          id: this.generateEventId(),
          type: 'SUSPICIOUS_REQUEST',
          severity: 'HIGH',
          endpoint: request.endpoint,
          method: request.method,
          ip: request.ip,
          userAgent: request.userAgent,
          timestamp: new Date(),
          details: { suspiciousPattern: type, matchedPattern: pattern.toString() },
          blocked: true
        };

        result.events.push(event);
        result.blocked = true;
        result.reason = `Suspicious request pattern detected: ${type}`;
        break;
      }
    }

    // Check request body
    if (request.body && typeof request.body === 'string') {
      for (const { pattern, type } of suspiciousPatterns) {
        if (pattern.test(request.body)) {
          const event: ApiSecurityEvent = {
            id: this.generateEventId(),
            type: 'SUSPICIOUS_REQUEST',
            severity: 'HIGH',
            endpoint: request.endpoint,
            method: request.method,
            ip: request.ip,
            userAgent: request.userAgent,
            timestamp: new Date(),
            details: { suspiciousPattern: type, location: 'request_body' },
            blocked: true
          };

          result.events.push(event);
          result.blocked = true;
          result.reason = `Suspicious request body detected: ${type}`;
          break;
        }
      }
    }

    // Check user agent
    const suspiciousUserAgents = [
      /sqlmap/i,
      /burp/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /curl.*bot/i
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(request.userAgent)) {
        const event: ApiSecurityEvent = {
          id: this.generateEventId(),
          type: 'SUSPICIOUS_REQUEST',
          severity: 'MEDIUM',
          endpoint: request.endpoint,
          method: request.method,
          ip: request.ip,
          userAgent: request.userAgent,
          timestamp: new Date(),
          details: { suspiciousUserAgent: request.userAgent },
          blocked: false
        };

        result.events.push(event);
        break;
      }
    }

    return result;
  }

  /**
   * Log request
   */
  private logRequest(request: ApiRequest): void {
    this.requestLogs.set(request.id, request);

    // Clean up old logs
    const cutoff = Date.now() - (this.config.logRetentionDays * 24 * 60 * 60 * 1000);
    for (const [id, loggedRequest] of this.requestLogs.entries()) {
      if (loggedRequest.timestamp.getTime() < cutoff) {
        this.requestLogs.delete(id);
      }
    }

    debug.log(DebugCategory.API, 'API request logged', {
      requestId: request.id,
      endpoint: request.endpoint,
      method: request.method,
      size: request.size,
      ip: request.ip
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(request: ApiRequest, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update version distribution
    if (!this.metrics.versionDistribution[request.version]) {
      this.metrics.versionDistribution[request.version] = 0;
    }
    this.metrics.versionDistribution[request.version]++;

    // Update endpoint stats
    const endpointKey = `${request.method} ${request.endpoint}`;
    if (!this.metrics.endpointStats[endpointKey]) {
      this.metrics.endpointStats[endpointKey] = {
        count: 0,
        avgTime: 0,
        errorRate: 0
      };
    }
    this.metrics.endpointStats[endpointKey].count++;
  }

  /**
   * Update response metrics
   */
  private updateResponseMetrics(response: ApiResponse): void {
    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1);
    this.metrics.averageResponseTime = (totalTime + response.responseTime) / this.metrics.successfulRequests;

    // Update endpoint stats
    const request = this.requestLogs.get(response.requestId);
    if (request) {
      const endpointKey = `${request.method} ${request.endpoint}`;
      const stats = this.metrics.endpointStats[endpointKey];
      if (stats) {
        const totalTime = stats.avgTime * (stats.count - 1);
        stats.avgTime = (totalTime + response.responseTime) / stats.count;
        
        if (response.statusCode >= 400) {
          stats.errorRate = (stats.errorRate * (stats.count - 1) + 1) / stats.count;
        }
      }
    }
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up expired rate limit counters every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, counter] of this.rateLimitCounters.entries()) {
        if (now > counter.resetTime) {
          this.rateLimitCounters.delete(key);
        }
      }
    }, 60000);

    // Clean up old security events every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.securityEvents = this.securityEvents.filter(event => 
        event.timestamp.getTime() > cutoff
      );
    }, 3600000);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ApiMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitedRequests: 0,
      securityEvents: 0,
      versionDistribution: {},
      endpointStats: {}
    };
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get API metrics
   */
  getApiMetrics(): ApiMetrics & {
    recentEvents: ApiSecurityEvent[];
    topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  } {
    const recentEvents = this.securityEvents.slice(-50); // Last 50 events
    const topEndpoints = Object.entries(this.metrics.endpointStats)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ...this.metrics,
      recentEvents,
      topEndpoints
    };
  }

  /**
   * Get supported API versions
   */
  getSupportedVersions(): ApiVersion[] {
    return Array.from(this.supportedVersions.values());
  }

  /**
   * Add security event
   */
  addSecurityEvent(event: Omit<ApiSecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: ApiSecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.securityEvents.push(securityEvent);
    this.metrics.securityEvents++;

    debug.warn(DebugCategory.SECURITY, `API security event: ${event.type}`, {
      eventId: securityEvent.id,
      severity: event.severity,
      endpoint: event.endpoint,
      blocked: event.blocked
    });
  }

  /**
   * Get request logs
   */
  getRequestLogs(limit: number = 100): ApiRequest[] {
    return Array.from(this.requestLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit: number = 100): ApiSecurityEvent[] {
    return this.securityEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Update rate limit rule
   */
  updateRateLimitRule(rule: RateLimitRule): void {
    const key = `${rule.method}:${rule.endpoint}`;
    this.rateLimitRules.set(key, rule);
    
    debug.log(DebugCategory.SECURITY, 'Rate limit rule updated', {
      endpoint: rule.endpoint,
      method: rule.method,
      limit: rule.limit,
      window: rule.window
    });
  }

  /**
   * Clear rate limit for IP
   */
  clearRateLimit(ip: string): void {
    for (const [key, counter] of this.rateLimitCounters.entries()) {
      if (key.startsWith(ip)) {
        this.rateLimitCounters.delete(key);
      }
    }
    
    debug.log(DebugCategory.SECURITY, 'Rate limit cleared for IP', { ip });
  }
}

// Export singleton instance
export const apiSecurityService = new ApiSecurityService();

export { ApiSecurityService }; 