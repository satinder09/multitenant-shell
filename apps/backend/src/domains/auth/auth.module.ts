import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { TenantAccessController } from './controllers/tenant-access.controller';
import { SecurityController } from './controllers/security.controller';
import { PlatformTwoFactorController } from './controllers/platform-two-factor.controller';
import { TenantTwoFactorController } from './controllers/tenant-two-factor.controller';
import { AuthService } from './services/auth.service';
import { AuthSecurityService } from './services/auth-security.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { TwoFactorMethodRegistryService } from './services/two-factor-method-registry.service';
import { BackupCodesService } from './services/backup-codes.service';
import { TOTPProvider } from './providers/totp.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { MetricsService } from '../../infrastructure/monitoring/metrics.service';
import { JwtAuthGuard, AuthorizationGuard } from '../../shared/guards';
import { TwoFactorDatabaseService } from './services/two-factor-database.service';
import { TwoFactorService } from './services/two-factor.service';
import { TwoFactorLoginService } from './services/two-factor-login.service';

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
      global: true,
    }),
    DatabaseModule,
    TenantModule,
  ],
  controllers: [AuthController, TenantAccessController, SecurityController, PlatformTwoFactorController, TenantTwoFactorController],
  providers: [
    AuthService,
    AuthSecurityService,
    TwoFactorAuthService,
    TwoFactorMethodRegistryService,
    BackupCodesService,
    TOTPProvider,
    JwtStrategy,
    JwtAuthGuard,
    AuthorizationGuard,
    AuditService,
    MetricsService,
    TwoFactorDatabaseService,
    TwoFactorService,
    TwoFactorLoginService,
    {
      provide: 'REGISTER_2FA_PROVIDERS',
      useFactory: (registry: TwoFactorMethodRegistryService, totpProvider: TOTPProvider) => {
        registry.registerProvider(totpProvider);
        return registry;
      },
      inject: [TwoFactorMethodRegistryService, TOTPProvider],
    },
  ],
  exports: [
    AuthService,
    TwoFactorService,
    TwoFactorDatabaseService,
    TOTPProvider,
    TwoFactorAuthService,
    TwoFactorMethodRegistryService,
    AuthSecurityService,
    BackupCodesService,
    TwoFactorLoginService,
    JwtAuthGuard,
    AuthorizationGuard,
  ],
})
export class AuthModule {} 