import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, AuthorizationGuard, RequireAdmin } from '../../../shared/guards';
import { AuthService } from '../services/auth.service';
import { AdminRateLimit, AuthRateLimit, ApiRateLimit } from '../../../shared/decorators/multitenant-rate-limit.decorator';

export interface TenantAccessOption {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

@Controller('tenant-access')
export class TenantAccessController {
  constructor(private readonly authService: AuthService) {}

  @Get('options')
  @ApiRateLimit()
  @UseGuards(JwtAuthGuard)
  async getTenantAccessOptions(@Req() req: Request): Promise<TenantAccessOption[]> {
    const user = req.user as any;
    return this.authService.getTenantAccessOptions(user.id);
  }

  @Post('secure-login')
  @AuthRateLimit()
  @UseGuards(JwtAuthGuard)
  async secureLoginToTenant(
    @Body() dto: {
      tenantId: string;
      duration: number;
      reason: string;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectUrl: string }> {
    const user = req.user as any;
    
    console.log('🔐 Secure login request:', {
      userId: user.id,
      tenantId: dto.tenantId,
      duration: dto.duration,
      reason: dto.reason
    });
    
    const { accessToken, redirectUrl } = await this.authService.secureLoginToTenant(
      user.id,
      dto.tenantId,
      dto.duration,
      dto.reason,
      req.ip,
      req.get('User-Agent')
    );

    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    
    console.log('🔐 Setting secure login cookie:', {
      maxAge: dto.duration * 60 * 1000,
      redirectUrl
    });
    
    // Instead of setting cross-domain cookie, include token in redirect URL
    // The tenant frontend will set the cookie on its own domain
    const redirectUrlWithToken = `${redirectUrl}?secureLoginToken=${encodeURIComponent(accessToken)}`;

    console.log('🔐 Secure login successful, redirectUrl:', redirectUrl);
    return { redirectUrl: redirectUrlWithToken };
  }

  @Post('impersonate')
  @AdminRateLimit()
  @RequireAdmin()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  async startImpersonation(
    @Body() dto: {
      tenantId: string;
      targetUserId: string;
      reason: string;
      duration: number;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectUrl: string }> {
    const user = req.user as any;
    
    const { accessToken, redirectUrl } = await this.authService.startImpersonation(
      user,
      dto.tenantId,
      dto.targetUserId,
      dto.reason,
      dto.duration,
      req.ip,
      req.get('User-Agent')
    );

    const redirectUrlWithToken = `${redirectUrl}?impersonateToken=${encodeURIComponent(accessToken)}`;

    console.log('🎭 Impersonation started successfully:', {
      redirectUrl: redirectUrlWithToken
    });
    return { redirectUrl: redirectUrlWithToken };
  }

  @Post('end-impersonation')
  @AdminRateLimit()
  @RequireAdmin()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  async endImpersonation(
    @Body() dto: { sessionId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectUrl: string }> {
    const user = req.user as any;

    console.log('🔚 Ending impersonation session:', {
      userId: user.id,
      sessionId: dto.sessionId
    });

    // Use sessionId from body if provided, otherwise fall back to user's current session
    const sessionId = dto.sessionId || user.impersonationSessionId;

    if (sessionId && user.accessType === 'impersonation') {
      const result = await this.authService.endImpersonation(
        sessionId,
        user.id
      );

      const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
      const frontendPort = process.env.FRONTEND_PORT || '3000';
      
      // Handle both string and object return types
      const redirectUrl = typeof result === 'string' ? result : result.redirectUrl;
      const finalRedirectUrl = redirectUrl || `http://platform.${baseDomain}:${frontendPort}`;
      
      console.log('🔚 Impersonation ended successfully, redirectUrl:', finalRedirectUrl);
      return { redirectUrl: finalRedirectUrl };
    } else {
      throw new ForbiddenException('No active impersonation session found');
    }
  }

  @Get('tenants/:tenantId/users')
  @AdminRateLimit()
  @RequireAdmin()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  async getTenantUsers(
    @Param('tenantId') tenantId: string,
    @Req() req: Request,
  ): Promise<any[]> {
    const user = req.user as any;

    // Validate user can impersonate in this tenant
    const hasAccess = await this.authService.validateImpersonationPermission(
      user.id,
      tenantId
    );

    if (!hasAccess) {
      throw new ForbiddenException('Cannot impersonate users in this tenant.');
    }

    return this.authService.getTenantUsers(tenantId);
  }
} 