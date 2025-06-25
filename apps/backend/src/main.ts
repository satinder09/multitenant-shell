import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Enable parsing cookies for JwtStrategy
  app.use(cookieParser());

  // Initialize Passport so the 'jwt' strategy is registered
  app.use(passport.initialize());

  const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
  const frontendPort = process.env.FRONTEND_PORT || '3000';
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (
        !origin ||
        origin === `http://${baseDomain}:${frontendPort}` ||
        new RegExp(`^http://[a-zA-Z0-9-]+\\.${baseDomain}:${frontendPort}$`).test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const port = parseInt(config.get<string>('PORT') || '4000', 10);
  await app.listen(port);
  console.log(`🚀 Backend listening on http://${baseDomain}:${port}`);
}

bootstrap();
