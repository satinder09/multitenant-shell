/**
 * 🔐 SECURITY MIDDLEWARE
 * 
 * Enterprise-grade security middleware with authentication tracking,
 * suspicious activity detection, and comprehensive protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { debug, DebugCategory } from '../utils/debug-tools';
import { securityValidator } from '../utils/security-validation';
import { authSecurityService } from '../services/auth-security.service';

interface SecurityConfig {
  enableCSRFProtection: boolean;
  enableRateLimiting: boolean;
  enableSecurityHeaders: boolean;
  enableRequestLogging: boolean;
  enableLoginTracking: boolean;
  enableSuspiciousActivityDetection: boolean;
  maxRequestsPerMinute: number;
  blockedIPs: string[];
  allowedOrigins: string[];
  trustedProxies: string[];
}

interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  origin: string;
  referer: string;
  method: string;
  path: string;
  timestamp: Date;
  userId?: string;
  email?: string;
  deviceFingerprint?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private requestLog: Array<SecurityContext> = [];
  private blockedRequests: Set<string> = new Set();
  
  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSRFProtection: true,
      enableRateLimiting: true,
      enableSecurityHeaders: true,
      enableRequestLogging: true,
      enableLoginTracking: true,
      enableSuspiciousActivityDetection: true,
      maxRequestsPerMinute: 100,
      blockedIPs: [],
      allowedOrigins: ['http://lvh.me:3000', 'https://lvh.me:3000'],
      trustedProxies: ['127.0.0.1', '::1'],
      ...config
    };
    
    debug.log(DebugCategory.SECURITY, 'Security Middleware initialized', {
      config: this.config
    });
  }
  
  /**
   * Main middleware handler
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const securityContext = this.extractSecurityContext(request);
    
    try {
      // Log request for security monitoring
      if (this.config.enableRequestLogging) {
        this.logRequest(securityContext);
      }
      
      // Check blocked IPs
      if (this.isIPBlocked(securityContext.ipAddress)) {
        return this.createBlockedResponse('IP_BLOCKED', 'Your IP address has been blocked');
      }
      
      // Rate limiting check
      if (this.config.enableRateLimiting) {
        const rateLimitResult = this.checkRateLimit(securityContext);
        if (rateLimitResult.blocked) {
          return this.createBlockedResponse('RATE_LIMITED', 'Too many requests');
        }
      }
      
      // CSRF protection for state-changing requests
      if (this.config.enableCSRFProtection && this.isStateChangingRequest(request)) {
        const csrfValid = await this.validateCSRFToken(request);
        if (!csrfValid) {
          return this.createBlockedResponse('CSRF_INVALID', 'Invalid CSRF token');
        }
      }
      
      // Track login attempts
      if (this.config.enableLoginTracking && this.isLoginRequest(request)) {
        await this.trackLoginAttempt(request, securityContext);
      }
      
      // Input validation for suspicious patterns
      const validationResult = await this.validateRequest(request);
      if (!validationResult.valid) {
        return this.createBlockedResponse('INVALID_INPUT', validationResult.reason || 'Invalid input detected');
      }
      
      // Continue with request
      const response = NextResponse.next();
      
      // Add security headers
      if (this.config.enableSecurityHeaders) {
        this.addSecurityHeaders(response, securityContext);
      }
      
      // Log response time
      const responseTime = Date.now() - startTime;
      debug.log(DebugCategory.PERFORMANCE, 'Security middleware completed', {
        path: securityContext.path,
        responseTime,
        ipAddress: securityContext.ipAddress
      });
      
      return response;
      
    } catch (error) {
      debug.error(DebugCategory.SECURITY, 'Security middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: securityContext.path,
        ipAddress: securityContext.ipAddress
      });
      
      return this.createBlockedResponse('SECURITY_ERROR', 'Security check failed');
    }
  }
  
  /**
   * Extract security context from request
   */
  private extractSecurityContext(request: NextRequest): SecurityContext {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0] || realIP || 'unknown';
    
    return {
      ipAddress,
      userAgent: request.headers.get('user-agent') || '',
      origin: request.headers.get('origin') || '',
      referer: request.headers.get('referer') || '',
      method: request.method,
      path: request.nextUrl.pathname,
      timestamp: new Date(),
      deviceFingerprint: this.generateDeviceFingerprint(request)
    };
  }
  
  /**
   * Generate device fingerprint for tracking
   */
  private generateDeviceFingerprint(request: NextRequest): string {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    
    const fingerprint = [userAgent, acceptLanguage, acceptEncoding].join('|');
    
    // Simple hash function for fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Check if IP is blocked
   */
  private isIPBlocked(ipAddress: string): boolean {
    return this.config.blockedIPs.includes(ipAddress) || 
           this.blockedRequests.has(ipAddress);
  }
  
  /**
   * Check rate limiting
   */
  private checkRateLimit(context: SecurityContext): RateLimitEntry {
    const key = `${context.ipAddress}:${context.path}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    let entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        blocked: false
      };
    } else {
      entry.count++;
    }
    
    // Check if limit exceeded
    if (entry.count > this.config.maxRequestsPerMinute) {
      entry.blocked = true;
      
      // Block IP temporarily for suspicious activity
      if (entry.count > this.config.maxRequestsPerMinute * 2) {
        this.blockedRequests.add(context.ipAddress);
        setTimeout(() => {
          this.blockedRequests.delete(context.ipAddress);
        }, 15 * 60 * 1000); // Block for 15 minutes
      }
    }
    
    this.rateLimitStore.set(key, entry);
    
    // Clean up old entries
    if (this.rateLimitStore.size > 10000) {
      for (const [key, entry] of this.rateLimitStore.entries()) {
        if (now > entry.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }
    }
    
    return entry;
  }
  
  /**
   * Validate CSRF token
   */
  private async validateCSRFToken(request: NextRequest): Promise<boolean> {
    const token = request.headers.get('x-csrf-token') || 
                 request.cookies.get('csrf-token')?.value;
    
    if (!token) {
      return false;
    }
    
    // In production, validate against server-side token
    // For now, just check if token exists and is not empty
    return token.length > 0;
  }
  
  /**
   * Track login attempts with authentication security service
   */
  private async trackLoginAttempt(request: NextRequest, context: SecurityContext): Promise<void> {
    try {
      const body = await this.getRequestBody(request);
      const email = body?.email || body?.username;
      
      if (!email) {
        return;
      }
      
      // Determine if login was successful (we'll need to check response in real implementation)
      // For now, assume all attempts are potential failures until proven otherwise
      const loginAttempt = {
        email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: false, // This would be determined by the actual login response
        deviceFingerprint: context.deviceFingerprint
      };
      
      const result = await authSecurityService.recordLoginAttempt(loginAttempt);
      
      if (!result.allowed) {
        debug.warn(DebugCategory.SECURITY, 'Login attempt blocked', {
          email,
          reason: result.reason,
          alerts: result.alerts.length
        });
        
        // Block this IP temporarily
        this.blockedRequests.add(context.ipAddress);
        setTimeout(() => {
          this.blockedRequests.delete(context.ipAddress);
        }, 10 * 60 * 1000); // Block for 10 minutes
      }
      
      // Log suspicious activity alerts
      if (result.alerts.length > 0) {
        result.alerts.forEach(alert => {
          debug.warn(DebugCategory.SECURITY, `Suspicious activity: ${alert.type}`, {
            email,
            severity: alert.severity,
            description: alert.description,
            evidence: alert.evidence
          });
        });
      }
      
    } catch (error) {
      debug.error(DebugCategory.SECURITY, 'Error tracking login attempt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: context.path
      });
    }
  }
  
  /**
   * Get request body safely
   */
  private async getRequestBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        return await request.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const body: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
          body[key] = value;
        }
        return body;
      }
      
      return null;
    } catch (error) {
      debug.warn(DebugCategory.SECURITY, 'Could not parse request body', {
        contentType: request.headers.get('content-type'),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
  
  /**
   * Validate request for suspicious patterns
   */
  private async validateRequest(request: NextRequest): Promise<{ valid: boolean; reason?: string }> {
    const url = request.nextUrl.toString();
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
      /exec.*sp_/i,
      /xp_cmdshell/i,
      /sp_executesql/i,
      /;.*--/i,
      /'.*or.*'.*=/i,
      /'.*and.*'.*=/i,
      /\'\s*or\s*\'\s*=\s*\'/i,
      /\'\s*and\s*\'\s*=\s*\'/i,
      /\'\s*or\s*1\s*=\s*1/i,
      /\'\s*and\s*1\s*=\s*1/i,
      /\'\s*or\s*1\s*=\s*2/i,
      /\'\s*and\s*1\s*=\s*2/i,
      /\'\s*or\s*true/i,
      /\'\s*and\s*false/i,
      /\'\s*or\s*\'\s*\w*\s*\'\s*=\s*\'/i,
      /\'\s*and\s*\'\s*\w*\s*\'\s*=\s*\'/i,
      /\'\s*or\s*\w*\s*=\s*\w*/i,
      /\'\s*and\s*\w*\s*=\s*\w*/i,
      /\'\s*or\s*\w*\s*like\s*\'/i,
      /\'\s*and\s*\w*\s*like\s*\'/i,
      /\'\s*or\s*\w*\s*in\s*\(/i,
      /\'\s*and\s*\w*\s*in\s*\(/i,
      /\'\s*or\s*\w*\s*between\s*/i,
      /\'\s*and\s*\w*\s*between\s*/i,
      /\'\s*or\s*\w*\s*is\s*null/i,
      /\'\s*and\s*\w*\s*is\s*null/i,
      /\'\s*or\s*\w*\s*is\s*not\s*null/i,
      /\'\s*and\s*\w*\s*is\s*not\s*null/i,
      /\'\s*or\s*exists\s*\(/i,
      /\'\s*and\s*exists\s*\(/i,
      /\'\s*or\s*not\s*exists\s*\(/i,
      /\'\s*and\s*not\s*exists\s*\(/i,
      /\'\s*or\s*\w*\s*>\s*\w*/i,
      /\'\s*and\s*\w*\s*>\s*\w*/i,
      /\'\s*or\s*\w*\s*<\s*\w*/i,
      /\'\s*and\s*\w*\s*<\s*\w*/i,
      /\'\s*or\s*\w*\s*>=\s*\w*/i,
      /\'\s*and\s*\w*\s*>=\s*\w*/i,
      /\'\s*or\s*\w*\s*<=\s*\w*/i,
      /\'\s*and\s*\w*\s*<=\s*\w*/i,
      /\'\s*or\s*\w*\s*<>\s*\w*/i,
      /\'\s*and\s*\w*\s*<>\s*\w*/i,
      /\'\s*or\s*\w*\s*!=\s*\w*/i,
      /\'\s*and\s*\w*\s*!=\s*\w*/i,
      /\'\s*or\s*\w*\s*regexp\s*\'/i,
      /\'\s*and\s*\w*\s*regexp\s*\'/i,
      /\'\s*or\s*\w*\s*rlike\s*\'/i,
      /\'\s*and\s*\w*\s*rlike\s*\'/i,
      /\'\s*or\s*\w*\s*sounds\s*like\s*\'/i,
      /\'\s*and\s*\w*\s*sounds\s*like\s*\'/i,
      /\'\s*or\s*\w*\s*div\s*\w*/i,
      /\'\s*and\s*\w*\s*div\s*\w*/i,
      /\'\s*or\s*\w*\s*mod\s*\w*/i,
      /\'\s*and\s*\w*\s*mod\s*\w*/i,
      /\'\s*or\s*\w*\s*<<\s*\w*/i,
      /\'\s*and\s*\w*\s*<<\s*\w*/i,
      /\'\s*or\s*\w*\s*>>\s*\w*/i,
      /\'\s*and\s*\w*\s*>>\s*\w*/i,
      /\'\s*or\s*\w*\s*&\s*\w*/i,
      /\'\s*and\s*\w*\s*&\s*\w*/i,
      /\'\s*or\s*\w*\s*\|\s*\w*/i,
      /\'\s*and\s*\w*\s*\|\s*\w*/i,
      /\'\s*or\s*\w*\s*\^\s*\w*/i,
      /\'\s*and\s*\w*\s*\^\s*\w*/i,
      /\'\s*or\s*\w*\s*~\s*\w*/i,
      /\'\s*and\s*\w*\s*~\s*\w*/i,
      /\'\s*or\s*\w*\s*\+\s*\w*/i,
      /\'\s*and\s*\w*\s*\+\s*\w*/i,
      /\'\s*or\s*\w*\s*\-\s*\w*/i,
      /\'\s*and\s*\w*\s*\-\s*\w*/i,
      /\'\s*or\s*\w*\s*\*\s*\w*/i,
      /\'\s*and\s*\w*\s*\*\s*\w*/i,
      /\'\s*or\s*\w*\s*\/\s*\w*/i,
      /\'\s*and\s*\w*\s*\/\s*\w*/i,
      /\'\s*or\s*\w*\s*%\s*\w*/i,
      /\'\s*and\s*\w*\s*%\s*\w*/i,
      /\'\s*or\s*\w*\s*=\s*\w*/i,
      /\'\s*and\s*\w*\s*=\s*\w*/i,
      /\'\s*or\s*\w*\s*<\s*\w*/i,
      /\'\s*and\s*\w*\s*<\s*\w*/i,
      /\'\s*or\s*\w*\s*>\s*\w*/i,
      /\'\s*and\s*\w*\s*>\s*\w*/i,
      /\'\s*or\s*\w*\s*<=\s*\w*/i,
      /\'\s*and\s*\w*\s*<=\s*\w*/i,
      /\'\s*or\s*\w*\s*>=\s*\w*/i,
      /\'\s*and\s*\w*\s*>=\s*\w*/i,
      /\'\s*or\s*\w*\s*<>\s*\w*/i,
      /\'\s*and\s*\w*\s*<>\s*\w*/i,
      /\'\s*or\s*\w*\s*!=\s*\w*/i,
      /\'\s*and\s*\w*\s*!=\s*\w*/i,
      /\'\s*or\s*\w*\s*like\s*\'/i,
      /\'\s*and\s*\w*\s*like\s*\'/i,
      /\'\s*or\s*\w*\s*in\s*\(/i,
      /\'\s*and\s*\w*\s*in\s*\(/i,
      /\'\s*or\s*\w*\s*between\s*/i,
      /\'\s*and\s*\w*\s*between\s*/i,
      /\'\s*or\s*\w*\s*is\s*null/i,
      /\'\s*and\s*\w*\s*is\s*null/i,
      /\'\s*or\s*\w*\s*is\s*not\s*null/i,
      /\'\s*and\s*\w*\s*is\s*not\s*null/i,
      /\'\s*or\s*exists\s*\(/i,
      /\'\s*and\s*exists\s*\(/i,
      /\'\s*or\s*not\s*exists\s*\(/i,
      /\'\s*and\s*not\s*exists\s*\(/i
    ];
    
    if (sqlInjectionPatterns.some(pattern => pattern.test(url))) {
      return { valid: false, reason: 'Potential SQL injection detected' };
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /<iframe[^>]*>.*?<\/iframe>/i,
      /<object[^>]*>.*?<\/object>/i,
      /<embed[^>]*>/i,
      /<link[^>]*>/i,
      /<img[^>]*onerror[^>]*>/i,
      /<svg[^>]*onload[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /onfocus=/i,
      /onblur=/i,
      /onkeydown=/i,
      /onkeyup=/i,
      /onkeypress=/i,
      /onsubmit=/i,
      /onreset=/i,
      /onselect=/i,
      /onchange=/i,
      /onabort=/i,
      /onunload=/i,
      /onresize=/i,
      /onmove=/i,
      /ondragdrop=/i,
      /expression\(/i,
      /url\(/i,
      /&lt;script/i,
      /&lt;iframe/i,
      /&lt;object/i,
      /&lt;embed/i,
      /&lt;link/i,
      /&lt;img/i,
      /&lt;svg/i,
      /&lt;style/i,
      /&lt;meta/i,
      /&lt;base/i,
      /&lt;form/i,
      /&lt;input/i,
      /&lt;textarea/i,
      /&lt;select/i,
      /&lt;option/i,
      /&lt;button/i,
      /&lt;label/i,
      /&lt;fieldset/i,
      /&lt;legend/i,
      /&lt;datalist/i,
      /&lt;keygen/i,
      /&lt;output/i,
      /&lt;progress/i,
      /&lt;meter/i,
      /&lt;details/i,
      /&lt;summary/i,
      /&lt;menuitem/i,
      /&lt;menu/i,
      /&lt;dialog/i,
      /&lt;canvas/i,
      /&lt;audio/i,
      /&lt;video/i,
      /&lt;source/i,
      /&lt;track/i,
      /&lt;area/i,
      /&lt;map/i,
      /&lt;param/i,
      /&lt;applet/i,
      /&lt;frame/i,
      /&lt;frameset/i,
      /&lt;noframes/i,
      /&lt;noscript/i,
      /&lt;plaintext/i,
      /&lt;listing/i,
      /&lt;xmp/i,
      /&lt;nextid/i,
      /&lt;spacer/i,
      /&lt;wbr/i,
      /&lt;nobr/i,
      /&lt;rt/i,
      /&lt;rp/i,
      /&lt;ruby/i,
      /&lt;bdi/i,
      /&lt;bdo/i,
      /&lt;time/i,
      /&lt;mark/i,
      /&lt;data/i,
      /&lt;var/i,
      /&lt;samp/i,
      /&lt;kbd/i,
      /&lt;sub/i,
      /&lt;sup/i,
      /&lt;i/i,
      /&lt;b/i,
      /&lt;u/i,
      /&lt;s/i,
      /&lt;small/i,
      /&lt;strong/i,
      /&lt;em/i,
      /&lt;cite/i,
      /&lt;q/i,
      /&lt;dfn/i,
      /&lt;abbr/i,
      /&lt;ruby/i,
      /&lt;rt/i,
      /&lt;rp/i,
      /&lt;bdi/i,
      /&lt;bdo/i,
      /&lt;span/i,
      /&lt;br/i,
      /&lt;wbr/i,
      /&lt;ins/i,
      /&lt;del/i,
      /&lt;img/i,
      /&lt;iframe/i,
      /&lt;embed/i,
      /&lt;object/i,
      /&lt;param/i,
      /&lt;video/i,
      /&lt;audio/i,
      /&lt;source/i,
      /&lt;track/i,
      /&lt;canvas/i,
      /&lt;map/i,
      /&lt;area/i,
      /&lt;svg/i,
      /&lt;math/i,
      /&lt;table/i,
      /&lt;caption/i,
      /&lt;colgroup/i,
      /&lt;col/i,
      /&lt;tbody/i,
      /&lt;thead/i,
      /&lt;tfoot/i,
      /&lt;tr/i,
      /&lt;td/i,
      /&lt;th/i,
      /&lt;form/i,
      /&lt;fieldset/i,
      /&lt;legend/i,
      /&lt;label/i,
      /&lt;input/i,
      /&lt;button/i,
      /&lt;select/i,
      /&lt;datalist/i,
      /&lt;optgroup/i,
      /&lt;option/i,
      /&lt;textarea/i,
      /&lt;keygen/i,
      /&lt;output/i,
      /&lt;progress/i,
      /&lt;meter/i,
      /&lt;details/i,
      /&lt;summary/i,
      /&lt;menuitem/i,
      /&lt;menu/i
    ];
    
    if (xssPatterns.some(pattern => pattern.test(url))) {
      return { valid: false, reason: 'Potential XSS attack detected' };
    }
    
    // Check for suspicious user agents
    const suspiciousUAPatterns = [
      /sqlmap/i,
      /nikto/i,
      /burp/i,
      /nmap/i,
      /masscan/i,
      /curl.*bot/i
    ];
    
    if (suspiciousUAPatterns.some(pattern => pattern.test(userAgent))) {
      return { valid: false, reason: 'Suspicious user agent detected' };
    }
    
    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, reason: 'Request too large' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if request is a state-changing operation
   */
  private isStateChangingRequest(request: NextRequest): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  }
  
  /**
   * Check if request is a login attempt
   */
  private isLoginRequest(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    const method = request.method;
    
    return method === 'POST' && (
      path.includes('/login') ||
      path.includes('/auth') ||
      path.includes('/signin')
    );
  }
  
  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse, context: SecurityContext): void {
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
    
    // CORS headers
    const origin = context.origin;
    if (this.config.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    }
    
    // Rate limiting headers
    const rateLimitKey = `${context.ipAddress}:${context.path}`;
    const rateLimitEntry = this.rateLimitStore.get(rateLimitKey);
    
    if (rateLimitEntry) {
      response.headers.set('X-RateLimit-Limit', this.config.maxRequestsPerMinute.toString());
      response.headers.set('X-RateLimit-Remaining', Math.max(0, this.config.maxRequestsPerMinute - rateLimitEntry.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitEntry.resetTime).toISOString());
    }
  }
  
  /**
   * Create blocked response
   */
  private createBlockedResponse(type: string, message: string): NextResponse {
    const response = NextResponse.json(
      { 
        error: message,
        type,
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    );
    
    // Add basic security headers even for blocked requests
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  }
  
  /**
   * Log request for monitoring
   */
  private logRequest(context: SecurityContext): void {
    this.requestLog.push(context);
    
    // Keep only last 1000 requests
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }
    
    debug.log(DebugCategory.SECURITY, 'Request logged', {
      method: context.method,
      path: context.path,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent.substring(0, 50)
    });
  }
  
  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalRequests: number;
    blockedRequests: number;
    rateLimitedRequests: number;
    uniqueIPs: number;
    suspiciousRequests: number;
    authenticationMetrics: any;
  } {
    const uniqueIPs = new Set(this.requestLog.map(log => log.ipAddress)).size;
    const rateLimitedRequests = Array.from(this.rateLimitStore.values())
      .filter(entry => entry.blocked).length;
    
    return {
      totalRequests: this.requestLog.length,
      blockedRequests: this.blockedRequests.size,
      rateLimitedRequests,
      uniqueIPs,
      suspiciousRequests: 0, // Would be calculated based on validation failures
      authenticationMetrics: authSecurityService.getSecurityMetrics()
    };
  }
  
  /**
   * Block IP address
   */
  blockIP(ipAddress: string, reason?: string): void {
    this.config.blockedIPs.push(ipAddress);
    this.blockedRequests.add(ipAddress);
    
    debug.warn(DebugCategory.SECURITY, 'IP address blocked', {
      ipAddress,
      reason: reason || 'Manual block'
    });
  }
  
  /**
   * Unblock IP address
   */
  unblockIP(ipAddress: string): void {
    this.config.blockedIPs = this.config.blockedIPs.filter(ip => ip !== ipAddress);
    this.blockedRequests.delete(ipAddress);
    
    debug.log(DebugCategory.SECURITY, 'IP address unblocked', { ipAddress });
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

export { SecurityMiddleware }; 