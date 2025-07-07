import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // Global validation pipe with security best practices
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    forbidNonWhitelisted: true,   // Throw error for unknown properties
    transform: true,              // Auto-transform types
    disableErrorMessages: config.get('NODE_ENV') === 'production', // Hide error details in production
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Enable parsing cookies for JwtStrategy
  app.use(cookieParser());

  // Initialize Passport so the 'jwt' strategy is registered
  app.use(passport.initialize());

  // Request logging middleware
  app.use((req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      logger.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      return originalSend.call(this, data);
    };
    
    next();
  });

  const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
  const frontendPort = process.env.FRONTEND_PORT || '3000';
  
  // Enhanced CORS configuration
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        `http://${baseDomain}:${frontendPort}`,
        `https://${baseDomain}`,
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (
        !origin || // Allow same-origin requests
        allowedOrigins.some(allowed => origin === allowed) ||
        new RegExp(`^http://[a-zA-Z0-9-]+\\.${baseDomain}:${frontendPort}$`).test(origin) ||
        new RegExp(`^https://[a-zA-Z0-9-]+\\.${baseDomain}$`).test(origin)
      ) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-host'],
  });

  const port = parseInt(config.get<string>('PORT') || '4000', 10);
  await app.listen(port);
  logger.log(`🚀 Backend listening on http://${baseDomain}:${port}`);
  logger.log(`🔒 Security middleware enabled`);
  logger.log(`🌐 CORS configured for ${baseDomain}`);
}

bootstrap();
