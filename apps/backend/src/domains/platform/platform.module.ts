import { Module } from '@nestjs/common';
import { PlatformUsersController } from './users/controllers/platform-users.controller';
import { PlatformUsersService } from './users/services/platform-users.service';
import { RbacController } from './rbac/controllers/rbac.controller';
import { PlatformRbacController } from './rbac/controllers/platform-rbac.controller';
import { RbacService } from './rbac/services/rbac.service';
import { RolesGuard } from './rbac/roles.guard';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PlatformUsersController,
    RbacController,
    PlatformRbacController,
  ],
  providers: [
    PlatformUsersService,
    RbacService,
    RolesGuard,
  ],
  exports: [
    PlatformUsersService,
    RbacService,
    RolesGuard,
  ],
})
export class PlatformModule {}
