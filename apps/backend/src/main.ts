import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

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

  // Swagger/OpenAPI Configuration for Tenant API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multitenant Shell - Tenant API')
    .setDescription('API documentation for tenant-side operations in the multitenant shell application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('Authentication', {
      type: 'apiKey',
      in: 'cookie',
      name: 'Authentication',
      description: 'JWT token stored in httpOnly cookie',
    })
    .addServer('http://localhost:4000', 'Local development server')
    .addServer('http://tenant.lvh.me:4000', 'Local tenant subdomain')
    .addTag('Authentication', 'Tenant authentication endpoints')
    .addTag('Tenants', 'Tenant management operations')
    .addTag('Tenant Access', 'Tenant access control and impersonation')
    .addTag('Search', 'Universal search functionality')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    include: [], // We'll specify modules manually
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Filter out platform-only endpoints, keeping only tenant-relevant ones
  const tenantDocument = {
    ...document,
    paths: Object.keys(document.paths).reduce((acc, path) => {
      // Include tenant-related endpoints only
      if (
        path.includes('/auth') ||
        path.includes('/tenants') ||
        path.includes('/tenant-access') ||
        path.includes('/search') ||
        path.includes('/health') // Include health for tenant monitoring
      ) {
        // Exclude platform-specific endpoints
        if (
          !path.includes('/platform/') &&
          !path.includes('/platform-rbac') &&
          !path.includes('/platform/admin') &&
          !path.includes('/metrics') &&
          !path.includes('/performance')
        ) {
          acc[path] = document.paths[path];
        }
      }
      return acc;
    }, {} as any),
  };

  SwaggerModule.setup('api-docs', app, tenantDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Multitenant Shell - Tenant API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f8fafc; border: 1px solid #e2e8f0; }
    `,
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

  const port = parseInt(config.get<string>('PORT') || '3000', 10);
  await app.listen(port);
  logger.log(`🚀 Backend listening on http://${baseDomain}:${port}`);
  logger.log(`🔌 WebSocket server ready on ws://${baseDomain}:${port}`);
  logger.log(`📚 Swagger UI available at http://${baseDomain}:${port}/api-docs`);
  logger.log(`🔒 Security middleware enabled`);
  logger.log(`🌐 CORS configured for ${baseDomain}`);
}

bootstrap();
