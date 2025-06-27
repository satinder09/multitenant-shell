// Main API exports
export * from './types';
export * from './base-client';
export * from './hooks/useApiQuery';

// Re-export domain API clients
export { authApiClient } from '@/domains/auth/services/authApiClient';
export { platformApiClient } from '@/domains/platform/services/platformApiClient';
export { tenantApiClient } from '@/domains/tenant/services/tenantApiClient';

// Re-export domain API hooks
export * from '@/domains/auth/hooks/useAuthApi';
export * from '@/domains/platform/hooks/usePlatformApi';
export * from '@/domains/tenant/hooks/useTenantApi'; 