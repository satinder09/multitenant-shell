/**
 * 🔐 TOTP (Time-based One-Time Password) PROVIDER
 * 
 * Implements TOTP authentication using authenticator apps
 * Supports Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import { Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

// Define the enum locally since we're building extensible architecture
enum TwoFactorMethodType {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WEBAUTHN = 'WEBAUTHN',
  BACKUP_CODES = 'BACKUP_CODES',
}

import {
  TwoFactorMethodProvider,
  TwoFactorSetupResponse,
  TwoFactorVerificationResponse,
  TwoFactorFeature,
  TOTPMethodData,
  TwoFactorError,
  TwoFactorErrorCode,
} from '../types/two-factor-auth.types';

@Injectable()
export class TOTPProvider extends TwoFactorMethodProvider {
  readonly methodType = TwoFactorMethodType.TOTP;
  readonly supportedFeatures = [
    TwoFactorFeature.QR_CODE,
    TwoFactorFeature.MANUAL_ENTRY,
    TwoFactorFeature.OFFLINE_CAPABLE,
    TwoFactorFeature.BACKUP_CODES,
  ];

  private readonly logger = new Logger(TOTPProvider.name);
  private readonly issuer: string;
  private readonly algorithm: string;
  private readonly digits: number;
  private readonly period: number;
  private readonly window: number;

  constructor() {
    super();
    
    // Configure TOTP settings
    this.issuer = process.env.TOTP_ISSUER || 'MultiTenant Platform';
    this.algorithm = process.env.TOTP_ALGORITHM || 'SHA1';
    this.digits = (parseInt(process.env.TOTP_DIGITS || '6') === 8 ? 8 : 6) as 6 | 8;
    this.period = (parseInt(process.env.TOTP_PERIOD || '30') === 60 ? 60 : 30) as 30 | 60;
    this.window = parseInt(process.env.TOTP_WINDOW || '1');

    // Configure otplib
    authenticator.options = {
      algorithm: this.algorithm as any,
      digits: this.digits,
      period: this.period,
      window: this.window,
    };

    this.logger.log('TOTP Provider initialized', {
      issuer: this.issuer,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
    });
  }

  /**
   * Setup TOTP for a user
   */
  async setup(userId: string, setupData?: { email?: string }): Promise<TwoFactorSetupResponse> {
    this.logger.log(`Setting up TOTP for user ${userId}`);

    try {
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Create service name for the authenticator app
      const serviceName = this.issuer;
      const accountName = setupData?.email || userId;
      
      // Generate key URI for QR code
      const keyUri = authenticator.keyuri(accountName, serviceName, secret);
      
      // Generate QR code
      const qrCode = await QRCode.toDataURL(keyUri);

      // Create method data
      const methodData: TOTPMethodData = {
        secret,
        qrCodeUrl: qrCode,
        backupCodes: [], // Will be generated separately
        issuer: this.issuer,
        algorithm: this.algorithm as any,
        digits: this.digits,
        period: this.period,
      };

      const response: TwoFactorSetupResponse = {
        methodId: `totp-${userId}-${Date.now()}`, // Temporary ID
        methodType: TwoFactorMethodType.TOTP,
        qrCode,
        secret, // For manual entry
        instructions: this.getInstructions(),
        nextStep: '2fa_verify_setup',
      };

      this.logger.log(`TOTP setup completed for user ${userId}`);
      return response;

    } catch (error) {
      this.logger.error(`TOTP setup failed for user ${userId}`, error);
      throw new TwoFactorError(
        'Failed to setup TOTP authentication',
        TwoFactorErrorCode.SETUP_REQUIRED,
        TwoFactorMethodType.TOTP,
      );
    }
  }

  /**
   * Verify TOTP code
   */
  async verify(
    userId: string,
    code: string,
    methodData: string, // Encrypted secret
  ): Promise<TwoFactorVerificationResponse> {
    this.logger.log(`Verifying TOTP code for user ${userId}`);

    try {
      // Note: In practice, methodData would be decrypted here
      const secret = methodData; // Simplified for now

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        return {
          success: false,
          methodType: TwoFactorMethodType.TOTP,
          message: 'Invalid code format. Please enter a 6-digit code.',
        };
      }

      // Verify TOTP code
      const isValid = authenticator.verify({
        token: code,
        secret: secret,
      });

      if (isValid) {
        this.logger.log(`TOTP verification successful for user ${userId}`);
        return {
          success: true,
          methodType: TwoFactorMethodType.TOTP,
          message: 'Authentication successful',
        };
      } else {
        this.logger.warn(`TOTP verification failed for user ${userId}`);
        return {
          success: false,
          methodType: TwoFactorMethodType.TOTP,
          message: 'Invalid verification code. Please try again.',
          remainingAttempts: 2, // Would be calculated based on rate limiting
        };
      }

    } catch (error) {
      this.logger.error(`TOTP verification error for user ${userId}`, error);
      throw new TwoFactorError(
        'Failed to verify TOTP code',
        TwoFactorErrorCode.VERIFICATION_FAILED,
        TwoFactorMethodType.TOTP,
      );
    }
  }

  /**
   * Generate TOTP method data
   */
  async generateMethodData(setupData?: { email?: string }): Promise<TOTPMethodData> {
    const secret = authenticator.generateSecret();
    const accountName = setupData?.email || 'user';
    const keyUri = authenticator.keyuri(accountName, this.issuer, secret);
    const qrCodeUrl = await QRCode.toDataURL(keyUri);

    return {
      secret,
      qrCodeUrl,
      backupCodes: [],
      issuer: this.issuer,
      algorithm: this.algorithm as any,
      digits: this.digits,
      period: this.period,
    };
  }

  /**
   * Validate TOTP setup data
   */
  validateSetupData(setupData: any): boolean {
    // TOTP doesn't require specific setup data
    return true;
  }

  /**
   * Get user-friendly instructions
   */
  getInstructions(): string {
    return `
1. Install an authenticator app on your phone:
   • Google Authenticator (recommended)
   • Microsoft Authenticator
   • Authy
   • 1Password

2. Scan the QR code with your authenticator app, or manually enter the secret key.

3. Enter the 6-digit code from your authenticator app to complete setup.

4. Save your backup codes in a secure location.

Note: The code changes every 30 seconds, so make sure to enter it quickly.
    `.trim();
  }

  /**
   * Disable TOTP method
   */
  async disable(userId: string, methodId: string): Promise<void> {
    this.logger.log(`Disabling TOTP for user ${userId}, method ${methodId}`);
    
    // TOTP doesn't require special cleanup
    // The secret will be removed from the database
    
    this.logger.log(`TOTP disabled for user ${userId}`);
  }

  /**
   * Generate current TOTP code (for testing)
   */
  generateCurrentCode(secret: string): string {
    return authenticator.generate(secret);
  }

  /**
   * Validate TOTP secret format
   */
  isValidSecret(secret: string): boolean {
    try {
      authenticator.generate(secret);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get remaining time until next code
   */
  getRemainingTime(): number {
    const now = Math.floor(Date.now() / 1000);
    const timeStep = this.period;
    const timeRemaining = timeStep - (now % timeStep);
    return timeRemaining;
  }

  /**
   * Generate backup-compatible URI
   */
  generateBackupUri(accountName: string, secret: string): string {
    return authenticator.keyuri(accountName, this.issuer, secret);
  }
} 