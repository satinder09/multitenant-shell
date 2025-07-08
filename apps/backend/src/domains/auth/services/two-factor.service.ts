import { Injectable, Logger, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { TwoFactorDatabaseService, TwoFactorMethodWithAudit } from './two-factor-database.service';
import { TOTPProvider } from '../providers/totp.provider';
import { BackupCodesService } from './backup-codes.service';
import { SetupTwoFactorDto } from '../dto/setup-two-factor.dto';
import { VerifyTwoFactorDto } from '../dto/verify-two-factor.dto';
import { EnableTwoFactorDto } from '../dto/enable-two-factor.dto';
import { TwoFactorMethodType } from '../../../../generated/master-prisma';

export interface TwoFactorSetupResponse {
  methodId: string;
  methodType: string;
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
  instructions: string;
  nextStep: '2fa_verify_setup' | '2fa_complete';
}

export interface TwoFactorVerificationResponse {
  success: boolean;
  methodType: string;
  message: string;
  remainingAttempts?: number;
  lockoutUntil?: Date;
}

export interface TwoFactorStatusResponse {
  isEnabled: boolean;
  hasEnabledMethods: boolean;
  availableMethods: string[];
  enabledMethods: TwoFactorMethodSummary[];
  primaryMethod?: TwoFactorMethodSummary;
  canDisable: boolean;
  lastVerifiedAt?: string;
}

export interface TwoFactorMethodSummary {
  id: string;
  methodType: string;
  name?: string;
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  maskedData?: string;
}

export interface TwoFactorEnableResponse {
  message: string;
  backupCodes?: string[];
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: Date;
  lastAttempt: Date;
  lockoutUntil?: Date;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly failedAttempts = new Map<string, RateLimitEntry>();
  
  // Rate limiting configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly twoFactorDb: TwoFactorDatabaseService,
    private readonly totpProvider: TOTPProvider,
    private readonly backupCodesService: BackupCodesService
  ) {
    // Clean up expired rate limit entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Check rate limiting for a user
   */
  private checkRateLimit(userId: string): { allowed: boolean; remainingAttempts: number; lockoutUntil?: Date } {
    const now = new Date();
    const entry = this.failedAttempts.get(userId);

    if (!entry) {
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    // Check if still in lockout period
    if (entry.lockoutUntil && entry.lockoutUntil > now) {
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        lockoutUntil: entry.lockoutUntil 
      };
    }

    // Check if attempts are within the window
    const timeSinceFirst = now.getTime() - entry.firstAttempt.getTime();
    if (timeSinceFirst > this.ATTEMPT_WINDOW) {
      // Reset the window
      this.failedAttempts.delete(userId);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    // Check if max attempts reached
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      const lockoutUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);
      entry.lockoutUntil = lockoutUntil;
      this.failedAttempts.set(userId, entry);
      
      this.logger.warn(`User ${userId} locked out for 2FA attempts until ${lockoutUntil.toISOString()}`);
      
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        lockoutUntil 
      };
    }

    return { 
      allowed: true, 
      remainingAttempts: this.MAX_ATTEMPTS - entry.attempts 
    };
  }

  /**
   * Record a failed verification attempt
   */
  private recordFailedAttempt(userId: string): void {
    const now = new Date();
    const entry = this.failedAttempts.get(userId);

    if (!entry) {
      this.failedAttempts.set(userId, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      entry.attempts++;
      entry.lastAttempt = now;
      this.failedAttempts.set(userId, entry);
    }

    this.logger.warn(`Failed 2FA attempt for user ${userId}. Attempts: ${entry?.attempts || 1}`);
  }

  /**
   * Clear failed attempts for a user (on successful verification)
   */
  private clearFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    let cleaned = 0;
    
    this.failedAttempts.forEach((entry, userId) => {
      const timeSinceFirst = now.getTime() - entry.firstAttempt.getTime();
      const isExpired = timeSinceFirst > this.ATTEMPT_WINDOW && 
                       (!entry.lockoutUntil || entry.lockoutUntil <= now);
      
      if (isExpired) {
        this.failedAttempts.delete(userId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired 2FA rate limit entries`);
    }
  }

  /**
   * Setup a new 2FA method for a user
   */
  async setupMethod(userId: string, dto: SetupTwoFactorDto): Promise<TwoFactorSetupResponse> {
    this.logger.log(`Setting up ${dto.methodType} for user ${userId}`);

    try {
      let setupResponse: TwoFactorSetupResponse;

      switch (dto.methodType) {
        case 'TOTP':
          setupResponse = await this.setupTOTP(userId, dto);
          break;
        case 'SMS':
          throw new BadRequestException('SMS 2FA not yet implemented');
        case 'EMAIL':
          throw new BadRequestException('Email 2FA not yet implemented');
        case 'WEBAUTHN':
          throw new BadRequestException('WebAuthn 2FA not yet implemented');
        default:
          throw new BadRequestException(`Unsupported 2FA method: ${dto.methodType}`);
      }

      this.logger.log(`Successfully set up ${dto.methodType} for user ${userId}`, {
        methodId: setupResponse.methodId
      });

      return setupResponse;

    } catch (error) {
      this.logger.error(`Failed to setup ${dto.methodType} for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Verify a 2FA code during setup or login
   */
  async verifyCode(userId: string, dto: VerifyTwoFactorDto): Promise<TwoFactorVerificationResponse> {
    this.logger.log(`Verifying ${dto.methodType || 'unknown'} code for user ${userId}`);

    // Check rate limiting BEFORE any verification attempts
    const rateLimitCheck = this.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      const message = rateLimitCheck.lockoutUntil 
        ? `Too many failed attempts. Account locked until ${rateLimitCheck.lockoutUntil.toISOString()}`
        : 'Too many failed attempts. Please try again later.';
      
      throw new HttpException(
        {
          message,
          error: 'Too Many Requests',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          lockoutUntil: rateLimitCheck.lockoutUntil,
          remainingAttempts: rateLimitCheck.remainingAttempts
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    let method: TwoFactorMethodWithAudit | null = null;

    // Find the method to verify against
    if (dto.methodId) {
      method = await this.twoFactorDb.findMethodById(dto.methodId);
    } else if (dto.methodType) {
      const methodType = this.convertDTOToPrismaEnum(dto.methodType);
      method = await this.twoFactorDb.findMethodByUserAndType(userId, methodType);
    } else {
      // Default to TOTP if no method specified
      method = await this.twoFactorDb.findMethodByUserAndType(userId, TwoFactorMethodType.TOTP);
    }

    if (!method) {
      throw new NotFoundException('2FA method not found. Please set up 2FA first.');
    }

    if (method.userId !== userId) {
      throw new BadRequestException('Invalid method access');
    }

    try {
      let isValid = false;

      switch (method.methodType) {
        case TwoFactorMethodType.TOTP:
          const verificationResult = await this.totpProvider.verify(userId, dto.code, method.secretData);
          isValid = verificationResult.success;
          break;
        default:
          throw new BadRequestException(`Verification not implemented for ${method.methodType}`);
      }

      if (isValid) {
        // Clear failed attempts on successful verification
        this.clearFailedAttempts(userId);
        
        // Update last used timestamp
        await this.twoFactorDb.updateLastUsed(method.id);
        
        this.logger.log(`Successfully verified ${method.methodType} for user ${userId}`);
        
        return {
          success: true,
          methodType: method.methodType,
          message: 'Code verified successfully'
        };
      } else {
        // Record failed attempt for rate limiting
        this.recordFailedAttempt(userId);
        
        // Get updated rate limit status
        const updatedRateLimit = this.checkRateLimit(userId);
        
        this.logger.warn(`Failed verification attempt for user ${userId}`, {
          methodType: method.methodType,
          methodId: method.id,
          remainingAttempts: updatedRateLimit.remainingAttempts
        });
        
        return {
          success: false,
          methodType: method.methodType,
          message: 'Invalid verification code',
          remainingAttempts: updatedRateLimit.remainingAttempts,
          lockoutUntil: updatedRateLimit.lockoutUntil
        };
      }

    } catch (error) {
      this.logger.error(`Verification error for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Enable 2FA method for user
   */
  async enable(userId: string, enableDto: EnableTwoFactorDto): Promise<TwoFactorEnableResponse> {
    this.logger.log(`Enabling 2FA method ${enableDto.methodId} for user ${userId}`);

    try {
      // Get the method
      const method = await this.twoFactorDb.findMethodById(enableDto.methodId);
      if (!method) {
        throw new NotFoundException('2FA method not found');
      }

      if (method.userId !== userId) {
        throw new BadRequestException('Method does not belong to user');
      }

      if (method.isEnabled) {
        throw new BadRequestException('Method is already enabled');
      }

      // Enable the method
      await this.twoFactorDb.enableMethod(enableDto.methodId, enableDto.isPrimary);

      // Generate backup codes when first enabling 2FA
      let backupCodes: string[] | undefined;
      const hasOtherEnabledMethods = await this.twoFactorDb.hasEnabledMethods(userId);
      
      if (!hasOtherEnabledMethods) {
        // This is the first 2FA method being enabled, generate backup codes
        this.logger.log(`Generating backup codes for user ${userId} - first 2FA method enabled`);
        const backupCodesResponse = await this.backupCodesService.generateBackupCodes(userId);
        backupCodes = backupCodesResponse.codes;
      }

      this.logger.log(`Successfully enabled 2FA method ${enableDto.methodId} for user ${userId}`);

      return {
        message: 'Two-factor authentication enabled successfully',
        backupCodes
      };

    } catch (error) {
      this.logger.error(`Failed to enable 2FA method for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get user's 2FA status and methods
   */
  async getUserStatus(userId: string): Promise<TwoFactorStatusResponse> {
    this.logger.log(`Getting 2FA status for user ${userId}`);

    const methods = await this.twoFactorDb.findUserMethods(userId);
    const enabledMethods = methods.filter(m => m.isEnabled);
    const primaryMethod = enabledMethods.find(m => m.isPrimary);

    const methodSummaries: TwoFactorMethodSummary[] = enabledMethods.map(method => ({
      id: method.id,
      methodType: method.methodType,
      name: method.name || this.getDefaultMethodName(method.methodType),
      isEnabled: method.isEnabled,
      isPrimary: method.isPrimary,
      createdAt: method.createdAt,
      lastUsedAt: method.lastUsedAt,
      maskedData: this.maskSecretData(method.methodType, method.secretData)
    }));

    return {
      isEnabled: enabledMethods.length > 0,
      hasEnabledMethods: enabledMethods.length > 0,
      availableMethods: ['TOTP'], // TODO: Add other methods when implemented
      enabledMethods: methodSummaries,
      primaryMethod: primaryMethod ? methodSummaries.find(m => m.id === primaryMethod.id) : undefined,
      canDisable: enabledMethods.length > 0,
      lastVerifiedAt: primaryMethod?.lastUsedAt?.toISOString()
    };
  }

  /**
   * Disable a 2FA method
   */
  async disableMethod(userId: string, methodId: string): Promise<void> {
    this.logger.log(`Disabling 2FA method ${methodId} for user ${userId}`);

    const method = await this.twoFactorDb.findMethodById(methodId);
    if (!method) {
      throw new NotFoundException('2FA method not found');
    }

    if (method.userId !== userId) {
      throw new BadRequestException('Invalid method access');
    }

    await this.twoFactorDb.disableMethod(methodId);
    
    this.logger.log(`Successfully disabled 2FA method ${methodId} for user ${userId}`);
  }

  /**
   * Setup TOTP method
   */
  private async setupTOTP(userId: string, dto: SetupTwoFactorDto): Promise<TwoFactorSetupResponse> {
    // Check if TOTP method already exists for this user
    let existingMethod = await this.twoFactorDb.findMethodByUserAndType(userId, TwoFactorMethodType.TOTP);
    
    if (existingMethod) {
      if (existingMethod.isEnabled) {
        throw new BadRequestException('TOTP is already enabled for this user. Please disable the existing method first.');
      }
      
      // If method exists but not enabled, generate a new secret for fresh setup
      this.logger.log(`Updating existing TOTP method ${existingMethod.id} with new secret for user ${userId}`);
      
      // Generate new TOTP setup
      const setupData = {
        email: dto.email
      };
      const totpSetup = await this.totpProvider.setup(userId, setupData);
      
      // Update the existing method with new secret
      await this.twoFactorDb.updateMethodSecret(existingMethod.id, totpSetup.secret);
      
      return {
        methodId: existingMethod.id,
        methodType: 'TOTP',
        qrCode: totpSetup.qrCode,
        secret: totpSetup.secret,
        instructions: totpSetup.instructions,
        nextStep: '2fa_verify_setup'
      };
    }
    
    // Generate TOTP setup using provider
    const setupData = {
      email: dto.email // Use email if provided for account name in QR code
    };
    
    const totpSetup = await this.totpProvider.setup(userId, setupData);
    
    // Save to database
    const method = await this.twoFactorDb.createMethod({
      userId,
      methodType: TwoFactorMethodType.TOTP,
      secretData: totpSetup.secret,
      name: dto.name || 'Authenticator App'
    });

    return {
      methodId: method.id,
      methodType: 'TOTP',
      qrCode: totpSetup.qrCode,
      secret: totpSetup.secret,
      instructions: totpSetup.instructions,
      nextStep: '2fa_verify_setup'
    };
  }

  /**
   * Convert DTO enum to Prisma enum
   */
  private convertDTOToPrismaEnum(dtoType: string): TwoFactorMethodType {
    switch (dtoType) {
      case 'TOTP':
        return TwoFactorMethodType.TOTP;
      case 'SMS':
        return TwoFactorMethodType.SMS;
      case 'EMAIL':
        return TwoFactorMethodType.EMAIL;
      case 'WEBAUTHN':
        return TwoFactorMethodType.WEBAUTHN;
      default:
        throw new BadRequestException(`Unsupported 2FA method: ${dtoType}`);
    }
  }

  /**
   * Get default method name based on type
   */
  private getDefaultMethodName(methodType: TwoFactorMethodType): string {
    switch (methodType) {
      case TwoFactorMethodType.TOTP:
        return 'Authenticator App';
      case TwoFactorMethodType.SMS:
        return 'SMS';
      case TwoFactorMethodType.EMAIL:
        return 'Email';
      case TwoFactorMethodType.WEBAUTHN:
        return 'Security Key';
      default:
        return 'Unknown Method';
    }
  }

  /**
   * Mask sensitive data for display
   */
  private maskSecretData(methodType: TwoFactorMethodType, secretData: string): string {
    switch (methodType) {
      case TwoFactorMethodType.TOTP:
        return '***SECRET***';
      case TwoFactorMethodType.SMS:
        return secretData.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
      case TwoFactorMethodType.EMAIL:
        return secretData.replace(/(.{2})[^@]*(@.*)/, '$1***$2');
      default:
        return '***MASKED***';
    }
  }
} 