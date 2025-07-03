/**
 * 🔐 AUTHENTICATION SECURITY SERVICE
 * 
 * Advanced authentication security features including token rotation, 
 * suspicious activity detection, account lockout, and 2FA support
 */

import { debug, DebugCategory } from '../utils/debug-tools';
import { securityValidator } from '../utils/security-validation';

// Authentication security interfaces
export interface AuthSecurityConfig {
  enableRefreshTokenRotation: boolean;
  enableSuspiciousActivityDetection: boolean;
  enableAccountLockout: boolean;
  enable2FA: boolean;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  refreshTokenTTL: number;
  suspiciousActivityThreshold: number;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  deviceFingerprint?: string;
}

export interface SuspiciousActivityAlert {
  type: 'UNUSUAL_LOCATION' | 'MULTIPLE_FAILED_ATTEMPTS' | 'NEW_DEVICE' | 'RAPID_REQUESTS' | 'TIME_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: Record<string, any>;
  timestamp: Date;
  userId?: string;
  email?: string;
}

export interface AccountLockout {
  email: string;
  lockedAt: Date;
  unlockAt: Date;
  reason: string;
  failedAttempts: number;
  lastAttemptAt: Date;
}

export interface TwoFactorAuth {
  userId: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsedAt?: Date;
  qrCodeUrl?: string;
}

class AuthenticationSecurityService {
  private config: AuthSecurityConfig;
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private accountLockouts: Map<string, AccountLockout> = new Map();
  private refreshTokens: Map<string, { token: string; expiresAt: Date; userId: string }> = new Map();
  private twoFactorAuth: Map<string, TwoFactorAuth> = new Map();
  private deviceFingerprints: Map<string, Set<string>> = new Map();
  
  constructor(config: Partial<AuthSecurityConfig> = {}) {
    this.config = {
      enableRefreshTokenRotation: true,
      enableSuspiciousActivityDetection: true,
      enableAccountLockout: true,
      enable2FA: false,
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      refreshTokenTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      suspiciousActivityThreshold: 3,
      ...config
    };
    
    debug.log(DebugCategory.SECURITY, 'Authentication Security Service initialized', {
      config: this.config
    });
  }
  
  /**
   * Record a login attempt and perform security checks
   */
  async recordLoginAttempt(attempt: Omit<LoginAttempt, 'id' | 'timestamp'>): Promise<{
    allowed: boolean;
    reason?: string;
    alerts: SuspiciousActivityAlert[];
    lockout?: AccountLockout;
  }> {
    const loginAttempt: LoginAttempt = {
      ...attempt,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    debug.log(DebugCategory.AUTH, 'Recording login attempt', {
      email: attempt.email,
      success: attempt.success,
      ipAddress: attempt.ipAddress
    });
    
    // Store the attempt
    const userAttempts = this.loginAttempts.get(attempt.email) || [];
    userAttempts.push(loginAttempt);
    this.loginAttempts.set(attempt.email, userAttempts.slice(-20)); // Keep last 20 attempts
    
    // Check if account is locked
    if (this.isAccountLocked(attempt.email)) {
      return {
        allowed: false,
        reason: 'Account is locked due to suspicious activity',
        alerts: [],
        lockout: this.accountLockouts.get(attempt.email)
      };
    }
    
    // Detect suspicious activity
    const alerts = this.detectSuspiciousActivity(loginAttempt);
    
    // Handle failed attempt
    if (!attempt.success) {
      const lockout = this.handleFailedAttempt(attempt.email);
      return {
        allowed: !lockout,
        reason: lockout ? 'Too many failed attempts. Account locked.' : undefined,
        alerts,
        lockout: lockout || undefined
      };
    }
    
    // Clear failed attempts on successful login
    this.clearFailedAttempts(attempt.email);
    
    // Update device fingerprint
    if (attempt.deviceFingerprint) {
      this.updateDeviceFingerprint(attempt.email, attempt.deviceFingerprint);
    }
    
    return {
      allowed: true,
      alerts
    };
  }
  
  /**
   * Generate and rotate refresh tokens
   */
  async generateRefreshToken(userId: string, oldTokenId?: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    if (!this.config.enableRefreshTokenRotation) {
      throw new Error('Refresh token rotation is disabled');
    }
    
    // Revoke old token if provided
    if (oldTokenId) {
      this.refreshTokens.delete(oldTokenId);
      debug.log(DebugCategory.AUTH, 'Revoked old refresh token', { oldTokenId });
    }
    
    // Generate new token
    const tokenId = this.generateId();
    const token = await this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTTL);
    
    this.refreshTokens.set(tokenId, {
      token,
      expiresAt,
      userId
    });
    
    debug.log(DebugCategory.AUTH, 'Generated new refresh token', {
      tokenId,
      userId,
      expiresAt
    });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return { token: tokenId, expiresAt };
  }
  
