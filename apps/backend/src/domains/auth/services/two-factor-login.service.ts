import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { BackupCodesService } from './backup-codes.service';
import { TwoFactorMethodType } from '../dto/setup-two-factor.dto';
import * as crypto from 'crypto';

export interface TwoFactorLoginSession {
  id: string;
  userId: string;
  email: string;
  name: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
  createdAt: Date;
  expiresAt: Date;
  originalPayload: any; // Store the original JWT payload to be issued after 2FA
}

@Injectable()
export class TwoFactorLoginService {
  private readonly logger = new Logger(TwoFactorLoginService.name);
  private readonly sessions = new Map<string, TwoFactorLoginSession>();
  
  // Session configuration
  private readonly SESSION_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes

  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly backupCodesService: BackupCodesService
  ) {
    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL);
  }

  /**
   * Create a temporary 2FA login session
   */
  createSession(userId: string, email: string, name: string, originalPayload: any, tenantId?: string): TwoFactorLoginSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);

    const session: TwoFactorLoginSession = {
      id: sessionId,
      userId,
      email,
      name,
      tenantId,
      isSuperAdmin: originalPayload.isSuperAdmin,
      createdAt: now,
      expiresAt,
      originalPayload
    };

    this.sessions.set(sessionId, session);

    this.logger.log(`Created 2FA login session for user ${userId}`, {
      sessionId,
      email,
      tenantId,
      expiresAt: expiresAt.toISOString()
    });

    return session;
  }

  /**
   * Get and validate a 2FA login session
   */
  getSession(sessionId: string): TwoFactorLoginSession {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new BadRequestException('Invalid or expired 2FA session');
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      throw new BadRequestException('2FA session expired. Please login again.');
    }

    return session;
  }

  /**
   * Verify 2FA code for a login session
   */
  async verifyLoginCode(sessionId: string, code: string, type?: 'totp' | 'backup'): Promise<any> {
    const session = this.getSession(sessionId);

    try {
      let isValid = false;
      let remainingCodes = 0;

      if (type === 'backup') {
        // Verify backup code
        const result = await this.backupCodesService.verifyBackupCode(session.userId, code);
        isValid = result.isValid;
        remainingCodes = result.remainingCodes;

        if (isValid) {
          this.logger.log(`Backup code verified for user ${session.userId} during login`, {
            sessionId,
            remainingCodes
          });
        }
      } else {
        // Default to TOTP verification
        const result = await this.twoFactorService.verifyCode(session.userId, {
          code,
          methodType: TwoFactorMethodType.TOTP
        });
        isValid = result.success;

        if (isValid) {
          this.logger.log(`TOTP code verified for user ${session.userId} during login`, {
            sessionId
          });
        }
      }

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      // 2FA verification successful - return the original payload for JWT generation
      const payload = session.originalPayload;
      
      // Clean up the session
      this.sessions.delete(sessionId);

      return {
        payload,
        type: type || 'totp',
        remainingBackupCodes: type === 'backup' ? remainingCodes : undefined
      };

    } catch (error) {
      this.logger.error(`2FA verification failed for session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
        userId: session.userId,
        type
      });
      throw error;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async userHas2FAEnabled(userId: string): Promise<{ enabled: boolean; availableMethods: string[] }> {
    try {
      const status = await this.twoFactorService.getUserStatus(userId);
      const hasBackupCodes = await this.backupCodesService.hasBackupCodes(userId);
      
      const availableMethods = [];
      if (status.isEnabled) {
        availableMethods.push('totp');
      }
      if (hasBackupCodes) {
        availableMethods.push('backup');
      }

      return {
        enabled: status.isEnabled,
        availableMethods
      };
    } catch (error) {
      this.logger.error(`Failed to check 2FA status for user ${userId}`, error);
      return { enabled: false, availableMethods: [] };
    }
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSessionId(): string {
    return `2fa_session_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    this.sessions.forEach((session, sessionId) => {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired 2FA login sessions`);
    }
  }

  /**
   * Get session statistics (for monitoring)
   */
  getSessionStats(): { totalSessions: number; oldestSession?: Date } {
    const sessions = Array.from(this.sessions.values());
    const oldestSession = sessions.length > 0 
      ? sessions.reduce((oldest, session) => 
          session.createdAt < oldest ? session.createdAt : oldest, sessions[0].createdAt)
      : undefined;

    return {
      totalSessions: sessions.length,
      oldestSession
    };
  }
} 