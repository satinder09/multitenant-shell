/**
 * 🔐 TWO-FACTOR AUTHENTICATION TYPES
 * 
 * Extensible type definitions for multi-method 2FA system
 * Supports: TOTP, SMS, Email, WebAuthn, Backup Codes
 */

import { TwoFactorMethodType, TwoFactorAction } from '@prisma/client';

// =============================================================================
// CORE 2FA INTERFACES
// =============================================================================

/**
 * Base interface for all 2FA methods
 */
export interface TwoFactorMethod {
  id: string;
  userId: string;
  methodType: TwoFactorMethodType;
  isEnabled: boolean;
  isPrimary: boolean;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

/**
 * 2FA setup request data
 */
export interface TwoFactorSetupRequest {
  methodType: TwoFactorMethodType;
  name?: string;
  phoneNumber?: string; // For SMS
  email?: string; // For email OTP
}

/**
 * 2FA setup response data
 */
export interface TwoFactorSetupResponse {
  methodId: string;
  methodType: TwoFactorMethodType;
  qrCode?: string; // For TOTP
  secret?: string; // For manual entry (TOTP)
  backupCodes?: string[]; // Generated backup codes
  instructions: string;
  nextStep: '2fa_verify_setup' | '2fa_complete';
}

/**
 * 2FA verification request
 */
export interface TwoFactorVerificationRequest {
  methodId?: string;
  methodType?: TwoFactorMethodType;
  code: string;
  trustDevice?: boolean;
}

/**
 * 2FA verification response
 */
export interface TwoFactorVerificationResponse {
  success: boolean;
  methodType: TwoFactorMethodType;
  message: string;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  trustedDevice?: boolean;
}

/**
 * User's 2FA status
 */
export interface TwoFactorStatus {
  isEnabled: boolean;
  hasBackupCodes: boolean;
  enabledMethods: TwoFactorMethodSummary[];
  primaryMethod?: TwoFactorMethodSummary;
  canDisable: boolean; // False if required by policy
  lastVerifiedAt?: Date;
}

/**
 * Summary of a 2FA method (without sensitive data)
 */
export interface TwoFactorMethodSummary {
  id: string;
  methodType: TwoFactorMethodType;
  name?: string;
  isEnabled: boolean;
  isPrimary: boolean;
  lastUsedAt?: Date;
  maskedData?: string; // e.g., "***-***-1234" for phone
}

// =============================================================================
// METHOD-SPECIFIC INTERFACES
// =============================================================================

/**
 * TOTP-specific data
 */
export interface TOTPMethodData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: 30 | 60;
}

/**
 * SMS-specific data
 */
export interface SMSMethodData {
  phoneNumber: string;
  countryCode: string;
  isVerified: boolean;
  lastSentAt?: Date;
  provider: 'twilio' | 'aws_sns' | 'vonage';
}

/**
 * Email-specific data
 */
export interface EmailMethodData {
  email: string;
  isVerified: boolean;
  lastSentAt?: Date;
  template: string;
}

/**
 * WebAuthn-specific data
 */
export interface WebAuthnMethodData {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  deviceType: 'security_key' | 'platform' | 'cross_platform';
}

/**
 * Backup codes data
 */
export interface BackupCodesData {
  codes: string[]; // Hashed codes
  usedCodes: string[]; // Used code hashes
  generatedAt: Date;
  lastUsedAt?: Date;
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

/**
 * Base interface for 2FA method providers
 */
export abstract class TwoFactorMethodProvider {
  abstract readonly methodType: TwoFactorMethodType;
  abstract readonly supportedFeatures: TwoFactorFeature[];

  /**
   * Setup a new 2FA method for user
   */
  abstract setup(userId: string, setupData?: any): Promise<TwoFactorSetupResponse>;

  /**
   * Verify a 2FA code
   */
  abstract verify(userId: string, code: string, methodData: any): Promise<TwoFactorVerificationResponse>;

  /**
   * Generate method-specific data
   */
  abstract generateMethodData(setupData?: any): Promise<any>;

  /**
   * Validate method-specific setup data
   */
  abstract validateSetupData(setupData: any): boolean;

  /**
   * Get user-friendly instructions
   */
  abstract getInstructions(): string;

