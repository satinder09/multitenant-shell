/**
 * 🔐 TWO-FACTOR AUTHENTICATION SERVICE
 * 
 * Main service for managing 2FA across platform and tenant users
 * Supports multiple authentication methods through provider registry
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  TwoFactorContext,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerificationRequest,
  TwoFactorVerificationResponse,
  TwoFactorStatus,
  TwoFactorMethodSummary,
  TwoFactorConfig,
  TwoFactorError,
  TwoFactorErrorCode,
} from '../types/two-factor-auth.types';

import { TwoFactorMethodRegistryService } from './two-factor-method-registry.service';
import { AuthSecurityService } from './auth-security.service';

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly config: TwoFactorConfig;

  constructor(
    private methodRegistry: TwoFactorMethodRegistryService,
    private authSecurityService: AuthSecurityService,
    private configService: ConfigService,
  ) {
    this.config = this.loadConfig();
    this.logger.log('Two-Factor Authentication Service initialized');
  }

  // =============================================================================
  // MAIN 2FA OPERATIONS
  // =============================================================================

  /**
   * Setup a new 2FA method for user
   */
  async setupTwoFactorMethod(
    context: TwoFactorContext,
    request: TwoFactorSetupRequest,
  ): Promise<TwoFactorSetupResponse> {
    this.logger.log(`Setting up 2FA method ${request.methodType} for user ${context.userId}`);

    // Validate method is supported
    if (!this.methodRegistry.isMethodSupported(request.methodType)) {
      throw new TwoFactorError(
        `2FA method not supported: ${request.methodType}`,
        TwoFactorErrorCode.METHOD_NOT_SUPPORTED,
        request.methodType,
      );
    }

    // Get the appropriate provider
    const provider = this.methodRegistry.getProvider(request.methodType);

    // Setup the method using the provider
    const setupResponse = await provider.setup(context.userId, request);

    // TODO: Store method data in database
    // await this.storeMethodData(context, { ... });

    // TODO: Log audit trail
    // await this.logAuditEvent(context, setupResponse.methodId, 'SETUP', true);

    return setupResponse;
  }

  /**
   * Verify 2FA code and complete setup or login
   */
  async verifyTwoFactorCode(
    context: TwoFactorContext,
    request: TwoFactorVerificationRequest,
  ): Promise<TwoFactorVerificationResponse> {
    this.logger.log(`Verifying 2FA code for user ${context.userId}`);

    // TODO: Get user's 2FA methods from database
    const userMethods: any[] = []; // await this.getUserMethods(context);
    
    let targetMethod = userMethods.find(m => 
      request.methodId ? m.id === request.methodId : m.methodType === request.methodType
    );

    if (!targetMethod) {
      throw new TwoFactorError(
        'No 2FA method found for verification',
        TwoFactorErrorCode.METHOD_NOT_ENABLED,
      );
    }

    // Get the provider and verify
    const provider = this.methodRegistry.getProvider(targetMethod.methodType);
    const verificationResult = await provider.verify(
      context.userId,
      request.code,
      targetMethod.secretData,
    );

    // TODO: Log audit event and update last used time

    return verificationResult;
  }

  /**
   * Enable 2FA for user after successful setup verification
   */
  async enableTwoFactor(
    context: TwoFactorContext,
    methodId: string,
  ): Promise<void> {
    this.logger.log(`Enabling 2FA for user ${context.userId}`);

    // TODO: Update method as enabled
    // TODO: Update user's overall 2FA status
    // TODO: Set as primary if it's the first method
    // TODO: Log audit event
  }

  /**
   * Disable 2FA method
   */
  async disableTwoFactorMethod(
    context: TwoFactorContext,
    methodId: string,
  ): Promise<void> {
    this.logger.log(`Disabling 2FA method ${methodId} for user ${context.userId}`);

    // Check if user can disable 2FA
    if (!this.config.security.allowDisableByUser) {
      throw new TwoFactorError(
        'Disabling 2FA is not allowed by policy',
        TwoFactorErrorCode.METHOD_NOT_SUPPORTED,
      );
    }

    // TODO: Update method as disabled
    // TODO: Check if this was the last enabled method
    // TODO: Log audit event
  }

  /**
   * Get user's 2FA status
   */
  async getUserTwoFactorStatus(context: TwoFactorContext): Promise<TwoFactorStatus> {
    this.logger.log(`Getting 2FA status for user ${context.userId}`);

    // TODO: Get user and methods from database
    const user = { twoFactorEnabled: false };
    const userMethods: any[] = [];

    const enabledMethods = userMethods.filter(m => m.isEnabled);
    const primaryMethod = userMethods.find(m => m.isPrimary);

    return {
      isEnabled: user.twoFactorEnabled || false,
      hasEnabledMethods: enabledMethods.length > 0,
      availableMethods: this.config.methods.enabled,
      enabledMethods: enabledMethods.map(m => this.mapToMethodSummary(m)),
      primaryMethod: primaryMethod ? this.mapToMethodSummary(primaryMethod) : null,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private mapToMethodSummary(method: any): TwoFactorMethodSummary {
    return {
      id: method.id,
      methodType: method.methodType,
      name: method.name,
      isEnabled: method.isEnabled,
      isPrimary: method.isPrimary,
      createdAt: method.createdAt,
      lastUsedAt: method.lastUsedAt,
      maskedData: this.maskSensitiveData(method.methodType, method.secretData),
    };
  }

  private maskSensitiveData(methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN', secretData: string): string {
    switch (methodType) {
      case 'SMS':
        return secretData.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
      case 'EMAIL':
        return secretData.replace(/(.{2})[^@]*(@.*)/, '$1***$2');
      case 'TOTP':
        return '***SECRET***';
      default:
        return '***MASKED***';
    }
  }

  private loadConfig(): TwoFactorConfig {
    return {
      methods: {
        enabled: ['TOTP', 'SMS', 'EMAIL', 'WEBAUTHN'],
        default: 'TOTP',
      },
      security: {
        requireForPrivilegedOperations: true,
        allowDisableByUser: true,
        sessionTimeout: 30 * 60, // 30 minutes
      },
      totp: {
        issuer: this.configService.get<string>('APP_NAME', 'MultiTenant Shell'),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      },
      sms: {
        provider: 'twilio',
        rateLimit: {
          maxAttempts: 3,
          windowMs: 60 * 1000, // 1 minute
        },
      },
      email: {
        provider: 'sendgrid',
        rateLimit: {
          maxAttempts: 3,
          windowMs: 60 * 1000, // 1 minute
        },
      },
      backup: {
        codeLength: 8,
        codeCount: 10,
        algorithm: 'bcrypt',
      },
    };
  }
} 