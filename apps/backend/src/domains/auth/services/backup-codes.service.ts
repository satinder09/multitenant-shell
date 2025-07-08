/**
 * 🔐 BACKUP CODES SERVICE
 * 
 * Generates and manages backup codes for 2FA recovery
 * Provides fallback authentication when primary methods are unavailable
 */

import { Injectable, Logger } from '@nestjs/common';
import { TwoFactorDatabaseService } from './two-factor-database.service';
import * as crypto from 'crypto';

export interface BackupCodesResponse {
  codes: string[];
  instructions: string;
  generatedAt: Date;
}

export interface BackupCodeVerificationResult {
  isValid: boolean;
  remainingCodes: number;
  message: string;
}

@Injectable()
export class BackupCodesService {
  private readonly logger = new Logger(BackupCodesService.name);

  constructor(private readonly twoFactorDb: TwoFactorDatabaseService) {}

  /**
   * Generate new backup codes for a user
   */
  async generateBackupCodes(userId: string, count = 8): Promise<BackupCodesResponse> {
    this.logger.log(`Generating ${count} backup codes for user ${userId}`);

    const codes = this.generateSecureCodes(count);
    
    // Store encrypted backup codes in the user's twoFactorBackupCodes field
    // Note: This assumes the User model has twoFactorBackupCodes field
    await this.storeBackupCodes(userId, codes);

    return {
      codes,
      instructions: this.getBackupCodesInstructions(),
      generatedAt: new Date()
    };
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<BackupCodeVerificationResult> {
    this.logger.log(`Verifying backup code for user ${userId}`);

    try {
      const storedCodes = await this.getStoredBackupCodes(userId);
      
      if (!storedCodes || storedCodes.length === 0) {
        return {
          isValid: false,
          remainingCodes: 0,
          message: 'No backup codes found. Please generate new backup codes.'
        };
      }

      // Check if the code is valid
      const codeIndex = storedCodes.findIndex(storedCode => 
        this.compareCode(code.trim().toUpperCase(), storedCode)
      );

      if (codeIndex === -1) {
        return {
          isValid: false,
          remainingCodes: storedCodes.length,
          message: 'Invalid backup code'
        };
      }

      // Remove the used code
      const updatedCodes = storedCodes.filter((_, index) => index !== codeIndex);
      await this.storeBackupCodes(userId, updatedCodes);

      this.logger.log(`Backup code used for user ${userId}. Remaining codes: ${updatedCodes.length}`);

      return {
        isValid: true,
        remainingCodes: updatedCodes.length,
        message: 'Backup code verified successfully'
      };

    } catch (error) {
      this.logger.error(`Failed to verify backup code for user ${userId}`, error);
      return {
        isValid: false,
        remainingCodes: 0,
        message: 'Error verifying backup code'
      };
    }
  }

  /**
   * Get remaining backup codes count for a user
   */
  async getRemainingCodesCount(userId: string): Promise<number> {
    try {
      const codes = await this.getStoredBackupCodes(userId);
      return codes ? codes.length : 0;
    } catch (error) {
      this.logger.error(`Failed to get remaining codes count for user ${userId}`, error);
      return 0;
    }
  }

  /**
   * Check if user has backup codes
   */
  async hasBackupCodes(userId: string): Promise<boolean> {
    const count = await this.getRemainingCodesCount(userId);
    return count > 0;
  }

  /**
   * Generate secure backup codes
   */
  private generateSecureCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format as XXXX-XXXX for readability
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
      codes.push(formattedCode);
    }
    
    return codes;
  }

  /**
   * Store backup codes for a user (encrypted)
   */
  private async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    try {
      // Encrypt each code before storing
      const encryptedCodes = codes.map(code => this.encryptCode(code));
      
      // Update user's backup codes in database
      // Note: This requires access to the User model through the database service
      await this.twoFactorDb.updateUserBackupCodes(userId, encryptedCodes);
      
      this.logger.log(`Stored ${codes.length} backup codes for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to store backup codes for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get stored backup codes for a user (decrypted)
   */
  private async getStoredBackupCodes(userId: string): Promise<string[] | null> {
    try {
      const encryptedCodes = await this.twoFactorDb.getUserBackupCodes(userId);
      
      if (!encryptedCodes || encryptedCodes.length === 0) {
        return null;
      }

      // Decrypt codes
      return encryptedCodes.map(encryptedCode => this.decryptCode(encryptedCode));
    } catch (error) {
      this.logger.error(`Failed to get backup codes for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Encrypt a backup code using AES-256-CBC
   */
  private encryptCode(code: string): string {
    // Use proper AES-256-CBC encryption (same as 2FA secrets)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    
    let encrypted = cipher.update(code, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a backup code using AES-256-CBC
   */
  private decryptCode(encryptedCode: string): string {
    try {
      // Check if data is in proper encrypted format
      if (!encryptedCode.includes(':')) {
        // Legacy Base64 data - migrate to proper encryption
        this.logger.warn('Found legacy Base64 backup code - migrating to proper encryption');
        try {
          const decoded = Buffer.from(encryptedCode, 'base64').toString('utf8');
          return decoded;
        } catch (error) {
          this.logger.error('Failed to decode legacy Base64 backup code', error);
          return encryptedCode;
        }
      }

      const [ivHex, encrypted] = encryptedCode.split(':');
      
      if (!ivHex || !encrypted) {
        this.logger.warn('Invalid encrypted backup code format');
        return encryptedCode;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;

    } catch (error) {
      this.logger.error('Failed to decrypt backup code', error);
      return encryptedCode; // Return as-is if decryption fails
    }
  }

  /**
   * Get encryption key (reuse same key as 2FA secrets)
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || 'dev-key-12345678901234567890123456789012';
    
    if (key.length < 32) {
      const paddedKey = key.padEnd(32, '0');
      return Buffer.from(paddedKey, 'utf8');
    } else {
      return Buffer.from(key.slice(0, 32), 'utf8');
    }
  }

  /**
   * Compare codes securely
   */
  private compareCode(providedCode: string, storedCode: string): boolean {
    // Use timing-safe comparison
    const provided = Buffer.from(providedCode, 'utf8');
    const stored = Buffer.from(storedCode, 'utf8');
    
    if (provided.length !== stored.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(provided, stored);
  }

  /**
   * Get backup codes instructions
   */
  private getBackupCodesInstructions(): string {
    return `
These backup codes can be used to access your account if you lose your authenticator device.

Important:
• Each code can only be used once
• Store them in a safe place (password manager, secure notes)
• Don't share them with anyone
• Generate new codes if you suspect they've been compromised

You can use these codes instead of your authenticator app when logging in.
    `.trim();
  }
} 