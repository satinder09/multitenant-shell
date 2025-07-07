/**
 * 🔐 BACKUP CODES SERVICE
 * 
 * Generates and manages backup codes for 2FA recovery
 * Provides fallback authentication when primary methods are unavailable
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

import {
  BackupCodesData,
  TwoFactorContext,
  TwoFactorError,
  TwoFactorErrorCode,
} from '../types/two-factor-auth.types';

@Injectable()
export class BackupCodesService {
  private readonly logger = new Logger(BackupCodesService.name);
  
  // Configuration
  private readonly CODE_COUNT = 10;
  private readonly CODE_LENGTH = 8;
  private readonly SALT_ROUNDS = 12;

  constructor() {
    this.logger.log('Backup Codes Service initialized');
  }

  /**
   * Generate new backup codes for user
   */
  async generateBackupCodes(): Promise<{
    plainCodes: string[];
    hashedCodes: string[];
    backupCodesData: BackupCodesData;
  }> {
    this.logger.log('Generating backup codes');

    try {
      const plainCodes: string[] = [];
      const hashedCodes: string[] = [];

      // Generate the specified number of codes
      for (let i = 0; i < this.CODE_COUNT; i++) {
        const code = this.generateSingleCode();
        const hashedCode = await bcrypt.hash(code, this.SALT_ROUNDS);
        
        plainCodes.push(code);
        hashedCodes.push(hashedCode);
      }

      const backupCodesData: BackupCodesData = {
        codes: hashedCodes,
        usedCodes: [],
        generatedAt: new Date(),
      };

      this.logger.log(`Generated ${plainCodes.length} backup codes`);
      
      return {
        plainCodes,
        hashedCodes,
        backupCodesData,
      };

    } catch (error) {
      this.logger.error('Failed to generate backup codes', error);
      throw new TwoFactorError(
        'Failed to generate backup codes',
        TwoFactorErrorCode.SETUP_REQUIRED,
      );
    }
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(
    code: string,
    backupCodesData: BackupCodesData,
  ): Promise<{ isValid: boolean; remainingCodes: number }> {
    this.logger.log('Verifying backup code');

    try {
      // Validate code format
      if (!this.isValidCodeFormat(code)) {
        return { isValid: false, remainingCodes: this.getRemainingCodesCount(backupCodesData) };
      }

      // Check if code was already used
      for (const usedCode of backupCodesData.usedCodes) {
        if (await bcrypt.compare(code, usedCode)) {
          this.logger.warn('Backup code already used');
          return { isValid: false, remainingCodes: this.getRemainingCodesCount(backupCodesData) };
        }
      }

      // Check if code is valid
      let matchedCode: string | null = null;
      for (const hashedCode of backupCodesData.codes) {
        if (await bcrypt.compare(code, hashedCode)) {
          matchedCode = hashedCode;
          break;
        }
      }

      if (!matchedCode) {
        this.logger.warn('Invalid backup code');
        return { isValid: false, remainingCodes: this.getRemainingCodesCount(backupCodesData) };
      }

      // Mark code as used
      backupCodesData.usedCodes.push(matchedCode);
      backupCodesData.lastUsedAt = new Date();

      const remainingCodes = this.getRemainingCodesCount(backupCodesData);
      this.logger.log(`Backup code verified successfully. ${remainingCodes} codes remaining.`);

      return { isValid: true, remainingCodes };

    } catch (error) {
      this.logger.error('Failed to verify backup code', error);
      throw new TwoFactorError(
        'Failed to verify backup code',
        TwoFactorErrorCode.VERIFICATION_FAILED,
      );
    }
  }

  /**
   * Check if user has backup codes
   */
  hasBackupCodes(backupCodesData: BackupCodesData | null): boolean {
    if (!backupCodesData) return false;
    return this.getRemainingCodesCount(backupCodesData) > 0;
  }

  /**
   * Get remaining codes count
   */
  getRemainingCodesCount(backupCodesData: BackupCodesData): number {
    return backupCodesData.codes.length - backupCodesData.usedCodes.length;
  }

  /**
   * Check if backup codes need regeneration
   */
  shouldRegenerateBackupCodes(backupCodesData: BackupCodesData): boolean {
    const remainingCodes = this.getRemainingCodesCount(backupCodesData);
    return remainingCodes <= 2; // Regenerate when 2 or fewer codes remain
  }

  /**
   * Validate backup code format
   */
  isValidCodeFormat(code: string): boolean {
    // Remove any spaces or dashes that users might add
    const cleanCode = code.replace(/[\s-]/g, '');
    
    // Check if it's exactly 8 characters and alphanumeric
    return /^[A-Z0-9]{8}$/.test(cleanCode.toUpperCase());
  }

  /**
   * Format backup code for display
   */
  formatCodeForDisplay(code: string): string {
    // Format as XXXX-XXXX for better readability
    return code.substring(0, 4) + '-' + code.substring(4);
  }

  /**
   * Generate a single backup code
   */
  private generateSingleCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate 8 random characters
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = randomBytes(1)[0] % chars.length;
      code += chars[randomIndex];
    }

    return code;
  }

  /**
   * Clean up expired or used backup codes
   */
  async cleanupExpiredCodes(backupCodesData: BackupCodesData): Promise<BackupCodesData> {
    // For now, we don't expire backup codes, but this method provides
    // a hook for future implementation of expiration logic
    return backupCodesData;
  }

  /**
   * Get backup codes statistics
   */
  getBackupCodesStats(backupCodesData: BackupCodesData): {
    totalCodes: number;
    usedCodes: number;
    remainingCodes: number;
    generatedAt: Date;
    lastUsedAt?: Date;
    percentageUsed: number;
  } {
    const totalCodes = backupCodesData.codes.length;
    const usedCodes = backupCodesData.usedCodes.length;
    const remainingCodes = totalCodes - usedCodes;
    const percentageUsed = Math.round((usedCodes / totalCodes) * 100);

    return {
      totalCodes,
      usedCodes,
      remainingCodes,
      generatedAt: backupCodesData.generatedAt,
      lastUsedAt: backupCodesData.lastUsedAt,
      percentageUsed,
    };
  }

  /**
   * Validate backup codes data structure
   */
  validateBackupCodesData(backupCodesData: any): backupCodesData is BackupCodesData {
    return (
      backupCodesData &&
      Array.isArray(backupCodesData.codes) &&
      Array.isArray(backupCodesData.usedCodes) &&
      backupCodesData.generatedAt instanceof Date &&
      backupCodesData.codes.length === this.CODE_COUNT
    );
  }

  /**
   * Get user-friendly instructions for backup codes
   */
  getInstructions(): string {
    return `
Backup Codes Instructions:

1. Save these codes in a secure location (password manager, safe, etc.)
2. Each code can only be used once
3. Use backup codes when you don't have access to your primary 2FA method
4. Generate new codes when you have 2 or fewer remaining
5. Keep these codes private and secure

To use a backup code:
- Enter the 8-character code when prompted for 2FA
- You can include or omit the dash (both XXXX-XXXX and XXXXXXXX work)
- Codes are not case-sensitive

⚠️ Important: Once you use a backup code, it cannot be used again.
    `.trim();
  }
} 