  /**
   * Disable/cleanup method
   */
  abstract disable(userId: string, methodId: string): Promise<void>;
}

/**
 * 2FA service context (platform vs tenant)
 */
export interface TwoFactorContext {
  userType: 'platform' | 'tenant';
  tenantId?: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 2FA method registry interface
 */
export interface TwoFactorMethodRegistry {
  registerProvider(provider: TwoFactorMethodProvider): void;
  getProvider(methodType: TwoFactorMethodType): TwoFactorMethodProvider;
  getAvailableMethods(): TwoFactorMethodType[];
  isMethodSupported(methodType: TwoFactorMethodType): boolean;
}

// =============================================================================
// CONFIGURATION & POLICY
// =============================================================================

/**
 * 2FA configuration options
 */
export interface TwoFactorConfig {
  // Available methods
  enabledMethods: TwoFactorMethodType[];
  
  // TOTP settings
  totp: {
    issuer: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: 6 | 8;
    period: 30 | 60;
    window: number; // Clock skew tolerance
  };

  // SMS settings
  sms: {
    provider: 'twilio' | 'aws_sns' | 'vonage';
    from: string;
    template: string;
    rateLimit: {
      maxAttempts: number;
      windowMinutes: number;
    };
  };

  // Email settings
  email: {
    from: string;
    template: string;
    subject: string;
    rateLimit: {
      maxAttempts: number;
      windowMinutes: number;
    };
  };

  // Backup codes
  backupCodes: {
    count: number;
    length: number;
    algorithm: 'bcrypt' | 'argon2';
  };

  // Security policies
  security: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    requireForRoles: string[];
    allowDisableByUser: boolean;
    trustDeviceDays: number;
  };
}

/**
 * 2FA enforcement policy
 */
export interface TwoFactorPolicy {
  isRequired: boolean;
  requiredForRoles: string[];
  gracePeriodDays: number;
  allowedMethods: TwoFactorMethodType[];
  minimumMethods: number;
  requireBackupCodes: boolean;
}

// =============================================================================
// AUDIT & SECURITY
// =============================================================================

/**
 * 2FA audit log entry
 */
export interface TwoFactorAuditLog {
  id: string;
  methodId: string;
  action: TwoFactorAction;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Security analysis data
 */
export interface TwoFactorSecurityAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: SecurityFactor[];
  recommendations: string[];
  score: number; // 0-100
}

export interface SecurityFactor {
  type: 'method_strength' | 'usage_pattern' | 'device_trust' | 'location' | 'timing';
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number;
}

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export enum TwoFactorFeature {
  QR_CODE = 'qr_code',
  MANUAL_ENTRY = 'manual_entry',
  RATE_LIMITING = 'rate_limiting',
  BACKUP_CODES = 'backup_codes',
  DEVICE_TRUST = 'device_trust',
  BIOMETRIC = 'biometric',
  OFFLINE_CAPABLE = 'offline_capable',
}

export const TWO_FACTOR_METHOD_LABELS: Record<TwoFactorMethodType, string> = {
  TOTP: 'Authenticator App',
  SMS: 'SMS Messages',
  EMAIL: 'Email',
  WEBAUTHN: 'Security Key',
  BACKUP_CODES: 'Backup Codes',
};

export const TWO_FACTOR_METHOD_DESCRIPTIONS: Record<TwoFactorMethodType, string> = {
  TOTP: 'Use an authenticator app like Google Authenticator or Authy',
  SMS: 'Receive codes via text message',
  EMAIL: 'Receive codes via email',
  WEBAUTHN: 'Use a hardware security key or built-in biometric authentication',
  BACKUP_CODES: 'Single-use recovery codes for when other methods are unavailable',
};

// =============================================================================
// ERROR TYPES
// =============================================================================

export class TwoFactorError extends Error {
  constructor(
    message: string,
    public readonly code: TwoFactorErrorCode,
    public readonly methodType?: TwoFactorMethodType,
    public readonly retryAfter?: Date
  ) {
    super(message);
    this.name = 'TwoFactorError';
  }
}

export enum TwoFactorErrorCode {
  METHOD_NOT_ENABLED = 'METHOD_NOT_ENABLED',
  INVALID_CODE = 'INVALID_CODE',
  EXPIRED_CODE = 'EXPIRED_CODE',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  SETUP_REQUIRED = 'SETUP_REQUIRED',
  INVALID_SETUP_DATA = 'INVALID_SETUP_DATA',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  BACKUP_CODE_USED = 'BACKUP_CODE_USED',
  BACKUP_CODE_INVALID = 'BACKUP_CODE_INVALID',
} 