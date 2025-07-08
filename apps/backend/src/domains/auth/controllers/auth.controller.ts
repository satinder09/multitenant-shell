// apps/backend/src/domains/auth/controllers/auth.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseInterceptors,
  ClassSerializerInterceptor,
  Ip,
  Headers,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiCookieAuth,
  ApiBearerAuth,
  ApiHeader
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { TenantContext, GetTenantContext } from '../../../shared/types/tenant-context';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../../tenant/services/tenant.service';
import { LoginDto } from '../dto/login.dto';
import { Verify2FALoginDto } from '../dto/verify-2fa-login.dto';
import { LoginResponse, TwoFactorLoginResponse } from '../interfaces/login-response.interface';
import { JwtAuthGuard, SkipAuth } from '../../../shared/guards';
import { AuthRateLimit, SkipRateLimit } from '../../../shared/decorators/multitenant-rate-limit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('login')
  @ApiOperation({ 
    summary: 'Login to tenant',
    description: 'Authenticates user and returns JWT token or 2FA requirement. Can be used for both platform and tenant login.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'User login credentials'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful or 2FA required',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token (if 2FA not required)' },
        requiresTwoFactor: { type: 'boolean', description: 'Whether 2FA is required' },
        twoFactorSessionId: { type: 'string', description: 'Temporary session ID for 2FA verification' },
        availableMethods: { type: 'array', items: { type: 'string' }, description: 'Available 2FA methods' },
        message: { type: 'string', description: 'Response message' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiHeader({
    name: 'x-forwarded-host',
    description: 'Tenant subdomain for tenant-specific login',
    required: false
  })
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @GetTenantContext() tenant: { id: string; databaseUrl: string } | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    let tenantId: string | undefined = tenant?.id;
    
    // If tenantSubdomain is provided in the request body, resolve it to tenant ID
    if (dto.tenantSubdomain && !tenantId) {
      try {
        const tenantInfo = await this.tenantService.findBySubdomain(dto.tenantSubdomain);
        tenantId = tenantInfo.id;
        // Only log in debug mode
        if (process.env.DEBUG_AUTH) {
          console.log(`[AUTH] Resolved tenant subdomain "${dto.tenantSubdomain}" to ID: ${tenantId}`);
        }
      } catch (error) {
        // This is an actual error, so we should log it
        console.error(`[AUTH] Failed to resolve tenant subdomain "${dto.tenantSubdomain}":`, error);
        throw new UnauthorizedException(`Invalid tenant: ${dto.tenantSubdomain}`);
      }
    }
    
    // Only log login attempts in debug mode
    if (process.env.DEBUG_AUTH) {
      console.log(`[AUTH] Login attempt - Email: ${dto.email}, TenantID: ${tenantId || 'platform'}`);
    }
    const result = await this.authService.login(dto, tenantId);

    // Only set cookie if we have an access token (no 2FA required)
    if (result.accessToken) {
      res.cookie('Authentication', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60, // 1h in ms
      });
    }

    return result;
  }

  @Post('verify-2fa-login')
  @ApiOperation({ 
    summary: 'Complete 2FA verification during login',
    description: 'Verifies 2FA code and completes the login process.'
  })
  @ApiBody({ 
    type: Verify2FALoginDto,
    description: '2FA verification details'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login completed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        message: { type: 'string', description: 'Success message' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid session or 2FA code' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  async verify2FALogin(
    @Body() dto: Verify2FALoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TwoFactorLoginResponse> {
    // Only log 2FA attempts in debug mode
    if (process.env.DEBUG_AUTH) {
      console.log(`[AUTH] 2FA verification attempt - Session: ${dto.sessionId}, Type: ${dto.type || 'totp'}`);
    }
    
    const result = await this.authService.complete2FALogin(dto.sessionId, dto.code, dto.type);

    // Set authentication cookie
    res.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1h in ms
    });

    return result;
  }

  @Get('me')
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Returns the currently authenticated user information.'
  })
  @ApiCookieAuth('Authentication')
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 200, 
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string' },
        tenantId: { type: 'string', nullable: true }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @SkipRateLimit() // /me endpoint used frequently for auth verification
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  me(@Req() req: Request) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  @Get('csrf-token')
  @ApiOperation({ 
    summary: 'Get CSRF token',
    description: 'Returns a CSRF token for secure form submissions.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'CSRF token',
    schema: {
      type: 'object',
      properties: {
        csrfToken: { type: 'string', nullable: true }
      }
    }
  })
  @SkipRateLimit() // CSRF tokens are fetched frequently for security
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // The CSRF token is generated by the middleware and available as req.csrfToken()
    const token = (req as any).csrfToken?.();
    if (token) {
      res.setHeader('X-CSRF-Token', token);
      return { csrfToken: token };
    }
    return { csrfToken: null };
  }

  @Post('logout')
  @ApiOperation({ 
    summary: 'Logout user',
    description: 'Logs out the current user and clears the authentication cookie.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 429, description: 'Too many logout attempts' })
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    // Only log cookie clearing in debug mode
    if (process.env.DEBUG_AUTH) {
      console.log(`Clearing Authentication cookie for .${baseDomain}, ${baseDomain}, /`);
    }
    res.clearCookie('Authentication', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: `.${baseDomain}`,
      path: '/',
    });
    res.clearCookie('Authentication', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: baseDomain,
      path: '/',
    });
    res.clearCookie('Authentication', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('Authentication');
    return { success: true };
  }
}
