import { Global, Module } from '@nestjs/common';
import { MasterDatabaseService } from './master/master-database.service';
import { TenantDatabaseService } from './tenant/tenant-database.service';

@Global()
@Module({
  providers: [
    MasterDatabaseService,
    TenantDatabaseService,
  ],
  exports: [
    MasterDatabaseService,
    TenantDatabaseService,
  ],
})
export class DatabaseModule {} 