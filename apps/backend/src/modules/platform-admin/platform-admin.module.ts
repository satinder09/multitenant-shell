import { Module } from '@nestjs/common';
import { PlatformUsersController } from './users/platform-users.controller';
import { PlatformUsersService } from './users/platform-users.service';
import { MasterPrismaModule } from '../master-prisma/master-prisma.module';

@Module({
  imports: [MasterPrismaModule],
  controllers: [PlatformUsersController],
  providers: [PlatformUsersService],
  exports: [PlatformUsersService],
})
export class PlatformAdminModule {} 