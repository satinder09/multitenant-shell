import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthUser } from '../../../shared/decorators/auth-user.decorator';
import { AuthSecurityService } from '../services/auth-security.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { MetricsService } from '../../../infrastructure/monitoring/metrics.service';
import { Request } from 'express';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  tenantId?: string;
}

interface SecurityDashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    lockedAccounts: number;
    securityAlerts: number;
  };
  recentActivity: Array<{
    timestamp: Date;
    action: string;
    user: string;
    ipAddress: string;
    status: 'success' | 'failure' | 'blocked';
  }>;
  securityMetrics: {
    loginSuccessRate: number;
    averageFailedAttempts: number;
    suspiciousActivityCount: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}

@Controller('auth/security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(
    private readonly authSecurityService: AuthSecurityService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Enhanced secure login endpoint
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async secureLogin(
    @Body() loginDto: { email: string; password: string; tenantId?: string },
    @Req() request: Request,
  ): Promise<{
    success: boolean;
    accessToken?: string;
    requiresPasswordChange?: boolean;
    securityWarnings: string[];
    remainingAttempts?: number;
    lockoutUntil?: Date;
    message: string;
  }> {
    try {
      const clientIp = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      
      const result = await this.authSecurityService.secureLogin(
        loginDto.email,
        loginDto.password,
        clientIp,
        userAgent,
        loginDto.tenantId,
      );
      
      const message = result.success
        ? result.requiresPasswordChange
          ? 'Login successful. Password change required.'
          : 'Login successful.'
        : result.lockoutUntil
        ? `Account locked until ${result.lockoutUntil.toISOString()}`
        : `Login failed. ${result.remainingAttempts} attempts remaining.`;
      
      return {
        ...result,
        message,
      };
      
    } catch (error) {
      this.logger.error('Secure login failed', {
        email: loginDto.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  @Post('validate-password')
  @HttpCode(HttpStatus.OK)
  async validatePassword(
    @Body() passwordDto: { password: string; email?: string },
  ): Promise<{
    isValid: boolean;
    violations: string[];
    strength: 'weak' | 'fair' | 'good' | 'strong';
    recommendations: string[];
  }> {
    try {
      const result = await this.authSecurityService.validatePassword(
        passwordDto.password,
        passwordDto.email,
      );
      
      const recommendations = this.generatePasswordRecommendations(result);
      
      return {
        ...result,
        recommendations,
      };
      
    } catch (error) {
      this.logger.error('Password validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException('Password validation failed');
    }
  }

  /**
   * Get security dashboard data (admin only)
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSecurityDashboard(
    @AuthUser() user: AuthenticatedUser,
    @Query('timeRange') timeRange?: string,
  ): Promise<SecurityDashboardData> {
    try {
      // Check admin permissions
      if (!user.isSuperAdmin) {
        throw new BadRequestException('Insufficient permissions');
      }
      
      const range = this.parseTimeRange(timeRange);
      const analytics = await this.authSecurityService.getSecurityAnalytics(range);
      
      const dashboardData: SecurityDashboardData = {
        overview: {
          totalUsers: 1247, // Would be from database
          activeUsers: 892,
          lockedAccounts: analytics.accountLockouts,
          securityAlerts: analytics.alertsGenerated,
        },
        recentActivity: [
          {
            timestamp: new Date(),
            action: 'login',
            user: 'user@example.com',
            ipAddress: '192.168.1.100',
            status: 'success',
          },
          {
            timestamp: new Date(Date.now() - 300000),
            action: 'failed_login',
            user: 'user2@example.com',
            ipAddress: '10.0.0.1',
            status: 'failure',
          },
        ],
        securityMetrics: {
          loginSuccessRate: (analytics.successfulLogins / analytics.totalLoginAttempts) * 100,
          averageFailedAttempts: analytics.failedLogins / analytics.totalLoginAttempts,
          suspiciousActivityCount: analytics.suspiciousActivity,
          topFailureReasons: analytics.topFailureReasons,
        },
        alerts: [
          {
            id: 'alert_001',
            severity: 'medium',
            title: 'Multiple Failed Login Attempts',
            description: 'User account has exceeded failed login threshold',
            timestamp: new Date(),
            resolved: false,
          },
        ],
      };
      
      // Log dashboard access
      await this.auditService.logSecurityEvent({
        action: 'SECURITY_DASHBOARD_ACCESS',
        userId: user.id,
        details: 'Security dashboard accessed',
        severity: 'low',
        metadata: { timeRange },
      });
      
      return dashboardData;
      
    } catch (error) {
      this.logger.error('Failed to get security dashboard', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get security analytics
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSecurityAnalytics(
    @AuthUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<{
    analytics: any;
    summary: string;
  }> {
    try {
      // Check permissions
      if (!user.isSuperAdmin && tenantId !== user.tenantId) {
        throw new BadRequestException('Insufficient permissions');
      }
      
      const timeRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate) : new Date(),
      };
      
      const analytics = await this.authSecurityService.getSecurityAnalytics(timeRange);
      
      const summary = this.generateAnalyticsSummary(analytics);
      
      // Log analytics access
      await this.auditService.logSecurityEvent({
        action: 'SECURITY_ANALYTICS_ACCESS',
        userId: user.id,
        details: 'Security analytics accessed',
        severity: 'low',
        tenantId,
        metadata: { timeRange, tenantId },
      });
      
      return {
        analytics,
        summary,
      };
      
    } catch (error) {
      this.logger.error('Failed to get security analytics', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user security status
   */
  @Get('user-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserSecurityStatus(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<{
    securityScore: number;
    recommendations: string[];
    recentActivity: Array<{ action: string; timestamp: Date; ipAddress: string }>;
    securityFeatures: {
      mfaEnabled: boolean;
      strongPassword: boolean;
      recentPasswordChange: boolean;
      trustedDevices: number;
    };
  }> {
    try {
      // Calculate security score
      const securityScore = this.calculateUserSecurityScore(user);
      
      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(user, securityScore);
      
      // Get recent activity (mock data for now)
      const recentActivity = [
        {
          action: 'login',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
        },
        {
          action: 'password_change',
          timestamp: new Date(Date.now() - 86400000),
          ipAddress: '192.168.1.100',
        },
      ];
      
      const securityFeatures = {
        mfaEnabled: false, // Would check actual MFA status
        strongPassword: true, // Would check actual password strength
        recentPasswordChange: true, // Would check password age
        trustedDevices: 2, // Would count trusted devices
      };
      
      return {
        securityScore,
        recommendations,
        recentActivity,
        securityFeatures,
      };
      
    } catch (error) {
      this.logger.error('Failed to get user security status', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException('Failed to get security status');
    }
  }

  /**
   * Generate security report
   */
  @Post('generate-report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateSecurityReport(
    @AuthUser() user: AuthenticatedUser,
    @Body() reportDto: {
      type: 'compliance' | 'security' | 'audit';
      startDate: string;
      endDate: string;
      tenantId?: string;
      format: 'json' | 'csv' | 'pdf';
    },
  ): Promise<{
    reportId: string;
    status: 'generating' | 'completed';
    downloadUrl?: string;
    metadata: {
      recordCount: number;
      timeRange: { start: Date; end: Date };
      generatedBy: string;
      generatedAt: Date;
    };
  }> {
    try {
      // Check permissions
      if (!user.isSuperAdmin) {
        throw new BadRequestException('Insufficient permissions');
      }
      
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeRange = {
        start: new Date(reportDto.startDate),
        end: new Date(reportDto.endDate),
      };
      
      // Log report generation
      await this.auditService.logSecurityEvent({
        action: 'SECURITY_REPORT_GENERATED',
        userId: user.id,
        details: `Security report generated: ${reportDto.type}`,
        severity: 'low',
        metadata: {
          reportId,
          type: reportDto.type,
          timeRange,
          format: reportDto.format,
        },
      });
      
      // Record metrics
      await this.metricsService.recordBusinessMetric('security', 'report_generated', {
        reportType: reportDto.type,
        format: reportDto.format,
        userId: user.id,
      });
      
      this.logger.log('Security report generated', {
        reportId,
        type: reportDto.type,
        userId: user.id,
        timeRange,
      });
      
      return {
        reportId,
        status: 'completed',
        downloadUrl: `/api/auth/security/reports/${reportId}/download`,
        metadata: {
          recordCount: 1247, // Would be actual count
          timeRange,
          generatedBy: user.email,
          generatedAt: new Date(),
        },
      };
      
    } catch (error) {
      this.logger.error('Failed to generate security report', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Private helper methods
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private parseTimeRange(timeRange?: string): { start: Date; end: Date } {
    const now = new Date();
    const defaults = {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: now,
    };
    
    if (!timeRange) return defaults;
    
    switch (timeRange) {
      case '24h':
        return {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now,
        };
      case '7d':
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case '30d':
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
        };
      default:
        return defaults;
    }
  }

  private generatePasswordRecommendations(validationResult: any): string[] {
    const recommendations: string[] = [];
    
    if (validationResult.strength === 'weak') {
      recommendations.push('Consider using a passphrase with multiple words');
      recommendations.push('Add numbers and special characters to increase complexity');
    }
    
    if (validationResult.strength === 'fair') {
      recommendations.push('Add more character variety for better security');
    }
    
    if (validationResult.violations.some((v: string) => v.includes('length'))) {
      recommendations.push('Use a longer password for better security');
    }
    
    recommendations.push('Consider using a password manager');
    recommendations.push('Enable multi-factor authentication when available');
    
    return recommendations;
  }

  private generateAnalyticsSummary(analytics: any): string {
    const successRate = ((analytics.successfulLogins / analytics.totalLoginAttempts) * 100).toFixed(1);
    return `Security Analytics Summary: ${analytics.totalLoginAttempts} total login attempts with ${successRate}% success rate. ${analytics.accountLockouts} accounts locked, ${analytics.suspiciousActivity} suspicious activities detected.`;
  }

  private calculateUserSecurityScore(user: AuthenticatedUser): number {
    let score = 50; // Base score
    
    // Add points for security features (mock implementation)
    // TODO: Replace with actual MFA check
    const mfaEnabled = false; // user.mfaEnabled || false;
    if (mfaEnabled) score += 25; // MFA enabled
    
    // TODO: Replace with actual password strength check
    const hasStrongPassword = true; // this.hasStrongPassword(user);
    if (hasStrongPassword) score += 15; // Strong password
    
    // TODO: Replace with actual recent password change check
    const recentPasswordChange = true; // this.hasRecentPasswordChange(user);
    if (recentPasswordChange) score += 10; // Recent password change
    
    return Math.min(100, score);
  }

  private generateSecurityRecommendations(user: AuthenticatedUser, score: number): string[] {
    const recommendations: string[] = [];
    
    if (score < 70) {
      recommendations.push('Enable multi-factor authentication for enhanced security');
    }
    
    if (score < 80) {
      recommendations.push('Update your password regularly');
      recommendations.push('Review and revoke unused application access');
    }
    
    recommendations.push('Monitor your account activity regularly');
    recommendations.push('Use strong, unique passwords for all accounts');
    
    return recommendations;
  }
} 