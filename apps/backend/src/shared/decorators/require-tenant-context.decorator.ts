import { SetMetadata } from '@nestjs/common';
import { REQUIRE_TENANT_CONTEXT } from '../guards/tenant-validation.guard';

/**
 * Decorator to mark routes that require tenant context validation
 * This ensures users can only access data from tenants they belong to
 */
export const RequireTenantContext = () => SetMetadata(REQUIRE_TENANT_CONTEXT, true); 