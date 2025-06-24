import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { TenantAccessController } from './tenant-access.controller';
import { AuthService }    from './auth.service';
import { JwtStrategy }    from './jwt.strategy';
import { MasterPrismaModule } from '../master-prisma/master-prisma.module';
import { PrismaTenantModule } from '../prisma-tenant/prisma-tenant.module';

@Module({
  imports: [
    // provides ConfigService
    ConfigModule,
    // registers passport, setting 'jwt' as the default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // configures JwtModule so JwtService and strategy get the secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cs.get<string>('JWT_EXPIRES_IN') || '1h' },
      }),
      inject: [ConfigService],
    }),
    MasterPrismaModule,
    PrismaTenantModule,
  ],
  controllers: [AuthController, TenantAccessController],
  providers: [
    AuthService,
    JwtStrategy,        // <-- register the JWT strategy provider
  ],
  exports: [AuthService],
})
export class AuthModule {}
