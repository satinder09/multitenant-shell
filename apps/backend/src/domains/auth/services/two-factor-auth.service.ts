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
import { TwoFactorDatabaseService } from './two-factor-database.service';
import { TwoFactorMethodType } from '../../../../generated/master-prisma';

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly config: TwoFactorConfig;

  constructor(
    private methodRegistry: TwoFactorMethodRegistryService,
    private authSecurityService: AuthSecurityService,
    private configService: ConfigService,
    private twoFactorDb: TwoFactorDatabaseService,
  ) {
    this.config = this.loadConfig();
    this.logger.log('Two-Factor Authentication Service initialized', {
      serviceInstanceId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      databaseIntegration: 'enabled'
    });
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

    // Check if there's already a disabled method in the database for this user and method type
    const methodType = request.methodType === 'TOTP' ? TwoFactorMethodType.TOTP : 
                      request.methodType === 'SMS' ? TwoFactorMethodType.SMS :
                      request.methodType === 'EMAIL' ? TwoFactorMethodType.EMAIL :
                      TwoFactorMethodType.TOTP; // Default to TOTP

    const existingMethod = await this.twoFactorDb.findMethodByUserAndType(context.userId, methodType);
    
    if (existingMethod && !existingMethod.isEnabled) {
      this.logger.log(`Reusing existing disabled 2FA method for user ${context.userId}`, {
        methodId: existingMethod.id,
        methodType: existingMethod.methodType
      });
      
      // Get the provider and regenerate QR code with existing secret
      const provider = this.methodRegistry.getProvider(request.methodType);
      const setupResponse = await provider.setup(context.userId, request, existingMethod.secretData);
      
      // Return the existing method data
      return {
        ...setupResponse,
        methodId: existingMethod.id,
        secret: existingMethod.secretData,
      };
    }

    // Get the appropriate provider
    const provider = this.methodRegistry.getProvider(request.methodType);

    // Setup the method using the provider (new setup)
    const setupResponse = await provider.setup(context.userId, request);

    // Store method data in database
    const storedMethod = await this.twoFactorDb.createMethod({
      userId: context.userId,
      methodType: methodType,
      secretData: setupResponse.secret,
      name: request.name,
      isPrimary: false, // Will be set to true when enabled
    });

    this.logger.log(`Stored new 2FA method in database for user ${context.userId}`, {
      methodId: storedMethod.id,
      methodType: storedMethod.methodType,
      isEnabled: storedMethod.isEnabled,
      isPrimary: storedMethod.isPrimary
    });

    // Return the setup response with the database method ID
    return {
      ...setupResponse,
      methodId: storedMethod.id,
    };
  }

  /**
   * Verify 2FA code and complete setup or login
   */
  async verifyTwoFactorCode(
    context: TwoFactorContext,
    request: TwoFactorVerificationRequest,
  ): Promise<TwoFactorVerificationResponse> {
    this.logger.log(`Verifying 2FA code for user ${context.userId}`, {
      methodId: request.methodId,
      methodType: request.methodType,
      hasCode: !!request.code
    });

    // Look for method data in database
    let targetMethod = null;
    
    if (request.methodId) {
      // Find by specific method ID
      targetMethod = await this.twoFactorDb.findMethodById(request.methodId);
      
      if (targetMethod && targetMethod.userId !== context.userId) {
        throw new TwoFactorError(
          'Invalid method access',
          TwoFactorErrorCode.INVALID_SETUP_DATA,
        );
      }
    } else {
      // Find by user and method type
      const methodType = request.methodType === 'TOTP' ? TwoFactorMethodType.TOTP : 
                        request.methodType === 'SMS' ? TwoFactorMethodType.SMS :
                        request.methodType === 'EMAIL' ? TwoFactorMethodType.EMAIL :
                        TwoFactorMethodType.TOTP; // Default to TOTP
      
      targetMethod = await this.twoFactorDb.findMethodByUserAndType(context.userId, methodType);
    }
    
    if (!targetMethod) {
      this.logger.warn(`No stored 2FA method found for user ${context.userId}. Please set up 2FA first.`);
      throw new TwoFactorError(
        'No 2FA method found for verification. Please set up 2FA first.',
        TwoFactorErrorCode.SETUP_REQUIRED,
      );
    }

    this.logger.log(`Found 2FA method for user ${context.userId}`, {
      methodId: targetMethod.id,
      methodType: targetMethod.methodType,
      isEnabled: targetMethod.isEnabled,
      isPrimary: targetMethod.isPrimary
    });

    // Get the provider and verify
    const provider = this.methodRegistry.getProvider(targetMethod.methodType);
    const verificationResult = await provider.verify(
      context.userId,
      request.code,
      targetMethod.secretData, // Use the stored secret data
    );

    // If verification was successful, update the last used time
    if (verificationResult.success) {
      await this.twoFactorDb.updateLastUsed(targetMethod.id);
      this.logger.log(`Updated last used time for method ${targetMethod.id}`);
    }

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

    // Check if the method exists and belongs to the user
    const method = await this.twoFactorDb.findMethodById(methodId);
    if (!method || method.userId !== context.userId) {
      throw new TwoFactorError(
        'Method not found or access denied',
        TwoFactorErrorCode.INVALID_SETUP_DATA,
      );
    }

    // Enable the method in the database (set as primary if it's the first enabled method)
    const userMethods = await this.twoFactorDb.findUserMethods(context.userId, true);
    const isPrimary = userMethods.length === 0; // First enabled method becomes primary

    await this.twoFactorDb.enableMethod(methodId, isPrimary);
    
    this.logger.log(`Successfully enabled 2FA method ${methodId} for user ${context.userId}`, {
      methodId,
      methodType: method.methodType,
      isPrimary,
      enabledAt: new Date().toISOString()
    });
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

    // Check if the method exists and belongs to the user
    const method = await this.twoFactorDb.findMethodById(methodId);
    if (!method || method.userId !== context.userId) {
      throw new TwoFactorError(
        'Method not found or access denied',
        TwoFactorErrorCode.INVALID_SETUP_DATA,
      );
    }

    // Disable the method in the database
    await this.twoFactorDb.disableMethod(methodId);
    
    this.logger.log(`Successfully disabled 2FA method ${methodId} for user ${context.userId}`, {
      methodId,
      methodType: method.methodType,
      disabledAt: new Date().toISOString()
    });
  }

  /**
   * Get user's 2FA status
   */
  async getUserTwoFactorStatus(context: TwoFactorContext): Promise<TwoFactorStatus> {
    this.logger.log(`Getting 2FA status for user ${context.userId}`);

    // Get all enabled methods for the user from database
    const userMethods = await this.twoFactorDb.findUserMethods(context.userId, true);
    
    this.logger.log(`Found ${userMethods.length} enabled 2FA methods for user ${context.userId}`, {
      methodCount: userMethods.length,
      methodTypes: userMethods.map(m => m.methodType)
    });

    // Convert to method summaries
    const enabledMethods = userMethods.map(method => this.mapToMethodSummary(method));
    const primaryMethod = enabledMethods.find(method => method.isPrimary);

    const isEnabled = enabledMethods.length > 0;

    return {
      isEnabled,
      hasEnabledMethods: enabledMethods.length > 0,
      availableMethods: this.config.methods.enabled,
      enabledMethods: enabledMethods,
      primaryMethod,
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