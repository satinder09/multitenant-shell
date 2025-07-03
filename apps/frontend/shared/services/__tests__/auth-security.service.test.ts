/**
 * Tests for Authentication Security Service
 */

import {
  authSecurityService,
  AuthenticationSecurityService
} from '../auth-security.service';

describe('Authentication Security Service', () => {
  let service: AuthenticationSecurityService;
  
  beforeEach(() => {
    service = new AuthenticationSecurityService({
      enableRefreshTokenRotation: true,
      enableSuspiciousActivityDetection: true,
      enableAccountLockout: true,
      enable2FA: true,
      maxFailedAttempts: 3,
      lockoutDurationMinutes: 5,
      refreshTokenTTL: 60000, // 1 minute for testing
      suspiciousActivityThreshold: 2
    });
  });

  describe('Login Attempt Recording', () => {
    test('should record successful login attempt', async () => {
      const attempt = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true,
        deviceFingerprint: 'device123'
      };

      const result = await service.recordLoginAttempt(attempt);

      expect(result.allowed).toBe(true);
      expect(result.alerts).toHaveLength(0);
      expect(result.reason).toBeUndefined();
    });

    test('should record failed login attempt', async () => {
      const attempt = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: false
      };

      const result = await service.recordLoginAttempt(attempt);

      expect(result.allowed).toBe(true);
      expect(result.alerts).toHaveLength(0);
    });

    test('should detect new device', async () => {
      // First login with device1
      await service.recordLoginAttempt({
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true,
        deviceFingerprint: 'device1'
      });

      // Second login with device2
      const result = await service.recordLoginAttempt({
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true,
        deviceFingerprint: 'device2'
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].type).toBe('NEW_DEVICE');
      expect(result.alerts[0].severity).toBe('MEDIUM');
    });
  });

  describe('Account Lockout', () => {
    test('should lock account after max failed attempts', async () => {
      const email = 'user@example.com';
      
      // Make 3 failed attempts (max is 3)
      for (let i = 0; i < 3; i++) {
        await service.recordLoginAttempt({
          email,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          success: false
        });
      }

      // Fourth attempt should be blocked
      const result = await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: false
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('locked');
      expect(result.lockout).toBeDefined();
      expect(result.lockout?.email).toBe(email);
    });

    test('should clear failed attempts on successful login', async () => {
      const email = 'user@example.com';
      
      // Make 2 failed attempts
      for (let i = 0; i < 2; i++) {
        await service.recordLoginAttempt({
          email,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          success: false
        });
      }

      // Successful login should clear failed attempts
      await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true
      });

      // Next failed attempt shouldn't trigger lockout
      const result = await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: false
      });

      expect(result.allowed).toBe(true);
      expect(result.lockout).toBeUndefined();
    });

    test('should allow admin to unlock account', async () => {
      const email = 'user@example.com';
      
      // Lock the account
      for (let i = 0; i < 4; i++) {
        await service.recordLoginAttempt({
          email,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          success: false
        });
      }

      // Admin unlocks account
      const wasLocked = service.unlockAccount(email);
      expect(wasLocked).toBe(true);

      // Should be able to attempt login again
      const unlockedResult = await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true
      });
      expect(unlockedResult.allowed).toBe(true);
    });
  });

  describe('Suspicious Activity Detection', () => {
    test('should detect multiple failed attempts', async () => {
      const email = 'user@example.com';
      
      // Make 2 rapid failed attempts (threshold is 2)
      await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: false
      });

      const result = await service.recordLoginAttempt({
        email,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: false
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].type).toBe('MULTIPLE_FAILED_ATTEMPTS');
      expect(result.alerts[0].severity).toBe('HIGH');
    });
  });

  describe('Refresh Token Management', () => {
    test('should generate refresh token', async () => {
      const userId = 'user123';
      const result = await service.generateRefreshToken(userId);

      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should validate refresh token', async () => {
      const userId = 'user123';
      const { token } = await service.generateRefreshToken(userId);

      const validation = await service.validateRefreshToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(userId);
      expect(validation.newToken).toBeDefined();
    });

    test('should reject invalid refresh token', async () => {
      const validation = await service.validateRefreshToken('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.userId).toBeUndefined();
      expect(validation.newToken).toBeUndefined();
    });
  });

  describe('Two-Factor Authentication', () => {
    test('should setup 2FA for user', async () => {
      const userId = 'user123';
      const setup = await service.setup2FA(userId);

      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeUrl).toContain('qrserver.com');
      expect(setup.backupCodes).toHaveLength(10);
      expect(setup.backupCodes.every(code => /^[A-F0-9]{8}$/.test(code))).toBe(true);
    });

    test('should get 2FA status', async () => {
      const userId = 'user123';
      
      // Initially disabled
      let status = service.get2FAStatus(userId);
      expect(status.enabled).toBe(false);
      expect(status.hasBackupCodes).toBe(false);

      // After setup but before verification
      await service.setup2FA(userId);
      status = service.get2FAStatus(userId);
      expect(status.enabled).toBe(false);
      expect(status.hasBackupCodes).toBe(true);
    });
  });

  describe('Security Metrics', () => {
    test('should provide security metrics', async () => {
      // Generate some test data
      await service.recordLoginAttempt({
        email: 'user1@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true
      });

      await service.recordLoginAttempt({
        email: 'user2@example.com',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0...',
        success: false
      });

      const metrics = service.getSecurityMetrics();

      expect(metrics.totalLoginAttempts).toBeGreaterThan(0);
      expect(metrics.failedAttempts).toBeGreaterThan(0);
      expect(metrics.lockedAccounts).toBeGreaterThanOrEqual(0);
      expect(metrics.usersWithTwoFA).toBeGreaterThanOrEqual(0);
      expect(metrics.suspiciousActivityAlerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    test('should respect disabled features', async () => {
      const disabledService = new AuthenticationSecurityService({
        enableAccountLockout: false,
        enable2FA: false
      });

      // Account lockout disabled - should not lock even with many failures
      for (let i = 0; i < 10; i++) {
        const result = await disabledService.recordLoginAttempt({
          email: 'user@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          success: false
        });
        expect(result.allowed).toBe(true);
      }

      // 2FA disabled
      await expect(disabledService.setup2FA('user123')).rejects.toThrow('2FA is disabled');
    });
  });
}); 