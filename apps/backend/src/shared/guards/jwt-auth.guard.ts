import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// JWT payload interface
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  tenantContext?: string;
  accessType?: 'direct_access' | 'secure_login' | 'impersonation';
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  impersonatedUserName?: string;
  expiresAt?: string;
  impersonationSessionId?: string;
  iat?: number;
  exp?: number;
  roles?: string[];
  permissions?: string[];
  sessionId?: string;
}

// Authenticated user interface (as returned by JWT strategy)
export interface AuthenticatedUser {
  id: string;  // Mapped from payload.sub
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  tenantId?: string;  // Mapped from payload.tenantContext
  accessType?: 'direct_access' | 'secure_login' | 'impersonation';
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  impersonatedUserName?: string;
  expiresAt?: string;
  impersonationSessionId?: string;
  roles?: string[];
  permissions?: string[];
  // Extended properties from JWT validation
  isTokenValid?: boolean;
  isSessionValid?: boolean;
  tokenExpiresAt?: Date;
  lastValidated?: Date;
  // Original JWT payload properties (if needed)
  sub?: string;
  exp?: number;
  iat?: number;
}

// Metadata keys for guard configuration
export const SKIP_AUTH_KEY = 'skipAuth';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if authentication should be skipped
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    try {
      // Perform standard JWT validation
      const isValid = await super.canActivate(context);
      if (!isValid) {
        return false;
      }

      // Additional validation
      await this.validateToken(context);
      
      return true;
    } catch (error) {
      this.logAuthenticationFailure(request, error);
      throw error;
    }
  }

  private async validateToken(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    // Validate token structure
    await this.validateTokenStructure(user, request);

    // Validate session
    await this.validateSession(user);

    // Validate tenant context if applicable
    await this.validateTenantContext(user, request);

    // Update user object with validation metadata
    this.enrichUserObject(user);
  }

  private async validateTokenStructure(user: AuthenticatedUser, request: Request): Promise<void> {
    // Validate required fields (JWT strategy maps sub to id)
    if (!user.id || !user.email) {
      throw new UnauthorizedException('Invalid token structure: missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new UnauthorizedException('Invalid token structure: malformed email');
    }

    // Validate access type
    if (user.accessType && !['direct_access', 'secure_login', 'impersonation'].includes(user.accessType)) {
      throw new UnauthorizedException('Invalid access type in token');
    }

    // Note: Token expiration is handled by passport-jwt strategy
    // JWT claims like exp and iat are validated by the strategy before this guard runs
  }

  private async validateSession(user: AuthenticatedUser): Promise<void> {
    // For impersonation sessions, validate the session is still active
    if (user.accessType === 'impersonation' && user.impersonationSessionId) {
      if (!user.impersonatedUserId) {
        throw new UnauthorizedException('Invalid impersonation session: missing target user');
      }
    }

    // For secure login sessions, validate expiration
    if (user.accessType === 'secure_login' && user.expiresAt) {
      const expiresAt = new Date(user.expiresAt);
      if (Date.now() >= expiresAt.getTime()) {
        throw new UnauthorizedException('Secure login session has expired');
      }
    }

    // Check for custom expiration
    if (user.expiresAt) {
      const expiresAt = new Date(user.expiresAt);
      if (Date.now() >= expiresAt.getTime()) {
        throw new UnauthorizedException('Session has expired');
      }
    }
  }

  private async validateTenantContext(user: AuthenticatedUser, request: Request): Promise<void> {
    // If user has tenant context in JWT, validate it matches the request context
    // JWT strategy maps tenantContext to tenantId
    if (user.tenantId) {
      const requestTenant = (request as any).tenant;
      
      if (requestTenant && requestTenant.id !== user.tenantId) {
        this.logger.warn(`Tenant context mismatch`, {
          userId: user.id,
          jwtTenant: user.tenantId,
          requestTenant: requestTenant.id,
          path: request.path,
        });
        
        // For super admin, allow cross-tenant access but log it
        if (!user.isSuperAdmin) {
          throw new UnauthorizedException('Tenant context mismatch');
        }
      }
    }
  }

  private enrichUserObject(user: AuthenticatedUser): void {
    // Add validation metadata (id is already set by JWT strategy)
    user.isTokenValid = true;
    user.isSessionValid = true;
    user.lastValidated = new Date();
  }

  private logAuthenticationFailure(request: Request, error: any): void {
    this.logger.warn('JWT authentication failed', {
      path: request.path,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Override handleRequest to provide better error handling
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      } else {
        throw new UnauthorizedException('Authentication failed');
      }
    }
    
    return user;
  }
} 