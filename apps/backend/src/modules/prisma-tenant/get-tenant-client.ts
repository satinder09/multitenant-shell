import { PrismaClient as TenantPrismaClient } from '../../../generated/tenant-prisma';
import { TenantContext } from './tenant-context';

// Cache for tenant clients
const clientCache = new Map<string, { client: TenantPrismaClient; lastUsed: number }>();

/** Get or create a PrismaClient for this tenant */
export function getTenantClient(ctx: TenantContext): TenantPrismaClient {
  const { id, databaseUrl } = ctx;
  if (!clientCache.has(id)) {
    const client = new TenantPrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    client.$connect();
    clientCache.set(id, { client, lastUsed: Date.now() });
  } else {
    clientCache.get(id)!.lastUsed = Date.now();
  }
  return clientCache.get(id)!.client;
}

/** Return the internal client cache map */
export function getClientCache() {
  return clientCache;
}

/** Remove & disconnect a tenant client */
export function removeClient(id: string) {
  const entry = clientCache.get(id);
  if (entry) {
    entry.client.$disconnect();
    clientCache.delete(id);
  }
}
