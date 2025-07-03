// Core API services
export * from './api-client';

// Platform context services
export * from './platform-context.service';

// Enhanced security services
export * from './auth-security.service';

// Advanced API security services
export * from './api-security.service';

// API documentation services (avoiding ApiResponse conflict)
export {
  ApiDocumentationService,
  type ApiDocumentationConfig,
  type OpenAPISpec,
  type OpenAPIPath,
  type OpenAPIResponse,
  type OpenAPISecurityScheme,
  type OpenAPITag,
  type OpenAPIExample,
  type ApiEndpoint,
  type ApiResponse as ApiDocumentationResponse
} from './api-documentation.service';

// Performance optimization services
export * from './performance-optimization.service';

// Monitoring and observability services
export * from './monitoring-observability.service';

// Documentation services
export * from './documentation.service';

// CI/CD pipeline services
export * from './cicd-pipeline.service';

// Advanced testing services
export * from './advanced-testing.service';

// Legacy exports for backward compatibility
export { browserApi } from './api-client';
export { platformContextService } from './platform-context.service'; 