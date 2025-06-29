import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// In-memory store (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      'rateLimit',
      context.getHandler()
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request);
    const now = Date.now();

    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      requestCounts.set(key, {
        count: 1,
        resetTime: now + rateLimitOptions.windowMs,
      });
      return true;
    }

    if (record.count >= rateLimitOptions.maxRequests) {
      throw new HttpException(
        rateLimitOptions.message || 'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: Request): string {
    // Use IP + User-Agent for fingerprinting
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }
}

// Decorator
export const RateLimit = (options: RateLimitOptions) =>
  Reflect.metadata('rateLimit', options); 