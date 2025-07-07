/**
 * 🔐 TWO-FACTOR AUTHENTICATION TYPES
 * 
 * Extensible type definitions for multi-method 2FA system
 * Supports: TOTP, SMS, Email, WebAuthn, Backup Codes
 */

// =============================================================================
// CORE 2FA INTERFACES
// =============================================================================

/**
 * Base interface for all 2FA methods
 */
export interface TwoFactorMethod {
  id: string;
  userId: string;
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
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
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  name?: string;
  phoneNumber?: string; // For SMS
  email?: string; // For email OTP
}

/**
 * 2FA setup response data
 */
export interface TwoFactorSetupResponse {
  methodId: string;
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
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
  methodType?: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  code: string;
  trustDevice?: boolean;
}

/**
 * 2FA verification response
 */
export interface TwoFactorVerificationResponse {
  success: boolean;
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
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
  hasEnabledMethods: boolean;
  availableMethods: ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[];
  enabledMethods: TwoFactorMethodSummary[];
  primaryMethod?: TwoFactorMethodSummary;
  canDisable?: boolean; // False if required by policy
  lastVerifiedAt?: Date;
}

/**
 * Summary of a 2FA method (without sensitive data)
 */
export interface TwoFactorMethodSummary {
  id: string;
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  name?: string;
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: Date;
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
  abstract readonly methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
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
 * Context for 2FA operations
 */
export interface TwoFactorContext {
  userType: 'platform' | 'tenant';
  tenantId?: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registry for 2FA method providers
 */
export interface TwoFactorMethodRegistry {
  registerProvider(provider: TwoFactorMethodProvider): void;
  getProvider(methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN'): TwoFactorMethodProvider;
  getAvailableMethods(): ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[];
  isMethodSupported(methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN'): boolean;
}

/**
 * Configuration for 2FA system
 */
export interface TwoFactorConfig {
  methods: {
    enabled: ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[];
    default: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  };
  
  security: {
    requireForPrivilegedOperations: boolean;
    allowDisableByUser: boolean;
    sessionTimeout: number; // seconds
  };
  
  totp: {
    issuer: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: 6 | 8;
    period: 30 | 60;
  };
  
  sms: {
    provider: 'twilio' | 'aws_sns' | 'vonage';
    rateLimit: {
      maxAttempts: number;
      windowMs: number;
    };
  };
  
  email: {
    provider: 'sendgrid' | 'aws_ses';
    rateLimit: {
      maxAttempts: number;
      windowMs: number;
    };
  };
  
  backup: {
    codeLength: number;
    codeCount: number;
    algorithm: 'bcrypt' | 'argon2';
  };
}

/**
 * 2FA policy configuration
 */
export interface TwoFactorPolicy {
  isRequired: boolean;
  requiredForRoles: string[];
  gracePeriodDays: number;
  allowedMethods: ('TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN')[];
  minimumMethods: number;
  requireBackupCodes: boolean;
}

/**
 * 2FA audit log entry
 */
export interface TwoFactorAuditLog {
  id: string;
  methodId: string;
  action: 'SETUP' | 'VERIFY_SUCCESS' | 'VERIFY_FAILURE' | 'ENABLE' | 'DISABLE';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Security analysis result
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
// ENUMS
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

/**
 * Custom error class for 2FA operations
 */
export class TwoFactorError extends Error {
  constructor(
    message: string,
    public readonly code: TwoFactorErrorCode,
    public readonly methodType?: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN',
    public readonly retryAfter?: Date
  ) {
    super(message);
    this.name = 'TwoFactorError';
  }
} 