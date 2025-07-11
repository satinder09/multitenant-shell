import { Module } from '@nestjs/common';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../../infrastructure/websocket/websocket.module';

@Module({
  imports: [DatabaseModule, WebSocketModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
