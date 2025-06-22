import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.Authentication,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name: string;
    isSuperAdmin?: boolean;
    tenantContext?: string;
  }) {
    // This is the user object that will be attached to the request
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isSuperAdmin: payload.isSuperAdmin,
      tenantId: payload.tenantContext, // Pass tenant context as tenantId
    };

    return user;
  }
}
