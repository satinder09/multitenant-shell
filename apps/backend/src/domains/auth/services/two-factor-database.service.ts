import { Injectable, Logger } from '@nestjs/common';
import { MasterDatabaseService } from '../../database/master/master-database.service';
// Import from the generated master prisma client
import { TwoFactorMethodType, TwoFactorAction } from '../../../../generated/master-prisma';
import * as crypto from 'crypto';

export interface CreateTwoFactorMethodData {
  userId: string;
  methodType: TwoFactorMethodType;
  secretData: string;
  name?: string;
  isPrimary?: boolean;
}

export interface TwoFactorMethodWithAudit {
  id: string;
  userId: string;
  methodType: TwoFactorMethodType;
  isEnabled: boolean;
  isPrimary: boolean;
  secretData: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

@Injectable()
export class TwoFactorDatabaseService {
  private readonly logger = new Logger(TwoFactorDatabaseService.name);
  private readonly encryptionKey: Buffer;

  constructor(private readonly masterDb: MasterDatabaseService) {
    // Use a proper encryption key from environment or a default for development
    const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || 'dev-key-12345678901234567890123456789012'; // 32 chars for development
    
    // Ensure we have a proper 32-byte key
    if (key.length < 32) {
      const paddedKey = key.padEnd(32, '0');
      this.encryptionKey = Buffer.from(paddedKey, 'utf8');
    } else {
      this.encryptionKey = Buffer.from(key.slice(0, 32), 'utf8');
    }
    
    this.logger.log('2FA Database Service initialized with encryption', {
      keySource: process.env.TWO_FACTOR_ENCRYPTION_KEY ? 'environment' : 'default'
    });
  }

