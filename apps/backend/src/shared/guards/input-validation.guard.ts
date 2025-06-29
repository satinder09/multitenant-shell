import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class InputValidationGuard implements CanActivate {
  private readonly logger = new Logger(InputValidationGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Validate and sanitize request body
      if (request.body) {
        request.body = this.sanitizeObject(request.body);
        this.validateRequestSize(request.body);
      }

      // Validate and sanitize query parameters
      if (request.query) {
        request.query = this.sanitizeObject(request.query);
      }

      // Validate and sanitize path parameters
      if (request.params) {
        request.params = this.sanitizeObject(request.params);
      }

      // Additional security checks
      this.performSecurityChecks(request);

      return true;
    } catch (error) {
      this.logger.warn('Input validation failed', {
        ip: request.ip,
        path: request.path,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Invalid input data');
    }
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    return str
      // Remove null bytes
      .replace(/\x00/g, '')
      // Remove or escape potentially dangerous characters
      .replace(/[<>]/g, '')
      // Limit length to prevent DoS
      .substring(0, 10000)
      // Trim whitespace
      .trim();
  }

  private validateRequestSize(data: any): void {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const maxSizeInBytes = 1024 * 1024; // 1MB

    if (sizeInBytes > maxSizeInBytes) {
      throw new BadRequestException('Request payload too large');
    }
  }

  private performSecurityChecks(request: Request): void {
    // Check for suspicious patterns in URL
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /\/\//,  // Double slashes
      /<script/i,  // Script injection
      /javascript:/i,  // JavaScript protocol
      /data:/i,  // Data URLs in unexpected places
    ];

    const url = request.url;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        throw new BadRequestException('Suspicious request pattern detected');
      }
    }

    // Check user agent for known bad bots (basic protection)
    const userAgent = request.headers['user-agent'] || '';
    const suspiciousAgents = [
      'sqlmap',
      'nikto',
      'gobuster',
      'dirbuster',
      'masscan',
    ];

    for (const agent of suspiciousAgents) {
      if (userAgent.toLowerCase().includes(agent)) {
        throw new BadRequestException('Blocked user agent');
      }
    }

    // Check for common injection patterns in headers
    const headerValues = Object.values(request.headers).join(' ');
    const injectionPatterns = [
      /\bunion\s+select/i,
      /\bor\s+1\s*=\s*1/i,
      /\bdrop\s+table/i,
      /\binsert\s+into/i,
      /\bupdate\s+set/i,
      /\bdelete\s+from/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(headerValues)) {
        throw new BadRequestException('Suspicious header content detected');
      }
    }
  }
} 