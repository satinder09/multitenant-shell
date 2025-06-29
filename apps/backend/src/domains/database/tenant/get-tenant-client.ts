import { PrismaClient as TenantPrismaClient } from '../../../../generated/tenant-prisma';
import { TenantContext } from '../../../shared/types/tenant-context';
import { Logger } from '@nestjs/common';

const logger = new Logger('TenantClientManager');

interface CachedClient {
  client: TenantPrismaClient;
  lastUsed: number;
  connected: boolean;
}

// Cache for tenant clients with connection status tracking
const clientCache = new Map<string, CachedClient>();

// Configuration
const CACHE_CONFIG = {
  maxIdleTime: 30 * 60 * 1000, // 30 minutes
  maxClients: 50, // Maximum cached clients
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
};

/** Connect with retry logic */
async function connectWithRetry(client: TenantPrismaClient, tenantId: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await Promise.race([
        client.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
      logger.debug(`Successfully connected to tenant database: ${tenantId}`);
      return;
    } catch (error) {
      logger.warn(`Connection attempt ${attempt}/${maxRetries} failed for tenant ${tenantId}:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

/** Mark client as disconnected */
function markClientDisconnected(tenantId: string): void {
  const cached = clientCache.get(tenantId);
  if (cached) {
    cached.connected = false;
    logger.debug(`Marked client as disconnected for tenant: ${tenantId}`);
  }
}

/** Clean up a specific client */
async function cleanupClient(tenantId: string): Promise<void> {
  const cached = clientCache.get(tenantId);
  if (cached) {
    try {
      await cached.client.$disconnect();
      logger.debug(`Disconnected client for tenant: ${tenantId}`);
    } catch (error) {
      logger.warn(`Error disconnecting client for tenant ${tenantId}:`, error);
    }
    clientCache.delete(tenantId);
  }
}

/** Enforce client cache size limit */
async function enforceClientLimit(): Promise<void> {
  if (clientCache.size <= CACHE_CONFIG.maxClients) {
    return;
  }

  // Find oldest unused clients
  const entries = Array.from(clientCache.entries())
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  const toRemove = entries.slice(0, clientCache.size - CACHE_CONFIG.maxClients);
  
  for (const [tenantId] of toRemove) {
    logger.debug(`Evicting client for tenant ${tenantId} due to cache limit`);
    await cleanupClient(tenantId);
  }
}

/** Get or create a PrismaClient for this tenant */
export async function getTenantClient(ctx: TenantContext): Promise<TenantPrismaClient> {
  const { id, databaseUrl } = ctx;
  
  if (!id || !databaseUrl) {
    throw new Error('Invalid tenant context: missing id or databaseUrl');
  }

  // Check if client exists and is healthy
  if (clientCache.has(id)) {
    const cached = clientCache.get(id)!;
    cached.lastUsed = Date.now();
    
    if (cached.connected) {
      logger.debug(`Reusing existing client for tenant: ${id}`);
      return cached.client;
    } else {
      // Remove disconnected client
      logger.warn(`Removing disconnected client for tenant: ${id}`);
      await cleanupClient(id);
    }
  }

  // Create new client with proper error handling
  try {
    logger.debug(`Creating new database client for tenant: ${id}`);
    
    const client = new TenantPrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Handle connection events
    client.$on('error', (e) => {
      logger.error(`Database error for tenant ${id}:`, e);
      markClientDisconnected(id);
    });

    // Connect with timeout and retry logic
    await connectWithRetry(client, id);
    
    // Cache the client
    clientCache.set(id, { 
      client, 
      lastUsed: Date.now(), 
      connected: true 
    });

    // Enforce cache size limit
    await enforceClientLimit();

    return client;
  } catch (error) {
    logger.error(`Failed to create client for tenant ${id}:`, error);
    throw new Error(`Database connection failed for tenant: ${id}`);
  }
}

/** Return the internal client cache map */
export function getClientCache() {
  return clientCache;
}

/** Remove & disconnect a tenant client */
export async function removeClient(id: string) {
  await cleanupClient(id);
}

/** Start periodic cleanup of idle clients */
export function startClientCleanup(): void {
  setInterval(async () => {
    const now = Date.now();
    const toCleanup: string[] = [];

    for (const [tenantId, cached] of clientCache.entries()) {
      if (now - cached.lastUsed > CACHE_CONFIG.maxIdleTime) {
        toCleanup.push(tenantId);
      }
    }

    for (const tenantId of toCleanup) {
      logger.debug(`Cleaning up idle client for tenant: ${tenantId}`);
      await cleanupClient(tenantId);
    }
  }, CACHE_CONFIG.healthCheckInterval);
}

/** Shutdown all clients gracefully */
export async function shutdownAllClients(): Promise<void> {
  logger.log('Shutting down all tenant database clients');
  
  const promises = Array.from(clientCache.keys()).map(cleanupClient);
  await Promise.allSettled(promises);
  
  clientCache.clear();
  logger.log('All tenant database clients shut down');
}
