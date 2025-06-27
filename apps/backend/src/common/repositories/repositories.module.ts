// Repositories module for dependency injection
// Configures all repository providers and exports

import { Module } from '@nestjs/common';
import { MasterPrismaModule } from '../../modules/master-prisma/master-prisma.module';

// Repository implementations
import { TenantRepository, ITenantRepository } from './tenant.repository';
import { UserRepository, IUserRepository } from './user.repository';

// Repository tokens
import { REPOSITORY_TOKENS } from './index';

@Module({
  imports: [MasterPrismaModule],
  providers: [
    // Tenant Repository
    {
      provide: REPOSITORY_TOKENS.TENANT_REPOSITORY,
      useClass: TenantRepository,
    },
    TenantRepository, // Also provide the concrete class for direct injection
    
    // User Repository
    {
      provide: REPOSITORY_TOKENS.USER_REPOSITORY,
      useClass: UserRepository,
    },
    UserRepository, // Also provide the concrete class for direct injection
  ],
  exports: [
    REPOSITORY_TOKENS.TENANT_REPOSITORY,
    REPOSITORY_TOKENS.USER_REPOSITORY,
    TenantRepository,
    UserRepository,
  ],
})
export class RepositoriesModule {} 