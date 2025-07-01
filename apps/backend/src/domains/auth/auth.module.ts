import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { TenantAccessController } from './controllers/tenant-access.controller';
import { SecurityController } from './controllers/security.controller';
import { AuthService } from './services/auth.service';
import { AuthSecurityService } from './services/auth-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { MetricsService } from '../../infrastructure/monitoring/metrics.service';
import { JwtAuthGuard, AuthorizationGuard } from '../../shared/guards';

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
    TenantModule,
  ],
  controllers: [AuthController, TenantAccessController, SecurityController],
  providers: [
    AuthService,
    AuthSecurityService,
    JwtStrategy,
    JwtAuthGuard,
    AuthorizationGuard,
    AuditService,
    MetricsService,
  ],
  exports: [AuthService],
})
export class AuthModule {} 