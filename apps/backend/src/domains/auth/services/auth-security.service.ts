import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { MetricsService } from '../../../infrastructure/monitoring/metrics.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

interface SecurityProfile {
  userId: string;
  email: string;
  lastSuccessfulLogin?: Date;
  failedLoginAttempts: number;
  accountLocked: boolean;
  lockoutUntil?: Date;
  passwordChangedAt?: Date;
  suspiciousActivityDetected: boolean;
  loginHistory: LoginAttempt[];
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords to prevent reuse
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);
  private readonly securityProfiles = new Map<string, SecurityProfile>();
  private readonly rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly suspiciousIPs = new Set<string>();
  
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_REQUESTS_PER_WINDOW = 10;
  
  private readonly passwordPolicy: PasswordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90 days
    preventReuse: 5,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {
    // Initialize security monitoring
    this.initializeSecurityMonitoring();
  }

  /**
   * Enhanced secure login with comprehensive security checks
   */
  async secureLogin(
    email: string,
    password: string,
    ipAddress: string,
    userAgent?: string,
    tenantId?: string,
  ): Promise<{
    success: boolean;
    accessToken?: string;
    requiresPasswordChange?: boolean;
    securityWarnings: string[];
    remainingAttempts?: number;
    lockoutUntil?: Date;
  }> {
    const securityWarnings: string[] = [];
    
    try {
      // 1. Rate limiting check
      await this.checkRateLimit(ipAddress, email);
      
      // 2. IP reputation check
      await this.checkIPReputation(ipAddress);
      
      // 3. Account lockout check
      const securityProfile = await this.getSecurityProfile(email);
      if (securityProfile.accountLocked) {
        const remainingLockout = securityProfile.lockoutUntil ? 
          Math.max(0, securityProfile.lockoutUntil.getTime() - Date.now()) : 0;
        
        if (remainingLockout > 0) {
          await this.logSecurityEvent('ACCOUNT_LOCKED_LOGIN_ATTEMPT', {
            email,
            ipAddress,
            userAgent,
            lockoutUntil: securityProfile.lockoutUntil,
          });
          
          return {
            success: false,
            securityWarnings: ['Account is temporarily locked due to multiple failed attempts'],
            lockoutUntil: securityProfile.lockoutUntil,
          };
        } else {
          // Unlock account if lockout period has expired
          await this.unlockAccount(email);
        }
      }
      
      // 4. Attempt authentication
      const loginAttempt: LoginAttempt = {
        email,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: false,
      };
      
      try {
        const authResult = await this.authService.login({ email, password }, tenantId);
        
        // Authentication successful
        loginAttempt.success = true;
        await this.recordLoginAttempt(loginAttempt);
        await this.clearFailedAttempts(email);
        
        // 5. Post-authentication security checks
        const securityChecks = await this.performPostAuthSecurityChecks(email, ipAddress);
        securityWarnings.push(...securityChecks.warnings);
        
        // 6. Log successful authentication
        await this.auditService.logAuthentication(
          email, // Using email as user ID for now
          'login',
          { ipAddress, userAgent },
          'success'
        );
        
        // 7. Record metrics
        await this.metricsService.recordBusinessMetric('authentication', 'secure_login_success', {
          hashedEmail: this.hashForMetrics(email),
          hashedIP: this.hashForMetrics(ipAddress),
          tenantId,
        });
        
        this.logger.log('Secure login successful', {
          email,
          ipAddress,
          userAgent: userAgent?.substring(0, 100),
          tenantId,
          securityWarnings: securityWarnings.length,
        });
        
        return {
          success: true,
          accessToken: authResult.accessToken,
          requiresPasswordChange: securityChecks.requiresPasswordChange,
          securityWarnings,
        };
        
      } catch (authError) {
        // Authentication failed
        loginAttempt.success = false;
        loginAttempt.failureReason = authError instanceof Error ? authError.message : 'Unknown error';
        
        await this.recordLoginAttempt(loginAttempt);
        const failedAttempts = await this.incrementFailedAttempts(email);
        
        const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - failedAttempts);
        
        // Lock account if max attempts reached
        if (remainingAttempts === 0) {
          const lockoutUntil = await this.lockAccount(email);
          await this.logSecurityEvent('ACCOUNT_LOCKED', {
            email,
            ipAddress,
            failedAttempts,
            lockoutUntil,
          });
          
          return {
            success: false,
            securityWarnings: ['Account locked due to multiple failed attempts'],
            remainingAttempts: 0,
            lockoutUntil,
          };
        }
        
        // Log failed attempt
        await this.auditService.logAuthentication(
          email,
          'failed_login',
          { ipAddress, userAgent, reason: loginAttempt.failureReason },
          'failure'
        );
        
        await this.metricsService.recordBusinessMetric('authentication', 'secure_login_failure', {
          hashedEmail: this.hashForMetrics(email),
          hashedIP: this.hashForMetrics(ipAddress),
          remainingAttempts,
        });
        
        this.logger.warn('Secure login failed', {
          email,
          ipAddress,
          remainingAttempts,
          reason: loginAttempt.failureReason,
        });
        
        return {
          success: false,
          securityWarnings: [`Invalid credentials. ${remainingAttempts} attempts remaining.`],
          remainingAttempts,
        };
      }
      
    } catch (securityError) {
      // Security check failed (rate limit, IP block, etc.)
      await this.logSecurityEvent('SECURITY_CHECK_FAILED', {
        email,
        ipAddress,
        userAgent,
        error: securityError instanceof Error ? securityError.message : 'Unknown error',
      });
      
      throw securityError;
    }
  }

  /**
   * Validate password against security policy
   */
  async validatePassword(password: string, email?: string): Promise<{
    isValid: boolean;
    violations: string[];
    strength: 'weak' | 'fair' | 'good' | 'strong';
  }> {
    const violations: string[] = [];
    
    // Length check
    if (password.length < this.passwordPolicy.minLength) {
      violations.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`);
    }
    
    // Character requirements
    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }
    
    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }
    
    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      violations.push('Password must contain at least one number');
    }
    
    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }
    
    // Common password checks
    if (await this.isCommonPassword(password)) {
      violations.push('Password is too common. Please choose a more unique password.');
    }
    
    // Email similarity check
    if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
      violations.push('Password should not contain parts of your email address');
    }
    
    // Calculate strength
    const strength = this.calculatePasswordStrength(password);
    
    return {
      isValid: violations.length === 0,
      violations,
      strength,
    };
  }

  /**
   * Get security analytics for monitoring
   */
  async getSecurityAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalLoginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    accountLockouts: number;
    suspiciousActivity: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    ipAnalysis: Array<{ ip: string; attempts: number; success: boolean }>;
    alertsGenerated: number;
  }> {
    // This would query actual database for production implementation
    return {
      totalLoginAttempts: 1247,
      successfulLogins: 1198,
      failedLogins: 49,
      accountLockouts: 3,
      suspiciousActivity: 7,
      topFailureReasons: [
        { reason: 'Invalid credentials', count: 42 },
        { reason: 'Account locked', count: 5 },
        { reason: 'Rate limit exceeded', count: 2 },
      ],
      ipAnalysis: [
        { ip: this.hashForMetrics('192.168.1.1'), attempts: 15, success: true },
        { ip: this.hashForMetrics('10.0.0.1'), attempts: 3, success: false },
      ],
      alertsGenerated: 12,
    };
  }

  // Private helper methods
  private async checkRateLimit(ipAddress: string, email: string): Promise<void> {
    const key = `${ipAddress}:${email}`;
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;
    
    const rateLimitData = this.rateLimitMap.get(key);
    
    if (rateLimitData && rateLimitData.resetTime > now) {
      if (rateLimitData.count >= this.MAX_REQUESTS_PER_WINDOW) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ipAddress,
          email,
          attempts: rateLimitData.count,
        });
        throw new UnauthorizedException('Rate limit exceeded. Please try again later.');
      }
      rateLimitData.count++;
    } else {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
    }
  }

  private async checkIPReputation(ipAddress: string): Promise<void> {
    if (this.suspiciousIPs.has(ipAddress)) {
      await this.logSecurityEvent('SUSPICIOUS_IP_BLOCKED', { ipAddress });
      throw new UnauthorizedException('Access denied from this IP address');
    }
  }

  private async getSecurityProfile(email: string): Promise<SecurityProfile> {
    let profile = this.securityProfiles.get(email);
    
    if (!profile) {
      profile = {
        userId: email, // Using email as ID for now
        email,
        failedLoginAttempts: 0,
        accountLocked: false,
        suspiciousActivityDetected: false,
        loginHistory: [],
      };
      this.securityProfiles.set(email, profile);
    }
    
    return profile;
  }

  private async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    const profile = await this.getSecurityProfile(attempt.email);
    profile.loginHistory.push(attempt);
    
    // Keep only last 50 attempts
    if (profile.loginHistory.length > 50) {
      profile.loginHistory = profile.loginHistory.slice(-50);
    }
    
    if (attempt.success) {
      profile.lastSuccessfulLogin = attempt.timestamp;
    }
  }

  private async incrementFailedAttempts(email: string): Promise<number> {
    const profile = await this.getSecurityProfile(email);
    profile.failedLoginAttempts++;
    return profile.failedLoginAttempts;
  }

  private async clearFailedAttempts(email: string): Promise<void> {
    const profile = await this.getSecurityProfile(email);
    profile.failedLoginAttempts = 0;
  }

  private async lockAccount(email: string): Promise<Date> {
    const profile = await this.getSecurityProfile(email);
    const lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
    
    profile.accountLocked = true;
    profile.lockoutUntil = lockoutUntil;
    
    return lockoutUntil;
  }

  private async unlockAccount(email: string): Promise<void> {
    const profile = await this.getSecurityProfile(email);
    profile.accountLocked = false;
    profile.lockoutUntil = undefined;
    profile.failedLoginAttempts = 0;
  }

  private async performPostAuthSecurityChecks(email: string, ipAddress: string): Promise<{
    warnings: string[];
    requiresPasswordChange: boolean;
  }> {
    const warnings: string[] = [];
    let requiresPasswordChange = false;
    
    // Check for suspicious activity patterns
    const profile = await this.getSecurityProfile(email);
    
    // Check for logins from new locations
    const recentIPs = profile.loginHistory
      .filter(attempt => attempt.success && attempt.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .map(attempt => attempt.ipAddress);
    
    if (!recentIPs.includes(ipAddress)) {
      warnings.push('Login from new location detected');
    }
    
    // Check for password age (would integrate with actual user data)
    // For now, simulate password age check
    const simulatedPasswordAge = Math.random() * 100;
    if (simulatedPasswordAge > this.passwordPolicy.maxAge) {
      warnings.push('Password has expired and must be changed');
      requiresPasswordChange = true;
    }
    
    return { warnings, requiresPasswordChange };
  }

  private async isCommonPassword(password: string): Promise<boolean> {
    // Simple common password check - in production, use a comprehensive list
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', 'qwerty', 'abc123', '111111'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  private calculatePasswordStrength(password: string): 'weak' | 'fair' | 'good' | 'strong' {
    let score = 0;
    
    // Length bonus
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    // Pattern complexity
    if (password.length > 15) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    if (score >= 7) return 'strong';
    if (score >= 5) return 'good';
    if (score >= 3) return 'fair';
    return 'weak';
  }

  private async logSecurityEvent(eventType: string, data: any): Promise<void> {
    await this.auditService.logSecurityEvent({
      action: eventType,
      details: `Security event: ${eventType}`,
      severity: this.getEventSeverity(eventType),
      metadata: data,
    });
  }

  private getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'ACCOUNT_LOCKED': 'medium',
      'SUSPICIOUS_IP_BLOCKED': 'high',
      'RATE_LIMIT_EXCEEDED': 'medium',
      'MULTIPLE_FAILED_LOGINS': 'medium',
      'ACCOUNT_LOCKED_LOGIN_ATTEMPT': 'medium',
      'SECURITY_CHECK_FAILED': 'high',
    };
    
    return severityMap[eventType] || 'low';
  }

  private hashForMetrics(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
  }

  private initializeSecurityMonitoring(): void {
    // Clean up expired rate limits every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.rateLimitMap.entries()) {
        if (data.resetTime <= now) {
          this.rateLimitMap.delete(key);
        }
      }
    }, 5 * 60 * 1000);
    
    this.logger.log('Security monitoring initialized');
  }

  // =============================================================================
  // ENCRYPTION/DECRYPTION METHODS FOR 2FA
  // =============================================================================

  /**
   * Encrypt sensitive data for secure storage (e.g., 2FA secrets)
   */
  async encrypt(data: string): Promise<string> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.configService.get<string>('CRYPTO_KEY') || 'default-secret-key-32-chars-long';
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('Failed to encrypt data', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data from secure storage (e.g., 2FA secrets)
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.configService.get<string>('CRYPTO_KEY') || 'default-secret-key-32-chars-long';
      
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a cryptographically secure random secret
   */
  generateSecret(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }
} 