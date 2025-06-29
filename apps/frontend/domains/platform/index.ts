// Platform domain barrel file

// Types (avoiding duplicates)
export * from './types/tenant.types';
export * from './types/user.types';

// Services
export { platformApiClient } from './services/platformApiClient';

// Utilities
export * from './utils/tenantHelpers';

// Hooks
export * from './hooks/usePlatformApi'; 