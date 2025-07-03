/**
 * 🔒 PLATFORM SECURITY VALIDATION UTILITIES
 * 
 * Comprehensive security validation and sanitization for the multitenant platform
 * Protects against XSS, SQL injection, and other common security vulnerabilities
 */

const DOMPurify = require('isomorphic-dompurify');
import { debug, DebugCategory } from './debug-tools';

// Security validation patterns
const SECURITY_PATTERNS = {
  // XSS patterns
  XSS_SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  XSS_JAVASCRIPT: /javascript:/gi,
  XSS_VBSCRIPT: /vbscript:/gi,
  XSS_ONLOAD: /onload\s*=/gi,
  XSS_ONERROR: /onerror\s*=/gi,
  XSS_ONCLICK: /onclick\s*=/gi,
  
  // SQL injection patterns
  SQL_INJECTION: /('|\\|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  
  // Path traversal patterns
  PATH_TRAVERSAL: /(\.\.[\/\\]|\.\.\\|\.\.\/)/gi,
  
  // Command injection patterns
  COMMAND_INJECTION: /[;&|`$(){}[\]]/g,
  
  // Email validation (RFC 5322 compliant)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // URL validation
  URL: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
  
  // Username validation (alphanumeric + underscore/dash)
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  
  // Password strength (min 8 chars, at least one uppercase, lowercase, number, special char)
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Tenant name validation
  TENANT_NAME: /^[a-zA-Z0-9][a-zA-Z0-9\s.-]{1,48}[a-zA-Z0-9]$/,
  
  // Subdomain validation
  SUBDOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]$/,
};

// Security threat levels
export enum SecurityThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Security validation result
export interface SecurityValidationResult {
  isValid: boolean;
  isSafe: boolean;
  threats: SecurityThreat[];
  sanitizedValue?: string;
  threatLevel: SecurityThreatLevel;
}

// Security threat interface
export interface SecurityThreat {
  type: string;
  description: string;
  pattern: string;
  severity: SecurityThreatLevel;
  matches: string[];
}

class PlatformSecurityValidator {
  /**
   * Comprehensive security validation for any input
   */
  validateInput(input: string, context: string = 'general'): SecurityValidationResult {
    debug.log(DebugCategory.SECURITY, `Validating input for context: ${context}`, { 
      inputLength: input.length,
      context 
    });
    
    const threats: SecurityThreat[] = [];
    let threatLevel = SecurityThreatLevel.LOW;
    
    // Check for XSS threats
    const xssThreats = this.detectXSSThreats(input);
    threats.push(...xssThreats);
    
    // Check for SQL injection threats
    const sqlThreats = this.detectSQLInjectionThreats(input);
    threats.push(...sqlThreats);
    
    // Check for path traversal threats
    const pathThreats = this.detectPathTraversalThreats(input);
    threats.push(...pathThreats);
    
    // Check for command injection threats
    const commandThreats = this.detectCommandInjectionThreats(input);
    threats.push(...commandThreats);
    
    // Determine overall threat level
    threatLevel = this.calculateThreatLevel(threats);
    
    // Sanitize input
    const sanitizedValue = this.sanitizeInput(input, context);
    
    const result: SecurityValidationResult = {
      isValid: threats.length === 0,
      isSafe: threatLevel !== SecurityThreatLevel.CRITICAL,
      threats,
      sanitizedValue,
      threatLevel
    };
    
    if (threats.length > 0) {
      debug.warn(DebugCategory.SECURITY, `Security threats detected`, {
        threatCount: threats.length,
        threatLevel,
        threats: threats.map(t => t.type)
      });
    }
    
    return result;
  }
  
  private detectXSSThreats(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    // Check for script tags
    const scriptMatches = input.match(SECURITY_PATTERNS.XSS_SCRIPT);
    if (scriptMatches) {
      threats.push({
        type: 'XSS_SCRIPT_INJECTION',
        description: 'Script tag injection detected',
        pattern: 'script tags',
        severity: SecurityThreatLevel.CRITICAL,
        matches: scriptMatches
      });
    }
    
    // Check for javascript protocol
    const jsMatches = input.match(SECURITY_PATTERNS.XSS_JAVASCRIPT);
    if (jsMatches) {
      threats.push({
        type: 'XSS_JAVASCRIPT_PROTOCOL',
        description: 'JavaScript protocol usage detected',
        pattern: 'javascript:',
        severity: SecurityThreatLevel.HIGH,
        matches: jsMatches
      });
    }
    
    // Check for event handlers
    const eventHandlers = [
      SECURITY_PATTERNS.XSS_ONLOAD,
      SECURITY_PATTERNS.XSS_ONERROR,
      SECURITY_PATTERNS.XSS_ONCLICK
    ];
    
    eventHandlers.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        threats.push({
          type: 'XSS_EVENT_HANDLER',
          description: 'HTML event handler injection detected',
          pattern: pattern.source,
          severity: SecurityThreatLevel.HIGH,
          matches
        });
      }
    });
    
    return threats;
  }
  
  private detectSQLInjectionThreats(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    const sqlMatches = input.match(SECURITY_PATTERNS.SQL_INJECTION);
    if (sqlMatches) {
      threats.push({
        type: 'SQL_INJECTION',
        description: 'SQL injection patterns detected',
        pattern: 'SQL metacharacters or keywords',
        severity: SecurityThreatLevel.CRITICAL,
        matches: sqlMatches
      });
    }
    
    return threats;
  }
  
  private detectPathTraversalThreats(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    const pathMatches = input.match(SECURITY_PATTERNS.PATH_TRAVERSAL);
    if (pathMatches) {
      threats.push({
        type: 'PATH_TRAVERSAL',
        description: 'Path traversal attempt detected',
        pattern: '../ patterns',
        severity: SecurityThreatLevel.HIGH,
        matches: pathMatches
      });
    }
    
    return threats;
  }
  
  private detectCommandInjectionThreats(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    const commandMatches = input.match(SECURITY_PATTERNS.COMMAND_INJECTION);
    if (commandMatches) {
      threats.push({
        type: 'COMMAND_INJECTION',
        description: 'Command injection metacharacters detected',
        pattern: 'shell metacharacters',
        severity: SecurityThreatLevel.HIGH,
        matches: commandMatches
      });
    }
    
    return threats;
  }
  
  private calculateThreatLevel(threats: SecurityThreat[]): SecurityThreatLevel {
    if (threats.length === 0) return SecurityThreatLevel.LOW;
    
    const hasCritical = threats.some(t => t.severity === SecurityThreatLevel.CRITICAL);
    if (hasCritical) return SecurityThreatLevel.CRITICAL;
    
    const hasHigh = threats.some(t => t.severity === SecurityThreatLevel.HIGH);
    if (hasHigh) return SecurityThreatLevel.HIGH;
    
    const hasMedium = threats.some(t => t.severity === SecurityThreatLevel.MEDIUM);
    if (hasMedium) return SecurityThreatLevel.MEDIUM;
    
    return SecurityThreatLevel.LOW;
  }
  
  /**
   * Sanitize input based on context
   */
  sanitizeInput(input: string, context: string = 'general'): string {
    let sanitized = input;
    
    switch (context) {
      case 'html':
        sanitized = DOMPurify.sanitize(input, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: []
        });
        break;
        
      case 'username':
        sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '');
        break;
        
      case 'email':
        sanitized = input.toLowerCase().trim();
        break;
        
      case 'url':
        sanitized = input.replace(/[^a-zA-Z0-9:/?#[\]@!$&'()*+,;=.-]/g, '');
        break;
        
      case 'tenant-name':
        sanitized = input.replace(/[^a-zA-Z0-9\s.-]/g, '');
        break;
        
      case 'subdomain':
        sanitized = input.toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
        break;
        
      default:
        // General sanitization
        sanitized = DOMPurify.sanitize(input, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
    }
    
    return sanitized;
  }
  
  /**
   * Validate specific field types
   */
  validateEmail(email: string): boolean {
    return SECURITY_PATTERNS.EMAIL.test(email);
  }
  
  validateURL(url: string): boolean {
    return SECURITY_PATTERNS.URL.test(url);
  }
  
  validateUsername(username: string): boolean {
    return SECURITY_PATTERNS.USERNAME.test(username);
  }
  
  validatePasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password must be at least 8 characters long');
    }
    
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one lowercase letter');
    }
    
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one uppercase letter');
    }
    
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one number');
    }
    
    if (/[@$!%*?&]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      isStrong: score >= 4,
      score,
      feedback
    };
  }
  
  validateTenantName(name: string): boolean {
    return SECURITY_PATTERNS.TENANT_NAME.test(name);
  }
  
  validateSubdomain(subdomain: string): boolean {
    return SECURITY_PATTERNS.SUBDOMAIN.test(subdomain);
  }
}

// Export singleton instance
export const securityValidator = new PlatformSecurityValidator();

// Convenience functions for common validations
export const validateInput = (input: string, context?: string) => 
  securityValidator.validateInput(input, context);

export const sanitizeInput = (input: string, context?: string) => 
  securityValidator.sanitizeInput(input, context);

export const validateEmail = (email: string) => 
  securityValidator.validateEmail(email);

export const validateURL = (url: string) => 
  securityValidator.validateURL(url);

export const validateUsername = (username: string) => 
  securityValidator.validateUsername(username);

export const validatePasswordStrength = (password: string) => 
  securityValidator.validatePasswordStrength(password);

export const validateTenantName = (name: string) => 
  securityValidator.validateTenantName(name);

export const validateSubdomain = (subdomain: string) => 
  securityValidator.validateSubdomain(subdomain);

// Export main class and types
export { PlatformSecurityValidator, SECURITY_PATTERNS }; 