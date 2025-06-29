import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  id: string;
  databaseUrl: string;
}

export const TenantContext = createParamDecorator(
  (_, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
