import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { TenantAccessController } from './controllers/tenant-access.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cs.get<string>('JWT_EXPIRES_IN') || '1h' },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
  ],
  controllers: [AuthController, TenantAccessController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {} 