  /**
   * Create a new 2FA method for a user
   */
  async createMethod(data: CreateTwoFactorMethodData): Promise<TwoFactorMethodWithAudit> {
    const encryptedSecret = this.encryptSecret(data.secretData);
    
    // If this is set as primary, unset other primary methods
    if (data.isPrimary) {
      await this.masterDb.twoFactorMethod.updateMany({
        where: { userId: data.userId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const method = await this.masterDb.twoFactorMethod.create({
      data: {
        userId: data.userId,
        methodType: data.methodType,
        secretData: encryptedSecret,
        name: data.name,
        isPrimary: data.isPrimary || false,
        isEnabled: false, // Must be verified before enabled
      }
    });

    // Log creation audit
    await this.logAuditEvent(method.id, TwoFactorAction.SETUP, true);

    return {
      ...method,
      secretData: data.secretData // Return unencrypted for immediate use
    };
  }

  /**
   * Find 2FA method by ID
   */
  async findMethodById(methodId: string): Promise<TwoFactorMethodWithAudit | null> {
    const method = await this.masterDb.twoFactorMethod.findUnique({
      where: { id: methodId }
    });

    if (!method) return null;

    return {
      ...method,
      secretData: this.decryptSecret(method.secretData)
    };
  }

  /**
   * Find 2FA methods for a user
   */
  async findUserMethods(userId: string, enabledOnly = false): Promise<TwoFactorMethodWithAudit[]> {
    try {
      const methods = await this.masterDb.twoFactorMethod.findMany({
        where: {
          userId,
          ...(enabledOnly && { isEnabled: true })
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return methods.map(method => {
        try {
          return {
            ...method,
            secretData: this.decryptSecret(method.secretData)
          };
        } catch (error) {
          this.logger.error(`Failed to decrypt secret for method ${method.id}`, {
            error: error instanceof Error ? error.message : String(error),
            methodId: method.id,
            userId
          });
          // Return with original data if decryption fails
          return {
            ...method,
            secretData: method.secretData
          };
        }
      });
    } catch (error) {
      this.logger.error(`Failed to find user methods for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Find method by user and type
   */
  async findMethodByUserAndType(
    userId: string, 
    methodType: TwoFactorMethodType
  ): Promise<TwoFactorMethodWithAudit | null> {
    const method = await this.masterDb.twoFactorMethod.findUnique({
      where: {
        userId_methodType: { userId, methodType }
      }
    });

    if (!method) return null;

    return {
      ...method,
      secretData: this.decryptSecret(method.secretData)
    };
  }

  /**
   * Enable a 2FA method after successful verification
   */
  async enableMethod(methodId: string, isPrimary = false): Promise<void> {
    if (isPrimary) {
      // Get the method to find the user
      const method = await this.masterDb.twoFactorMethod.findUnique({
        where: { id: methodId }
      });
      
      if (method) {
        // Unset other primary methods for this user
        await this.masterDb.twoFactorMethod.updateMany({
          where: { userId: method.userId, isPrimary: true },
          data: { isPrimary: false }
        });
      }
    }

    await this.masterDb.twoFactorMethod.update({
      where: { id: methodId },
      data: { 
        isEnabled: true,
        isPrimary,
        updatedAt: new Date()
      }
    });

    await this.logAuditEvent(methodId, TwoFactorAction.ENABLE, true);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(methodId: string): Promise<void> {
    await this.masterDb.twoFactorMethod.update({
      where: { id: methodId },
      data: { lastUsedAt: new Date() }
    });
  }

  /**
   * Disable a 2FA method
   */
  async disableMethod(methodId: string): Promise<void> {
    await this.masterDb.twoFactorMethod.update({
      where: { id: methodId },
      data: { 
        isEnabled: false,
        isPrimary: false,
        updatedAt: new Date()
      }
    });

    await this.logAuditEvent(methodId, TwoFactorAction.DISABLE, true);
  }

  /**
   * Delete a 2FA method
   */
  async deleteMethod(methodId: string): Promise<void> {
    await this.masterDb.twoFactorMethod.delete({
      where: { id: methodId }
    });

    await this.logAuditEvent(methodId, TwoFactorAction.DELETE, true);
  }

  /**
   * Update existing method with new secret data
   */
  async updateMethodSecret(methodId: string, secretData: string): Promise<void> {
    const encryptedSecret = this.encryptSecret(secretData);
    
    await this.masterDb.twoFactorMethod.update({
      where: { id: methodId },
      data: { 
        secretData: encryptedSecret,
        updatedAt: new Date()
      }
    });

    await this.logAuditEvent(methodId, TwoFactorAction.SETUP, true);
  }

  /**
   * Check if user has any enabled 2FA methods
   */
  async hasEnabledMethods(userId: string): Promise<boolean> {
    const count = await this.masterDb.twoFactorMethod.count({
      where: { userId, isEnabled: true }
    });
    return count > 0;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    methodId: string, 
    action: TwoFactorAction, 
    success: boolean,
    metadata?: any
  ): Promise<void> {
    try {
      await this.masterDb.twoFactorAuditLog.create({
        data: {
          methodId,
          action,
          success,
          metadata: metadata || {},
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Failed to log 2FA audit event', error);
    }
  }

  /**
   * Encrypt secret data
   */
  private encryptSecret(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret data with backwards compatibility
   */
  private decryptSecret(encryptedData: string): string {
    try {
      // Check if data is in our expected encrypted format (contains ':')
      if (!encryptedData.includes(':')) {
        // Assume this is legacy unencrypted data - return as is
        this.logger.warn('Found unencrypted 2FA secret data - consider migrating to encrypted format');
        return encryptedData;
      }

      const [ivHex, encrypted] = encryptedData.split(':');
      
      // Validate format
      if (!ivHex || !encrypted) {
        this.logger.warn('Invalid encrypted data format - treating as unencrypted');
        return encryptedData;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;

    } catch (error) {
      this.logger.error('Failed to decrypt 2FA secret data - treating as unencrypted', {
        error: error instanceof Error ? error.message : String(error),
        dataFormat: encryptedData.substring(0, 20) + '...'
      });
      
      // Fallback: assume it's unencrypted legacy data
      return encryptedData;
    }
  }
} 