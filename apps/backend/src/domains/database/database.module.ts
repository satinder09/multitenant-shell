import { Global, Module } from '@nestjs/common';
import { MasterDatabaseService } from './master/master-database.service';
import { TenantDatabaseModule } from './tenant/tenant-database.module';

@Global()
@Module({
  imports: [
    TenantDatabaseModule.forRoot(),
  ],
  providers: [
    MasterDatabaseService,
  ],
  exports: [
    MasterDatabaseService,
    TenantDatabaseModule,
  ],
})
export class DatabaseModule {} 