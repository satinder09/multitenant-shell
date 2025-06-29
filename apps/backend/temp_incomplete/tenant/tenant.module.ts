import { Module } from '@nestjs/common';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
