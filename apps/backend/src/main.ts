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

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  const port = parseInt(config.get<string>('PORT') || '4000', 10);
  await app.listen(port);
  console.log(`🚀 Backend listening on http://localhost:${port}`);
}

bootstrap();