  /**
   * Validate and refresh access token
   */
  async validateRefreshToken(tokenId: string): Promise<{
    valid: boolean;
    userId?: string;
    newToken?: { token: string; expiresAt: Date };
  }> {
    const tokenData = this.refreshTokens.get(tokenId);
    
    if (!tokenData) {
      debug.warn(DebugCategory.AUTH, 'Invalid refresh token', { tokenId });
      return { valid: false };
    }
    
    if (tokenData.expiresAt < new Date()) {
      debug.warn(DebugCategory.AUTH, 'Expired refresh token', { tokenId });
      this.refreshTokens.delete(tokenId);
      return { valid: false };
    }
    
    // Generate new token if rotation is enabled
    if (this.config.enableRefreshTokenRotation) {
      const newToken = await this.generateRefreshToken(tokenData.userId, tokenId);
      return {
        valid: true,
        userId: tokenData.userId,
        newToken
      };
    }
    
    return {
      valid: true,
      userId: tokenData.userId
    };
  }
  
  /**
   * Setup Two-Factor Authentication
   */
  async setup2FA(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    if (!this.config.enable2FA) {
      throw new Error('2FA is disabled');
    }
    
    const secret = this.generateTOTPSecret();
    const backupCodes = this.generateBackupCodes();
    const qrCodeUrl = this.generateQRCodeUrl(userId, secret);
    
    this.twoFactorAuth.set(userId, {
      userId,
      secret,
      backupCodes,
      isEnabled: false, // Enabled after verification
      qrCodeUrl
    });
    
    debug.log(DebugCategory.AUTH, '2FA setup initiated', { userId });
    
    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }
  
  /**
   * Verify 2FA token and enable 2FA
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const twoFA = this.twoFactorAuth.get(userId);
    if (!twoFA) {
      return false;
    }
    
    const isValid = this.verifyTOTPToken(twoFA.secret, token);
    
    if (isValid) {
      twoFA.isEnabled = true;
      twoFA.lastUsedAt = new Date();
      debug.log(DebugCategory.AUTH, '2FA enabled successfully', { userId });
    }
    
    return isValid;
  }
  
  /**
   * Validate 2FA token during login
   */
  async validate2FAToken(userId: string, token: string): Promise<boolean> {
    const twoFA = this.twoFactorAuth.get(userId);
    if (!twoFA || !twoFA.isEnabled) {
      return false;
    }
    
    // Check if it's a backup code
    if (this.isBackupCode(token)) {
      const isValid = twoFA.backupCodes.includes(token);
      if (isValid) {
        // Remove used backup code
        twoFA.backupCodes = twoFA.backupCodes.filter(code => code !== token);
        debug.log(DebugCategory.AUTH, 'Backup code used', { userId });
      }
      return isValid;
    }
    
    // Verify TOTP token
    const isValid = this.verifyTOTPToken(twoFA.secret, token);
    if (isValid) {
      twoFA.lastUsedAt = new Date();
    }
    
    return isValid;
  }
  
