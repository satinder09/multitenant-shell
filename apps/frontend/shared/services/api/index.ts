// Main API exports
export * from './types';
export * from './base-client';
export * from './hooks/useApiQuery';

// Re-export domain API hooks (now using unified browserApi)
export * from '@/domains/auth/hooks/useAuthApi';
export * from '@/domains/platform/hooks/usePlatformApi';
export * from '@/domains/tenant/hooks/useTenantApi'; 