import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { getClientCache, removeClient } from './get-tenant-client';

@Injectable()
export class EvictionScheduler {
  private readonly logger = new Logger(EvictionScheduler.name);
  private readonly idleThreshold = 1000 * 60 * 30; // 30m

  @Interval(1000 * 60 * 10) // every 10m
  handleEviction() {
    const now = Date.now();
    for (const [tenantId, { client, lastUsed }] of getClientCache().entries()) {
      if (now - lastUsed > this.idleThreshold) {
        client.$disconnect();
        removeClient(tenantId);
        this.logger.debug(`Evicted tenant client ${tenantId}`);
      }
    }
  }
}
