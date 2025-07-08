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
  
  // Static storage shared across all instances to handle DI scope issues
  private static readonly sessionStorage = new Map<string, { secret: string; methodId: string; timestamp: number; userId: string }>();
  
  // Static storage for enabled 2FA methods
  private static readonly enabledMethods = new Map<string, { methodId: string; methodType: string; enabledAt: Date; userId: string }>();

  constructor(
    private methodRegistry: TwoFactorMethodRegistryService,
    private authSecurityService: AuthSecurityService,
    private configService: ConfigService,
  ) {
    this.config = this.loadConfig();
    this.logger.log('Two-Factor Authentication Service initialized', {
      serviceInstanceId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      sessionStorageSize: TwoFactorAuthService.sessionStorage.size
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

    // Check if there's already a setup in progress to prevent duplicate QR codes
    const sessionKey = `${context.userId}-${request.methodType}`;
    const existingSession = TwoFactorAuthService.sessionStorage.get(sessionKey);
    
    if (existingSession) {
      // Check if session is still valid (not expired)
      const maxAge = 30 * 60 * 1000; // 30 minutes
      const isExpired = Date.now() - existingSession.timestamp > maxAge;
      
      if (!isExpired) {
        this.logger.log(`Reusing existing 2FA setup for user ${context.userId}`, {
          sessionKey,
          methodId: existingSession.methodId,
          age: Date.now() - existingSession.timestamp
        });
        
        // Get the provider and regenerate QR code with existing secret
        const provider = this.methodRegistry.getProvider(request.methodType);
        const setupResponse = await provider.setup(context.userId, request, existingSession.secret);
        
        // Update the response with existing session data
        return {
          ...setupResponse,
          methodId: existingSession.methodId,
          secret: existingSession.secret,
        };
      } else {
        this.logger.log(`Existing session expired, creating new setup for user ${context.userId}`);
        TwoFactorAuthService.sessionStorage.delete(sessionKey);
      }
    }

    // Get the appropriate provider
    const provider = this.methodRegistry.getProvider(request.methodType);

    // Setup the method using the provider (new setup)
    const setupResponse = await provider.setup(context.userId, request);

    // Store setup data in session for verification (more reliable)
    const sessionData = {
      secret: setupResponse.secret,
      methodId: setupResponse.methodId,
      timestamp: Date.now(),
      userId: context.userId
    };
    
    TwoFactorAuthService.sessionStorage.set(sessionKey, sessionData);
    this.logger.log(`Stored new 2FA setup data in session for user ${context.userId}`, {
      sessionKey,
      methodId: setupResponse.methodId,
      methodType: setupResponse.methodType,
      sessionSize: TwoFactorAuthService.sessionStorage.size,
      allSessionKeys: Array.from(TwoFactorAuthService.sessionStorage.keys()),
      storedData: { ...sessionData, secret: '***HIDDEN***' }
    });

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
    this.logger.log(`Verifying 2FA code for user ${context.userId}`, {
      methodId: request.methodId,
      methodType: request.methodType,
      hasCode: !!request.code
    });

    // Look for setup data in session storage
    const sessionKey = `${context.userId}-${request.methodType || 'TOTP'}`;
    const sessionData = TwoFactorAuthService.sessionStorage.get(sessionKey);
    
    this.logger.log(`Looking for session data with key: ${sessionKey}`, {
      found: !!sessionData,
      sessionSize: TwoFactorAuthService.sessionStorage.size,
      allKeys: Array.from(TwoFactorAuthService.sessionStorage.keys()),
      requestedKey: sessionKey,
      keyExists: TwoFactorAuthService.sessionStorage.has(sessionKey),
      serviceInstance: this.constructor.name,
      timestamp: new Date().toISOString()
    });
    
    let targetMethod = null;
    
    if (sessionData) {
      // Check if session data is not expired (30 minutes max)
      const maxAge = 30 * 60 * 1000; // 30 minutes
      const isExpired = Date.now() - sessionData.timestamp > maxAge;
      
      if (!isExpired) {
        targetMethod = {
          id: sessionData.methodId,
          secret: sessionData.secret,
          methodType: request.methodType || 'TOTP',
          userId: sessionData.userId
        };
        this.logger.log(`Found valid session data for user ${context.userId}`, {
          methodId: sessionData.methodId,
          age: Date.now() - sessionData.timestamp
        });
      } else {
        this.logger.warn(`Session data expired for user ${context.userId}`, {
          age: Date.now() - sessionData.timestamp,
          maxAge
        });
        TwoFactorAuthService.sessionStorage.delete(sessionKey);
      }
    }

    if (!targetMethod) {
      this.logger.warn(`No stored 2FA method found for user ${context.userId}. This might be due to a server restart during setup.`);
      throw new TwoFactorError(
        'No 2FA method found for verification. Please restart the setup process.',
        TwoFactorErrorCode.SETUP_REQUIRED,
      );
    }

    // Get the provider and verify
    const provider = this.methodRegistry.getProvider(targetMethod.methodType);
    const verificationResult = await provider.verify(
      context.userId,
      request.code,
      targetMethod.secret, // Use the stored secret
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

    // Store the enabled method in static storage
    const enabledMethodKey = `${context.userId}-enabled`;
    const enabledMethod = {
      methodId,
      methodType: 'TOTP', // For now, assume TOTP
      enabledAt: new Date(),
      userId: context.userId
    };
    
    TwoFactorAuthService.enabledMethods.set(enabledMethodKey, enabledMethod);
    
    this.logger.log(`Successfully enabled 2FA method ${methodId} for user ${context.userId}`, {
      enabledMethodKey,
      methodId,
      methodType: enabledMethod.methodType,
      enabledAt: enabledMethod.enabledAt,
      totalEnabledMethods: TwoFactorAuthService.enabledMethods.size
    });

    // TODO: Update method as enabled in database
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

    // Check if user has enabled 2FA methods
    const enabledMethodKey = `${context.userId}-enabled`;
    const enabledMethod = TwoFactorAuthService.enabledMethods.get(enabledMethodKey);
    
    this.logger.log(`Checking 2FA status for user ${context.userId}`, {
      enabledMethodKey,
      hasEnabledMethod: !!enabledMethod,
      totalEnabledMethods: TwoFactorAuthService.enabledMethods.size,
      allEnabledKeys: Array.from(TwoFactorAuthService.enabledMethods.keys())
    });

    const userMethods: any[] = [];
    const enabledMethods: any[] = [];
    let primaryMethod = null;

    if (enabledMethod) {
      const methodSummary = {
        id: enabledMethod.methodId,
        methodType: enabledMethod.methodType,
        name: 'Authenticator App',
        isEnabled: true,
        isPrimary: true,
        createdAt: enabledMethod.enabledAt,
        lastUsedAt: null,
        maskedData: '***SECRET***'
      };
      
      userMethods.push(methodSummary);
      enabledMethods.push(methodSummary);
      primaryMethod = methodSummary;
    }

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