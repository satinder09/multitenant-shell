import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const tenantId = (req as any).tenantId || 'Unknown';
    const userId = (req as any).user?.id || 'Anonymous';
    
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming ${method} ${originalUrl}`, {
      ip,
      userAgent,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId || 'N/A',
    });

    // Capture response details
    const logger = this.logger; // Capture logger reference
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log response with security context
      if (statusCode >= 400) {
        // Log errors with more detail
        logger.warn(`${method} ${originalUrl} - ${statusCode}`, {
          ip,
          userAgent,
          tenantId,
          userId,
          statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
        });
      } else {
        logger.log(`${method} ${originalUrl} - ${statusCode}`, {
          ip,
          tenantId,
          userId,
          statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      return originalSend.call(this, data);
    };

    next();
  }
} 