  /**
   * Detect suspicious login activity
   */
  private detectSuspiciousActivity(attempt: LoginAttempt): SuspiciousActivityAlert[] {
    if (!this.config.enableSuspiciousActivityDetection) {
      return [];
    }
    
    const alerts: SuspiciousActivityAlert[] = [];
    const userAttempts = this.loginAttempts.get(attempt.email) || [];
    
    // Check for multiple failed attempts
    const recentFailures = userAttempts
      .filter(a => !a.success && Date.now() - a.timestamp.getTime() < 60000) // Last minute
      .length;
    
    if (recentFailures >= this.config.suspiciousActivityThreshold) {
      alerts.push({
        type: 'MULTIPLE_FAILED_ATTEMPTS',
        severity: 'HIGH',
        description: `${recentFailures} failed login attempts in the last minute`,
        evidence: { failureCount: recentFailures, timeWindow: '1 minute' },
        timestamp: new Date(),
        email: attempt.email
      });
    }
    
    // Check for new device
    if (attempt.deviceFingerprint) {
      const userDevices = this.deviceFingerprints.get(attempt.email) || new Set();
      if (!userDevices.has(attempt.deviceFingerprint)) {
        alerts.push({
          type: 'NEW_DEVICE',
          severity: 'MEDIUM',
          description: 'Login attempt from new device',
          evidence: { deviceFingerprint: attempt.deviceFingerprint },
          timestamp: new Date(),
          email: attempt.email
        });
      }
    }
    
    // Check for unusual time patterns
    const lastSuccessfulLogin = userAttempts
      .filter(a => a.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    if (lastSuccessfulLogin) {
      const hoursDiff = Math.abs(
        attempt.timestamp.getHours() - lastSuccessfulLogin.timestamp.getHours()
      );
      
      if (hoursDiff > 12) {
        alerts.push({
          type: 'TIME_ANOMALY',
          severity: 'LOW',
          description: 'Login at unusual time compared to normal pattern',
          evidence: { 
            currentHour: attempt.timestamp.getHours(), 
            normalHour: lastSuccessfulLogin.timestamp.getHours() 
          },
          timestamp: new Date(),
          email: attempt.email
        });
      }
    }
    
    // Check for rapid requests from same IP
    const sameIPAttempts = userAttempts
      .filter(a => a.ipAddress === attempt.ipAddress && Date.now() - a.timestamp.getTime() < 10000) // Last 10 seconds
      .length;
    
    if (sameIPAttempts > 5) {
      alerts.push({
        type: 'RAPID_REQUESTS',
        severity: 'HIGH',
        description: 'Too many rapid requests from same IP',
        evidence: { ipAddress: attempt.ipAddress, requestCount: sameIPAttempts },
        timestamp: new Date(),
        email: attempt.email
      });
    }
    
    // Log all alerts
    alerts.forEach(alert => {
      debug.warn(DebugCategory.SECURITY, `Suspicious activity detected: ${alert.type}`, alert);
    });
    
    return alerts;
  }
  
  /**
   * Handle failed login attempt and potential lockout
   */
  private handleFailedAttempt(email: string): AccountLockout | null {
    if (!this.config.enableAccountLockout) {
      return null;
    }
    
    const userAttempts = this.loginAttempts.get(email) || [];
    const failedAttempts = userAttempts.filter(a => !a.success).length;
    
    if (failedAttempts >= this.config.maxFailedAttempts) {
      const lockout: AccountLockout = {
        email,
        lockedAt: new Date(),
        unlockAt: new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000),
        reason: 'Too many failed login attempts',
        failedAttempts,
        lastAttemptAt: new Date()
      };
      
      this.accountLockouts.set(email, lockout);
      
      debug.warn(DebugCategory.SECURITY, 'Account locked due to failed attempts', {
        email,
        failedAttempts,
        unlockAt: lockout.unlockAt
      });
      
      return lockout;
    }
    
    return null;
  }
  
