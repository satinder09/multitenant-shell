import { Global, Module } from '@nestjs/common';
import { MasterPrismaService } from './master-prisma.service';  // ensure this file exists

@Global()
@Module({
  providers: [MasterPrismaService],
  exports: [MasterPrismaService],
})
export class MasterPrismaModule {}
