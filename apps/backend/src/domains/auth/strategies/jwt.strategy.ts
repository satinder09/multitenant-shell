import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required but not configured. Please set JWT_SECRET environment variable.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.Authentication,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name: string;
    isSuperAdmin?: boolean;
    tenantContext?: string;
    accessType?: string;
    impersonatedUserId?: string;
    impersonatedUserEmail?: string;
    impersonatedUserName?: string;
    expiresAt?: string;
    impersonationSessionId?: string;
  }) {
    // This is the user object that will be attached to the request
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isSuperAdmin: payload.isSuperAdmin,
      tenantId: payload.tenantContext, // Pass tenant context as tenantId
      accessType: payload.accessType,
      impersonatedUserId: payload.impersonatedUserId,
      impersonatedUserEmail: payload.impersonatedUserEmail,
      impersonatedUserName: payload.impersonatedUserName,
      expiresAt: payload.expiresAt,
      impersonationSessionId: payload.impersonationSessionId,
    };

    return user;
  }
}
