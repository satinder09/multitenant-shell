import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface RequestWithCsrf extends Request {
  csrfToken?: () => string;
  session?: any;
}

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfProtectionMiddleware.name);
  private readonly tokenSecret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
  
  use(req: RequestWithCsrf, res: Response, next: NextFunction) {
    // Skip CSRF for API routes that use bearer tokens
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const isSafeMethod = safeMethods.includes(req.method);
    const isApiRoute = req.path.startsWith('/api/');
    const hasBearerToken = req.headers.authorization?.startsWith('Bearer ');
    
    // Skip CSRF for API routes with bearer tokens
    if (isApiRoute && hasBearerToken) {
      return next();
    }

    // Always generate CSRF token for all requests (except bearer token API requests)
    const token = this.generateToken(req);
    req.csrfToken = () => token;

    // For state-changing requests, verify the token
    if (!isSafeMethod) {
      const providedToken = this.extractToken(req);
      
      if (!providedToken || !this.verifyToken(req, providedToken)) {
        this.logger.warn('CSRF token validation failed', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException('Invalid CSRF token');
      }
    }

    // Add CSRF token to response headers for client-side access
    res.setHeader('X-CSRF-Token', token);
    
    next();
  }

  private generateToken(req: RequestWithCsrf): string {
    // Create a session-based secret
    const sessionId = this.getSessionId(req);
    const hmac = crypto.createHmac('sha256', this.tokenSecret);
    hmac.update(sessionId);
    return hmac.digest('hex');
  }

  private verifyToken(req: RequestWithCsrf, token: string): boolean {
    const expectedToken = this.generateToken(req);
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  }

  private extractToken(req: Request): string | null {
    // Check multiple locations for the CSRF token
    return req.headers['x-csrf-token'] as string ||
           req.headers['x-xsrf-token'] as string ||
           req.body?._csrf ||
           req.query._csrf as string ||
           null;
  }

  private getSessionId(req: RequestWithCsrf): string {
    // Use session ID if available, otherwise fall back to a combination of IP and User-Agent
    if (req.session?.id) {
      return req.session.id;
    }
    
    // Prioritize forwarded headers for consistent session identification through proxies
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const ip = forwardedFor?.split(',')[0]?.trim() || 
               realIp || 
               req.ip || 
               req.connection.remoteAddress || 
               'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionData = `${ip}-${userAgent}`;
    
    return crypto.createHash('sha256').update(sessionData).digest('hex');
  }
} 