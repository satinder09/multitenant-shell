import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from '../../infrastructure/monitoring/metrics.service';

@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = performance.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const method = request.method;
    const route = request.route?.path || request.url;
    const endpoint = `${method} ${route}`;
    const timerId = this.metricsService.startTimer(`api_request_${method.toLowerCase()}`);

    // Track request metrics
    this.metricsService.incrementCounter('api_requests_total', 1, {
      method,
      route,
      endpoint: endpoint,
    });

    return next.handle().pipe(
      tap((data) => {
        // Success metrics
        const duration = this.metricsService.endTimer(timerId, {
          method,
          route,
          status: response.statusCode?.toString() || '200',
          success: 'true',
        });

        this.recordApiMetrics(request, response, duration, true, data);
      }),
      catchError((error) => {
        // Error metrics
        const duration = this.metricsService.endTimer(timerId, {
          method,
          route,
          status: response.statusCode?.toString() || '500',
          success: 'false',
        });

        this.recordApiMetrics(request, response, duration, false, null, error);
        
        // Re-throw the error
        throw error;
      }),
    );
  }

  private recordApiMetrics(
    request: Request,
    response: Response,
    duration: number,
    success: boolean,
    data?: any,
    error?: Error,
  ) {
    const method = request.method;
    const route = request.route?.path || request.url;
    const statusCode = response.statusCode;
    const userAgent = request.get('User-Agent') || 'unknown';
    const ip = request.ip || 'unknown';

    // Basic API metrics
    this.metricsService.recordHistogram('api_response_time', duration, 'ms', {
      method,
      route,
      status: statusCode?.toString(),
    });

    // Success/error counters
    this.metricsService.incrementCounter('api_responses_total', 1, {
      method,
      route,
      status: statusCode?.toString(),
      success: success.toString(),
    });

    // Error tracking
    if (!success && error) {
      this.metricsService.incrementCounter('api_errors_total', 1, {
        method,
        route,
        error_type: error.constructor.name,
      });

      // Log slow or failed requests
      this.logger.warn(`API Error: ${method} ${route}`, {
        duration,
        statusCode,
        error: error.message,
        ip,
        userAgent: userAgent.substring(0, 100),
      });
    }

    // Slow request tracking
    if (duration > 1000) {
      this.metricsService.incrementCounter('api_slow_requests_total', 1, {
        method,
        route,
      });

      this.logger.warn(`Slow API Request: ${method} ${route} - ${duration}ms`, {
        duration,
        statusCode,
        ip,
        userAgent: userAgent.substring(0, 100),
      });
    }

    // Business metrics for specific endpoints
    this.recordBusinessMetrics(method, route, request, response, data, success);

    // Response size tracking
    const responseSize = this.getResponseSize(response);
    if (responseSize > 0) {
      this.metricsService.recordHistogram('api_response_size', responseSize, 'bytes', {
        method,
        route,
      });
    }
  }

  private recordBusinessMetrics(
    method: string,
    route: string,
    request: Request,
    response: Response,
    data: any,
    success: boolean,
  ) {
    // Authentication metrics
    if (route.includes('/auth/login')) {
      this.metricsService.incrementCounter('auth_login_attempts', 1, {
        success: success.toString(),
      });
    }

    if (route.includes('/auth/register')) {
      this.metricsService.incrementCounter('auth_registrations', 1, {
        success: success.toString(),
      });
    }

    // Tenant metrics
    if (route.includes('/tenant') || request.headers['x-tenant-id']) {
      const tenantId = request.headers['x-tenant-id'] as string;
      this.metricsService.incrementCounter(`tenant_api_requests`, 1, {
        tenant_id: tenantId || 'unknown',
        method,
        success: success.toString(),
      });
    }

    // User activity metrics
    const user = request.user as any;
    if (user?.id) {
      this.metricsService.incrementCounter('user_api_requests', 1, {
        user_id: user.id,
        method,
        success: success.toString(),
      });
    }

    // RBAC metrics
    if (route.includes('/rbac') || route.includes('/permissions')) {
      this.metricsService.incrementCounter('rbac_operations', 1, {
        operation: this.extractRbacOperation(method, route),
        success: success.toString(),
      });
    }
  }

  private extractRbacOperation(method: string, route: string): string {
    if (route.includes('/permissions')) {
      return `permissions_${method.toLowerCase()}`;
    }
    if (route.includes('/roles')) {
      return `roles_${method.toLowerCase()}`;
    }
    return `rbac_${method.toLowerCase()}`;
  }

  private getResponseSize(response: Response): number {
    const contentLength = response.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }
} 