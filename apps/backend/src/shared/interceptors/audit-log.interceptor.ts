import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

export interface AuditLogData {
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    const auditData: Partial<AuditLogData> = {
      action: `${className}.${methodName}`,
      resource: request.route?.path || request.url,
      ipAddress: request.ip || request.connection.remoteAddress,
      userAgent: request.get('user-agent'),
      timestamp: new Date(),
      userId: (request as any).user?.id,
      tenantId: (request as any).tenant?.id,
    };

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.logAuditEvent({
            ...auditData,
            success: true,
            details: this.sanitizeResponse(response),
          } as AuditLogData);
        },
        error: (error) => {
          this.logAuditEvent({
            ...auditData,
            success: false,
            error: error.message,
          } as AuditLogData);
        },
      })
    );
  }

  private logAuditEvent(data: AuditLogData): void {
    // Log to structured logger
    this.logger.log('Audit Event', {
      ...data,
      // Remove sensitive data
      details: data.details ? this.sanitizeData(data.details) : undefined,
    });

    // TODO: In production, also send to audit database or service
    // await this.auditService.log(data);
  }

  private sanitizeResponse(response: any): Record<string, unknown> {
    if (!response || typeof response !== 'object') {
      return { responseType: typeof response };
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'passwordHash', 'secret', 'token', 'accessToken'];
    const sanitized = { ...response };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'passwordHash', 'secret', 'token', 'accessToken'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// Decorator
export const AuditLog = () => 
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Add metadata to mark this method for auditing
    Reflect.defineMetadata('audit', true, descriptor.value);
  }; 