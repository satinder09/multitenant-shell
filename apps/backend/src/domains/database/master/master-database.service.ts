import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as MasterPrismaClient } from '../../../../generated/master-prisma';

@Injectable()
export class MasterDatabaseService extends MasterPrismaClient implements OnModuleDestroy {
  constructor() {
    super();
    this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}