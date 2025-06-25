import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RolesGuard } from './roles.guard';
import { PrismaTenantModule } from '../prisma-tenant/prisma-tenant.module';
import { PlatformRbacController } from './platform-rbac.controller';

@Module({
  imports: [PrismaTenantModule],
  controllers: [RbacController, PlatformRbacController],
  providers: [RbacService, RolesGuard],
  exports: [RbacService, RolesGuard],
})
export class RbacModule {} 