  /**
   * Check if account is currently locked
   */
  private isAccountLocked(email: string): boolean {
    const lockout = this.accountLockouts.get(email);
    if (!lockout) return false;
    
    if (lockout.unlockAt < new Date()) {
      // Lockout expired, remove it
      this.accountLockouts.delete(email);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear failed attempts on successful login
   */
  private clearFailedAttempts(email: string): void {
    const userAttempts = this.loginAttempts.get(email) || [];
    const successfulAttempts = userAttempts.filter(a => a.success);
    this.loginAttempts.set(email, successfulAttempts);
    
    // Remove any lockout
    this.accountLockouts.delete(email);
  }
  
  /**
   * Update device fingerprint for user
   */
  private updateDeviceFingerprint(email: string, fingerprint: string): void {
    const userDevices = this.deviceFingerprints.get(email) || new Set();
    userDevices.add(fingerprint);
    this.deviceFingerprints.set(email, userDevices);
  }
  
  /**
   * Generate secure token
   */
  private async generateSecureToken(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  /**
   * Generate TOTP secret
   */
  private generateTOTPSecret(): string {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(byte => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[byte % 32])
      .join('');
    return secret;
  }
  
  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }
  
  /**
   * Generate QR code URL for 2FA setup
   */
  private generateQRCodeUrl(userId: string, secret: string): string {
    const issuer = 'MultiTenant Platform';
    const label = `${issuer}:${userId}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  }
  
  /**
   * Verify TOTP token
   */
  private verifyTOTPToken(secret: string, token: string): boolean {
    // Simple TOTP verification (in production, use a proper TOTP library)
    const timeStep = Math.floor(Date.now() / 30000);
    
    // Check current time step and previous one for clock skew
    for (let i = -1; i <= 1; i++) {
      const expectedToken = this.generateTOTPToken(secret, timeStep + i);
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate TOTP token for given time step
   */
  private generateTOTPToken(secret: string, timeStep: number): string {
    // Simplified TOTP generation (use proper crypto library in production)
    const hash = timeStep.toString() + secret;
    let hashValue = 0;
    for (let i = 0; i < hash.length; i++) {
      hashValue = ((hashValue << 5) - hashValue + hash.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hashValue % 1000000).toString().padStart(6, '0');
  }
  
  /**
   * Check if token is a backup code
   */
  private isBackupCode(token: string): boolean {
    return /^[A-F0-9]{8}$/.test(token);
  }
  
  /**
   * Clean up expired refresh tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
      }
    }
  }
  
  /**
   * Get account lockout status
   */
  getAccountLockout(email: string): AccountLockout | null {
    return this.accountLockouts.get(email) || null;
  }
  
  /**
   * Get user's 2FA status
   */
  get2FAStatus(userId: string): { enabled: boolean; hasBackupCodes: boolean } {
    const twoFA = this.twoFactorAuth.get(userId);
    return {
      enabled: twoFA?.isEnabled || false,
      hasBackupCodes: (twoFA?.backupCodes.length || 0) > 0
    };
  }
  
  /**
   * Admin: unlock account
   */
  unlockAccount(email: string): boolean {
    const wasLocked = this.accountLockouts.has(email);
    this.accountLockouts.delete(email);
    this.clearFailedAttempts(email);
    
    if (wasLocked) {
      debug.log(DebugCategory.AUTH, 'Account unlocked by admin', { email });
    }
    
    return wasLocked;
  }
  
  /**
   * Admin: disable 2FA
   */
  disable2FA(userId: string): boolean {
    const twoFA = this.twoFactorAuth.get(userId);
    if (twoFA) {
      twoFA.isEnabled = false;
      debug.log(DebugCategory.AUTH, '2FA disabled by admin', { userId });
      return true;
    }
    return false;
  }
  
  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalLoginAttempts: number;
    failedAttempts: number;
    lockedAccounts: number;
    usersWithTwoFA: number;
    suspiciousActivityAlerts: number;
  } {
    let totalAttempts = 0;
    let failedAttempts = 0;
    
    for (const attempts of this.loginAttempts.values()) {
      totalAttempts += attempts.length;
      failedAttempts += attempts.filter(a => !a.success).length;
    }
    
    const usersWithTwoFA = Array.from(this.twoFactorAuth.values())
      .filter(tfa => tfa.isEnabled).length;
    
    return {
      totalLoginAttempts: totalAttempts,
      failedAttempts,
      lockedAccounts: this.accountLockouts.size,
      usersWithTwoFA,
      suspiciousActivityAlerts: 0 // Would be tracked separately in production
    };
  }
}

// Export singleton instance
export const authSecurityService = new AuthenticationSecurityService();

export { AuthenticationSecurityService }; 