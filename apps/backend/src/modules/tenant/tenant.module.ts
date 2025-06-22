import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';               // ensure this file exists
import { MasterPrismaModule } from '../master-prisma/master-prisma.module';

@Module({
  imports: [MasterPrismaModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
