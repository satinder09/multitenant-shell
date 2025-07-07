/**
 * 🔐 TWO-FACTOR AUTHENTICATION SERVICE
 * 
 * Main service for managing 2FA across platform and tenant users
 * Supports multiple authentication methods through provider registry
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwoFactorMethodType, TwoFactorAction } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '../../generated/master-prisma';
import { PrismaClient as TenantPrismaClient } from '../../generated/tenant-prisma';

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
import { CryptoService } from '../../../shared/services/crypto.service';

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly config: TwoFactorConfig;

  constructor(
    @Inject('MASTER_PRISMA') private masterPrisma: MasterPrismaClient,
    @Inject('TENANT_PRISMA') private tenantPrisma: TenantPrismaClient,
    private methodRegistry: TwoFactorMethodRegistryService,
    private cryptoService: CryptoService,
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

    // Store method data in database
    await this.storeMethodData(context, {
      methodType: request.methodType,
      secretData: setupResponse.secret || '',
      name: request.name,
      isEnabled: false, // Will be enabled after verification
      isPrimary: false,
    });

    // Log audit trail
    await this.logAuditEvent(context, setupResponse.methodId, TwoFactorAction.SETUP, true);

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

    // Get user's 2FA methods
    const userMethods = await this.getUserMethods(context);
    
    let targetMethod = userMethods.find(m => 
      request.methodId ? m.id === request.methodId : m.methodType === request.methodType
    );

    if (!targetMethod) {
      throw new TwoFactorError(
        'No 2FA method found for verification',
        TwoFactorErrorCode.METHOD_NOT_ENABLED,
      );
    }

    // Check for rate limiting
    await this.checkRateLimit(context, targetMethod.id);

    // Get the provider and verify
    const provider = this.methodRegistry.getProvider(targetMethod.methodType);
    const verificationResult = await provider.verify(
      context.userId,
      request.code,
      targetMethod.secretData,
    );

    // Log audit event
    await this.logAuditEvent(
      context,
      targetMethod.id,
      verificationResult.success ? TwoFactorAction.VERIFY_SUCCESS : TwoFactorAction.VERIFY_FAILURE,
      verificationResult.success,
    );

    // Update method last used time if successful
    if (verificationResult.success) {
      await this.updateMethodLastUsed(context, targetMethod.id);
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

    // Update method as enabled
    await this.updateMethodStatus(context, methodId, true);

    // Update user's overall 2FA status
    await this.updateUserTwoFactorStatus(context, true);

    // Set as primary if it's the first method
    const userMethods = await this.getUserMethods(context);
    const enabledMethods = userMethods.filter(m => m.isEnabled);
    
    if (enabledMethods.length === 1) {
      await this.setPrimaryMethod(context, methodId);
    }

    // Log audit event
    await this.logAuditEvent(context, methodId, TwoFactorAction.ENABLE, true);
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

    // Update method as disabled
    await this.updateMethodStatus(context, methodId, false);

    // Check if this was the last enabled method
    const userMethods = await this.getUserMethods(context);
    const enabledMethods = userMethods.filter(m => m.isEnabled && m.id !== methodId);

    if (enabledMethods.length === 0) {
      // Disable overall 2FA if no methods left
      await this.updateUserTwoFactorStatus(context, false);
    }

    // Log audit event
    await this.logAuditEvent(context, methodId, TwoFactorAction.DISABLE, true);
  }

  /**
   * Get user's 2FA status
   */
  async getUserTwoFactorStatus(context: TwoFactorContext): Promise<TwoFactorStatus> {
    const user = await this.getUser(context);
    const methods = await this.getUserMethods(context);
    const enabledMethods = methods.filter(m => m.isEnabled);
    const primaryMethod = methods.find(m => m.isPrimary && m.isEnabled);

    return {
      isEnabled: user.twoFactorEnabled,
      hasBackupCodes: user.twoFactorBackupCodes?.length > 0,
      enabledMethods: enabledMethods.map(this.mapToMethodSummary),
      primaryMethod: primaryMethod ? this.mapToMethodSummary(primaryMethod) : undefined,
      canDisable: this.config.security.allowDisableByUser,
      lastVerifiedAt: primaryMethod?.lastUsedAt,
    };
  }

  // =============================================================================
  // DATABASE OPERATIONS
  // =============================================================================

  /**
   * Get user from appropriate database
   */
  private async getUser(context: TwoFactorContext) {
    if (context.userType === 'platform') {
      return this.masterPrisma.user.findUnique({
        where: { id: context.userId },
        include: { twoFactorMethods: true },
      });
    } else {
      // Note: For tenant users, we need to get the tenant-specific Prisma client
      // This is a simplified version - in practice, you'd get the tenant DB connection
      return this.tenantPrisma.user.findUnique({
        where: { id: context.userId },
        include: { twoFactorMethods: true },
      });
    }
  }

  /**
   * Get user's 2FA methods
   */
  private async getUserMethods(context: TwoFactorContext) {
    if (context.userType === 'platform') {
      return this.masterPrisma.twoFactorMethod.findMany({
        where: { userId: context.userId },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return this.tenantPrisma.twoFactorMethod.findMany({
        where: { userId: context.userId },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  /**
   * Store new 2FA method data
   */
  private async storeMethodData(
    context: TwoFactorContext,
    methodData: {
      methodType: TwoFactorMethodType;
      secretData: string;
      name?: string;
      isEnabled: boolean;
      isPrimary: boolean;
    },
  ) {
    const encryptedSecretData = await this.cryptoService.encrypt(methodData.secretData);

    const data = {
      userId: context.userId,
      methodType: methodData.methodType,
      secretData: encryptedSecretData,
      name: methodData.name,
      isEnabled: methodData.isEnabled,
      isPrimary: methodData.isPrimary,
    };

    if (context.userType === 'platform') {
      return this.masterPrisma.twoFactorMethod.create({ data });
    } else {
      return this.tenantPrisma.twoFactorMethod.create({ data });
    }
  }

  /**
   * Update method status
   */
  private async updateMethodStatus(
    context: TwoFactorContext,
    methodId: string,
    isEnabled: boolean,
  ) {
    const data = { isEnabled, updatedAt: new Date() };

    if (context.userType === 'platform') {
      return this.masterPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data,
      });
    } else {
      return this.tenantPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data,
      });
    }
  }

  /**
   * Update user's overall 2FA status
   */
  private async updateUserTwoFactorStatus(
    context: TwoFactorContext,
    isEnabled: boolean,
  ) {
    const data = { twoFactorEnabled: isEnabled };

    if (context.userType === 'platform') {
      return this.masterPrisma.user.update({
        where: { id: context.userId },
        data,
      });
    } else {
      return this.tenantPrisma.user.update({
        where: { id: context.userId },
        data,
      });
    }
  }

  /**
   * Set primary method
   */
  private async setPrimaryMethod(context: TwoFactorContext, methodId: string) {
    if (context.userType === 'platform') {
      // First, unset all primary methods
      await this.masterPrisma.twoFactorMethod.updateMany({
        where: { userId: context.userId },
        data: { isPrimary: false },
      });
      
      // Then set the specified method as primary
      return this.masterPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data: { isPrimary: true },
      });
    } else {
      await this.tenantPrisma.twoFactorMethod.updateMany({
        where: { userId: context.userId },
        data: { isPrimary: false },
      });
      
      return this.tenantPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data: { isPrimary: true },
      });
    }
  }

  /**
   * Update method last used timestamp
   */
  private async updateMethodLastUsed(context: TwoFactorContext, methodId: string) {
    const data = { lastUsedAt: new Date() };

    if (context.userType === 'platform') {
      return this.masterPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data,
      });
    } else {
      return this.tenantPrisma.twoFactorMethod.update({
        where: { id: methodId },
        data,
      });
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    context: TwoFactorContext,
    methodId: string,
    action: TwoFactorAction,
    success: boolean,
  ) {
    const data = {
      methodId,
      action,
      success,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date(),
    };

    if (context.userType === 'platform') {
      return this.masterPrisma.twoFactorAuditLog.create({ data });
    } else {
      return this.tenantPrisma.twoFactorAuditLog.create({ data });
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Check rate limiting for failed attempts
   */
  private async checkRateLimit(context: TwoFactorContext, methodId: string): Promise<void> {
    // Implementation for rate limiting based on recent failed attempts
    // This would check audit logs for recent failures
  }

  /**
   * Map method to summary (remove sensitive data)
   */
  private mapToMethodSummary(method: any): TwoFactorMethodSummary {
    return {
      id: method.id,
      methodType: method.methodType,
      name: method.name,
      isEnabled: method.isEnabled,
      isPrimary: method.isPrimary,
      lastUsedAt: method.lastUsedAt,
      maskedData: this.maskSensitiveData(method.methodType, method.secretData),
    };
  }

  /**
   * Mask sensitive data for display
   */
  private maskSensitiveData(methodType: TwoFactorMethodType, secretData: string): string {
    switch (methodType) {
      case TwoFactorMethodType.TOTP:
        return 'Authenticator App';
      case TwoFactorMethodType.SMS:
        // Would extract phone number and mask it
        return '***-***-****';
      case TwoFactorMethodType.EMAIL:
        // Would extract email and mask it
        return '***@***.com';
      default:
        return 'Configured';
    }
  }

  /**
   * Load 2FA configuration
   */
  private loadConfig(): TwoFactorConfig {
    return {
      enabledMethods: [TwoFactorMethodType.TOTP, TwoFactorMethodType.SMS, TwoFactorMethodType.EMAIL],
      totp: {
        issuer: this.configService.get('2FA_TOTP_ISSUER', 'MultiTenant Platform'),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        window: 1,
      },
      sms: {
        provider: 'twilio',
        from: this.configService.get('2FA_SMS_FROM', ''),
        template: 'Your verification code is: {code}',
        rateLimit: {
          maxAttempts: 3,
          windowMinutes: 15,
        },
      },
      email: {
        from: this.configService.get('2FA_EMAIL_FROM', ''),
        template: 'verification',
        subject: 'Your verification code',
        rateLimit: {
          maxAttempts: 3,
          windowMinutes: 15,
        },
      },
      backupCodes: {
        count: 10,
        length: 8,
        algorithm: 'bcrypt',
      },
      security: {
        maxFailedAttempts: 3,
        lockoutDurationMinutes: 15,
        requireForRoles: ['admin', 'super_admin'],
        allowDisableByUser: true,
        trustDeviceDays: 30,
      },
    };
  }
} 