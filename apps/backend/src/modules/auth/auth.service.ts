// apps/backend/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MasterPrismaService } from '../master-prisma/master-prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from './interfaces/login-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async validateMasterUser(email: string, pass: string) {
    const user = await this.masterPrisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...safe } = user;
      return safe;
    }
    return null;
  }

  async login(
    dto: Omit<LoginDto, 'tenantId'>,
    tenantId?: string,
  ): Promise<LoginResponse> {
    const user = await this.validateMasterUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: { [key: string]: any } = {
      sub: user.id,
      isSuperAdmin: user.isSuperAdmin,
      email: user.email,
      name: user.name,
    };

    // If logging in via a tenant subdomain, check permissions
    if (tenantId) {
      if (!user.isSuperAdmin) {
        const permission =
          await this.masterPrisma.tenantUserPermission.findUnique({
            where: {
              userId_tenantId: {
                userId: user.id,
                tenantId: tenantId,
              },
            },
          });

        if (!permission) {
          throw new ForbiddenException(
            'You do not have permission to access this tenant.',
          );
        }
      }
      // If user is super admin or has explicit permission, add tenant context
      payload.tenantContext = tenantId;
    }

    const accessToken = this.jwt.sign(payload);
    return { accessToken };
  }
}
