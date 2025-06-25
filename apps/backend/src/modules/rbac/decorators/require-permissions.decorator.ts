import { SetMetadata } from '@nestjs/common';
import { RequiredPermissions } from '../roles.guard';

export const RequirePermissions = (permissions: string[], requireAll = false) =>
  SetMetadata('permissions', { permissions, requireAll } as RequiredPermissions); 