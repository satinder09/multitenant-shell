// Security utilities for the multitenant application

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 1,
  WEAK = 2,
  FAIR = 3,
  STRONG = 4,
  VERY_STRONG = 5
}

// Password strength result
export interface PasswordStrengthResult {
  score: number;
  strength: PasswordStrength;
  feedback: string[];
  isValid: boolean;
}

// Evaluate password strength
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else if (password.length >= 8) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }

  // Pattern checks (subtract points for common patterns)
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score -= 1;
  }

  if (/123|abc|qwe|password|admin|user/i.test(password)) {
    feedback.push('Avoid common patterns and words');
    score -= 2;
  }

  // Sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    feedback.push('Avoid sequential characters');
    score -= 1;
  }

  // Normalize score
  score = Math.max(0, Math.min(10, score));

  // Determine strength
  let strength: PasswordStrength;
  if (score <= 2) {
    strength = PasswordStrength.VERY_WEAK;
  } else if (score <= 4) {
    strength = PasswordStrength.WEAK;
  } else if (score <= 6) {
    strength = PasswordStrength.FAIR;
  } else if (score <= 8) {
    strength = PasswordStrength.STRONG;
  } else {
    strength = PasswordStrength.VERY_STRONG;
  }

  const isValid = strength >= PasswordStrength.FAIR && password.length >= 8;

  if (feedback.length === 0) {
    feedback.push('Password is strong');
  }

  return {
    score,
    strength,
    feedback,
    isValid
  };
}

// Generate cryptographically secure random string
export function generateSecureRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    // Node.js environment would require crypto module
    // For now, fallback to Math.random (not cryptographically secure)
    console.warn('Using Math.random for random string generation - not cryptographically secure');
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  
  return result;
}

// Generate secure password
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Hash password (client-side pre-hashing)
export async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback - in real implementation, use a proper hashing library
    console.warn('WebCrypto not available - password hashing not performed');
    return password;
  }
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\x00/g, '') // Remove null bytes
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Check if string contains only allowed characters
export function containsOnlyAllowedChars(
  input: string, 
  allowedPattern: RegExp = /^[a-zA-Z0-9\s\-_]+$/
): boolean {
  return allowedPattern.test(input);
}

// Rate limiting utilities
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitState {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitState>();

  constructor(private config: RateLimitConfig) {}

  public checkLimit(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const current = this.store.get(identifier);

    if (!current || now >= current.resetTime) {
      // Reset or first request
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1
      };
    }

    if (current.count >= this.config.maxRequests) {
      return {
        allowed: false,
        resetTime: current.resetTime
      };
    }

    // Increment count
    current.count++;
    this.store.set(identifier, current);

    return {
      allowed: true,
      remaining: this.config.maxRequests - current.count
    };
  }

  public reset(identifier: string): void {
    this.store.delete(identifier);
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now >= value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// JWT utilities (for client-side validation only)
export interface JWTPayload {
  [key: string]: any;
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}

// Decode JWT payload (without verification - for display purposes only)
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Check if JWT is expired (client-side only)
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) {
    return true;
  }

  return Date.now() >= payload.exp * 1000;
}

// Content Security Policy helpers
export function generateNonce(): string {
  return generateSecureRandomString(16);
}

export function createCSPDirective(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// Input validation helpers
export function validateLength(input: string, min: number, max: number): boolean {
  return input.length >= min && input.length <= max;
}

export function validatePattern(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

export function validateWhitelist(input: string, whitelist: string[]): boolean {
  return whitelist.includes(input);
}

// Escape HTML entities
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Session security
export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export function isSessionValid(session: SessionInfo): boolean {
  return Date.now() < session.expiresAt;
}

export function shouldRefreshSession(session: SessionInfo, refreshThreshold: number = 5 * 60 * 1000): boolean {
  return (session.expiresAt - Date.now()) < refreshThreshold;
}

// File upload security
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? allowedTypes.includes(extension) : false;
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

// Environment variable validation
export function validateEnvVar(name: string, value: string | undefined, required: boolean = true): string | null {
  if (!value) {
    if (required) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return null;
  }
  
  return value;
}

export function validateEnvVars(config: Record<string, { required?: boolean; pattern?: RegExp }>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  
  for (const [name, options] of Object.entries(config)) {
    const value = process.env[name];
    const validated = validateEnvVar(name, value, options.required);
    
    if (validated && options.pattern && !options.pattern.test(validated)) {
      throw new Error(`Environment variable ${name} does not match required pattern`);
    }
    
    result[name] = validated;
  }
  
  return result;
} 