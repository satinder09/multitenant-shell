import { Module } from '@nestjs/common';
import { PlatformUsersController } from './users/controllers/platform-users.controller';
import { PlatformUsersService } from './users/services/platform-users.service';
import { RbacController } from './rbac/controllers/rbac.controller';
import { PlatformRbacController } from './rbac/controllers/platform-rbac.controller';
import { RbacService } from './rbac/services/rbac.service';
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
  ],
  exports: [
    PlatformUsersService,
    RbacService,
  ],
})
export class PlatformModule {}
