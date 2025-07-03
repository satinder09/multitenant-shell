/**
 * 📖 API DOCUMENTATION SERVICE
 * 
 * Comprehensive API documentation with OpenAPI/Swagger generation,
 * interactive API explorer, and documentation management
 */

import { debug, DebugCategory } from '../utils/debug-tools';

// API Documentation interfaces
export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPath>;
  components: OpenAPIComponents;
  security: OpenAPISecurityRequirement[];
  tags: OpenAPITag[];
}

export interface OpenAPIInfo {
  title: string;
  description: string;
  version: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
  'x-rate-limit'?: {
    limit: number;
    window: number;
  };
  'x-version-support'?: string[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  enum?: any[];
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  additionalProperties?: boolean | OpenAPISchema;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  $ref?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: OpenAPISchema;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  examples?: Record<string, OpenAPIExample>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPIHeader>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPISecurityRequirement {
  [key: string]: string[];
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
}

export interface OpenAPIExternalDocumentation {
  description?: string;
  url: string;
}

export interface ApiDocumentationConfig {
  title: string;
  description: string;
  version: string;
  baseUrl: string;
  enableInteractiveExplorer: boolean;
  enableCodeGeneration: boolean;
  enableTryItOut: boolean;
  supportedLanguages: string[];
  customTheme?: {
    primaryColor?: string;
    backgroundColor?: string;
    headerColor?: string;
  };
}

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  operationId: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  security: string[];
  examples: ApiExample[];
  deprecated: boolean;
  rateLimit?: {
    limit: number;
    window: number;
  };
  versionSupport: string[];
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required: boolean;
  type: string;
  format?: string;
  example?: any;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface ApiRequestBody {
  description: string;
  contentType: string;
  schema: any;
  example?: any;
  required: boolean;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: any;
  example?: any;
  headers?: Record<string, string>;
}

export interface ApiExample {
  name: string;
  description: string;
  request?: {
    parameters?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
  };
  response?: {
    statusCode: number;
    body?: any;
    headers?: Record<string, string>;
  };
}

class ApiDocumentationService {
  private config: ApiDocumentationConfig;
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private schemas: Map<string, OpenAPISchema> = new Map();
  private openApiSpec: OpenAPISpec;

  constructor(config: Partial<ApiDocumentationConfig> = {}) {
    this.config = {
      title: 'MultiTenant Platform API',
      description: 'Comprehensive API for the MultiTenant Platform with authentication, platform management, and tenant operations',
      version: '2.0.0',
      baseUrl: 'http://lvh.me:4000',
      enableInteractiveExplorer: true,
      enableCodeGeneration: true,
      enableTryItOut: true,
      supportedLanguages: ['javascript', 'typescript', 'python', 'curl', 'php'],
      customTheme: {
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        headerColor: '#1f2937'
      },
      ...config
    };

    this.openApiSpec = this.initializeOpenAPISpec();
    this.registerDefaultEndpoints();
    this.registerDefaultSchemas();

    debug.log(DebugCategory.API, 'API Documentation Service initialized', {
      title: this.config.title,
      version: this.config.version,
      endpointsCount: this.endpoints.size
    });
  }

  /**
   * Initialize OpenAPI specification structure
   */
  private initializeOpenAPISpec(): OpenAPISpec {
    return {
      openapi: '3.0.3',
      info: {
        title: this.config.title,
        description: this.config.description,
        version: this.config.version,
        contact: {
          name: 'MultiTenant Platform Team',
          email: 'api@multitenant-platform.com',
          url: 'https://docs.multitenant-platform.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        },
        termsOfService: 'https://multitenant-platform.com/terms'
      },
      servers: [
        {
          url: this.config.baseUrl,
          description: 'Development server'
        },
        {
          url: 'https://api.multitenant-platform.com',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.multitenant-platform.com',
          description: 'Staging server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/auth/login'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for service-to-service authentication'
          }
        },
        responses: {
          Unauthorized: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          Forbidden: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError'
                }
              }
            }
          },
          RateLimitExceeded: {
            description: 'Rate limit exceeded',
            headers: {
              'X-RateLimit-Limit': {
                description: 'Request limit per window',
                schema: { type: 'integer' }
              },
              'X-RateLimit-Remaining': {
                description: 'Remaining requests in current window',
                schema: { type: 'integer' }
              },
              'X-RateLimit-Reset': {
                description: 'Unix timestamp when rate limit resets',
                schema: { type: 'integer' }
              }
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      security: [
        { BearerAuth: [] },
        { ApiKeyAuth: [] }
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and authorization'
        },
        {
          name: 'Platform',
          description: 'Platform management and configuration'
        },
        {
          name: 'Tenants',
          description: 'Tenant management and operations'
        },
        {
          name: 'Users',
          description: 'User management within tenants'
        },
        {
          name: 'RBAC',
          description: 'Role-based access control'
        },
        {
          name: 'Search',
          description: 'Search and filtering operations'
        },
        {
          name: 'Health',
          description: 'System health and monitoring'
        }
      ]
    };
  }

  /**
   * Register default API endpoints
   */
  private registerDefaultEndpoints(): void {
    const endpoints: ApiEndpoint[] = [
      // Authentication endpoints
      {
        path: '/api/auth/login',
        method: 'POST',
        summary: 'User login',
        description: 'Authenticate user and obtain JWT token',
        tags: ['Authentication'],
        operationId: 'loginUser',
        parameters: [],
        requestBody: {
          description: 'Login credentials',
          contentType: 'application/json',
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              rememberMe: { type: 'boolean' }
            }
          },
          required: true
        },
        responses: [
          {
            statusCode: 200,
            description: 'Login successful',
            contentType: 'application/json',
            schema: { $ref: '#/components/schemas/AuthResponse' }
          },
          {
            statusCode: 401,
            description: 'Invalid credentials',
            contentType: 'application/json',
            schema: { $ref: '#/components/schemas/Error' }
          }
        ],
        security: [],
        examples: [
          {
            name: 'Successful login',
            description: 'Example of successful user login',
            request: {
              body: {
                email: 'user@example.com',
                password: 'SecurePass123!',
                rememberMe: true
              }
            },
            response: {
              statusCode: 200,
              body: {
                user: {
                  id: 'user123',
                  email: 'user@example.com',
                  name: 'John Doe'
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                expiresAt: '2024-12-31T23:59:59Z'
              }
            }
          }
        ],
        deprecated: false,
        rateLimit: { limit: 5, window: 60000 },
        versionSupport: ['v1', 'v2']
      },
      
      // Platform endpoints
      {
        path: '/api/platform/tenants',
        method: 'GET',
        summary: 'List tenants',
        description: 'Retrieve list of tenants with pagination and filtering',
        tags: ['Platform', 'Tenants'],
        operationId: 'listTenants',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (1-based)',
            required: false,
            type: 'integer',
            minimum: 1,
            example: 1
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            type: 'integer',
            minimum: 1,
            maximum: 100,
            example: 20
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for tenant name or domain',
            required: false,
            type: 'string',
            example: 'acme'
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by tenant status',
            required: false,
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            example: 'active'
          }
        ],
        responses: [
          {
            statusCode: 200,
            description: 'List of tenants',
            contentType: 'application/json',
            schema: { $ref: '#/components/schemas/TenantsResponse' }
          }
        ],
        security: ['BearerAuth'],
        examples: [
          {
            name: 'List active tenants',
            description: 'Get first page of active tenants',
            request: {
              parameters: {
                page: 1,
                limit: 10,
                status: 'active'
              }
            },
            response: {
              statusCode: 200,
              body: {
                data: [
                  {
                    id: 'tenant123',
                    name: 'Acme Corp',
                    domain: 'acme.example.com',
                    status: 'active'
                  }
                ],
                meta: {
                  page: 1,
                  limit: 10,
                  total: 25,
                  pages: 3
                }
              }
            }
          }
        ],
        deprecated: false,
        rateLimit: { limit: 100, window: 60000 },
        versionSupport: ['v1', 'v2']
      },
      
      // Health check endpoint
      {
        path: '/api/health',
        method: 'GET',
        summary: 'Health check',
        description: 'Check API health and system status',
        tags: ['Health'],
        operationId: 'healthCheck',
        parameters: [],
        responses: [
          {
            statusCode: 200,
            description: 'System is healthy',
            contentType: 'application/json',
            schema: { $ref: '#/components/schemas/HealthResponse' }
          }
        ],
        security: [],
        examples: [
          {
            name: 'Healthy system',
            description: 'System is running normally',
            response: {
              statusCode: 200,
              body: {
                status: 'healthy',
                timestamp: '2024-01-15T10:30:00Z',
                version: '2.0.0',
                uptime: 86400,
                services: {
                  database: 'healthy',
                  cache: 'healthy',
                  storage: 'healthy'
                }
              }
            }
          }
        ],
        deprecated: false,
        versionSupport: ['v1', 'v2']
      }
    ];

    endpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.endpoints.set(key, endpoint);
    });
  }

  /**
   * Register default schemas
   */
  private registerDefaultSchemas(): void {
    const schemas: Record<string, OpenAPISchema> = {
      Error: {
        type: 'object',
        required: ['message', 'code'],
        properties: {
          message: {
            type: 'string',
            description: 'Error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          },
          details: {
            type: 'object',
            description: 'Additional error details'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          }
        },
        example: {
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
          timestamp: '2024-01-15T10:30:00Z'
        }
      },
      
      ValidationError: {
        type: 'object',
        required: ['message', 'code', 'errors'],
        properties: {
          message: {
            type: 'string',
            description: 'Validation error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            }
          }
        }
      },
      
      AuthResponse: {
        type: 'object',
        required: ['user', 'token', 'expiresAt'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: {
            type: 'string',
            description: 'JWT access token'
          },
          refreshToken: {
            type: 'string',
            description: 'Refresh token'
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Token expiration time'
          }
        }
      },
      
      User: {
        type: 'object',
        required: ['id', 'email', 'name'],
        properties: {
          id: {
            type: 'string',
            description: 'User unique identifier'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          name: {
            type: 'string',
            description: 'User full name'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description: 'User avatar URL'
          },
          roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'User roles'
          },
          lastLoginAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last login timestamp'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          }
        }
      },
      
      Tenant: {
        type: 'object',
        required: ['id', 'name', 'domain', 'status'],
        properties: {
          id: {
            type: 'string',
            description: 'Tenant unique identifier'
          },
          name: {
            type: 'string',
            description: 'Tenant name'
          },
          domain: {
            type: 'string',
            description: 'Tenant domain'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            description: 'Tenant status'
          },
          settings: {
            type: 'object',
            description: 'Tenant configuration settings'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Tenant creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      
      TenantsResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tenant' }
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              pages: { type: 'integer' }
            }
          }
        }
      },
      
      HealthResponse: {
        type: 'object',
        required: ['status', 'timestamp'],
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Overall system status'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Health check timestamp'
          },
          version: {
            type: 'string',
            description: 'API version'
          },
          uptime: {
            type: 'integer',
            description: 'System uptime in seconds'
          },
          services: {
            type: 'object',
            additionalProperties: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy']
            },
            description: 'Status of individual services'
          }
        }
      }
    };

    Object.entries(schemas).forEach(([name, schema]) => {
      this.schemas.set(name, schema);
    });
  }

  /**
   * Generate complete OpenAPI specification
   */
  generateOpenAPISpec(): OpenAPISpec {
    // Update paths from registered endpoints
    this.openApiSpec.paths = {};
    
    for (const [key, endpoint] of this.endpoints.entries()) {
      const { path, method } = endpoint;
      
      if (!this.openApiSpec.paths[path]) {
        this.openApiSpec.paths[path] = {};
      }
      
      this.openApiSpec.paths[path][method.toLowerCase() as keyof OpenAPIPath] = this.endpointToOperation(endpoint);
    }
    
    // Update schemas
    this.openApiSpec.components.schemas = {};
    for (const [name, schema] of this.schemas.entries()) {
      this.openApiSpec.components.schemas[name] = schema;
    }
    
    return this.openApiSpec;
  }

  /**
   * Convert endpoint to OpenAPI operation
   */
  private endpointToOperation(endpoint: ApiEndpoint): OpenAPIOperation {
    const operation: OpenAPIOperation = {
      tags: endpoint.tags,
      summary: endpoint.summary,
      description: endpoint.description,
      operationId: endpoint.operationId,
      deprecated: endpoint.deprecated,
      security: endpoint.security.length > 0 ? endpoint.security.map(scheme => ({ [scheme]: [] })) : [],
      responses: {}
    };

    // Add parameters
    if (endpoint.parameters.length > 0) {
      operation.parameters = endpoint.parameters.map(param => ({
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema: {
          type: param.type,
          format: param.format,
          enum: param.enum,
          pattern: param.pattern,
          minimum: param.minimum,
          maximum: param.maximum,
          minLength: param.minLength,
          maxLength: param.maxLength
        },
        example: param.example
      }));
    }

    // Add request body
    if (endpoint.requestBody) {
      operation.requestBody = {
        description: endpoint.requestBody.description,
        required: endpoint.requestBody.required,
        content: {
          [endpoint.requestBody.contentType]: {
            schema: endpoint.requestBody.schema,
            example: endpoint.requestBody.example
          }
        }
      };
    }

    // Add responses
    endpoint.responses.forEach(response => {
      operation.responses[response.statusCode.toString()] = {
        description: response.description,
        ...(response.contentType && response.schema ? {
          content: {
            [response.contentType]: {
              schema: response.schema,
              example: response.example
            }
          }
        } : {}),
        ...(response.headers ? {
          headers: Object.entries(response.headers).reduce((acc, [name, description]) => {
            acc[name] = {
              description,
              schema: { type: 'string' }
            };
            return acc;
          }, {} as Record<string, OpenAPIHeader>)
        } : {})
      };
    });

    // Add rate limiting info
    if (endpoint.rateLimit) {
      operation['x-rate-limit'] = endpoint.rateLimit;
    }

    // Add version support
    operation['x-version-support'] = endpoint.versionSupport;

    return operation;
  }

  /**
   * Generate interactive API explorer HTML
   */
  generateApiExplorer(): string {
    const spec = this.generateOpenAPISpec();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title} - API Explorer</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        body { 
            margin: 0; 
            background-color: ${this.config.customTheme?.backgroundColor || '#ffffff'}; 
        }
        .topbar { 
            background-color: ${this.config.customTheme?.headerColor || '#1f2937'} !important; 
        }
        .swagger-ui .topbar .link { 
            color: white !important; 
        }
        .swagger-ui .btn.authorize { 
            background-color: ${this.config.customTheme?.primaryColor || '#3b82f6'} !important;
            border-color: ${this.config.customTheme?.primaryColor || '#3b82f6'} !important;
        }
        .swagger-ui .btn.execute { 
            background-color: ${this.config.customTheme?.primaryColor || '#3b82f6'} !important;
            border-color: ${this.config.customTheme?.primaryColor || '#3b82f6'} !important;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: ${this.config.enableTryItOut},
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                docExpansion: 'list',
                filter: true,
                showRequestHeaders: true,
                showCommonExtensions: true,
                requestInterceptor: function(request) {
                    // Add API version header
                    request.headers['API-Version'] = 'v2';
                    return request;
                },
                responseInterceptor: function(response) {
                    // Log API responses for debugging
                    console.log('API Response:', response);
                    return response;
                }
            });
        };
    </script>
</body>
</html>`;
  }

  /**
   * Generate code examples for different languages
   */
  generateCodeExamples(endpoint: ApiEndpoint): Record<string, string> {
    const examples: Record<string, string> = {};

    // JavaScript/Fetch example
    examples.javascript = this.generateJavaScriptExample(endpoint);
    
    // TypeScript example
    examples.typescript = this.generateTypeScriptExample(endpoint);
    
    // cURL example
    examples.curl = this.generateCurlExample(endpoint);
    
    // Python example
    examples.python = this.generatePythonExample(endpoint);

    return examples;
  }

  /**
   * Generate JavaScript fetch example
   */
  private generateJavaScriptExample(endpoint: ApiEndpoint): string {
    const hasAuth = endpoint.security.length > 0;
    const hasBody = endpoint.requestBody;
    
    let example = `// ${endpoint.summary}\n`;
    example += `const response = await fetch('${this.config.baseUrl}${endpoint.path}', {\n`;
    example += `  method: '${endpoint.method}',\n`;
    
    if (hasAuth || hasBody) {
      example += `  headers: {\n`;
      if (hasBody) {
        example += `    'Content-Type': '${endpoint.requestBody?.contentType || 'application/json'}',\n`;
      }
      if (hasAuth) {
        example += `    'Authorization': 'Bearer YOUR_JWT_TOKEN',\n`;
      }
      example += `  },\n`;
    }
    
    if (hasBody && endpoint.requestBody?.example) {
      example += `  body: JSON.stringify(${JSON.stringify(endpoint.requestBody.example, null, 4)})\n`;
    }
    
    example += `});\n\n`;
    example += `const data = await response.json();\n`;
    example += `console.log(data);`;
    
    return example;
  }

  /**
   * Generate TypeScript example
   */
  private generateTypeScriptExample(endpoint: ApiEndpoint): string {
    let example = `// ${endpoint.summary}\n`;
    example += `interface ApiResponse {\n`;
    example += `  // Define your response type here\n`;
    example += `}\n\n`;
    
    example += `const response = await fetch('${this.config.baseUrl}${endpoint.path}', {\n`;
    example += `  method: '${endpoint.method}' as const,\n`;
    example += `  headers: {\n`;
    
    if (endpoint.requestBody) {
      example += `    'Content-Type': '${endpoint.requestBody.contentType}',\n`;
    }
    if (endpoint.security.length > 0) {
      example += `    'Authorization': 'Bearer YOUR_JWT_TOKEN',\n`;
    }
    
    example += `  },\n`;
    
    if (endpoint.requestBody?.example) {
      example += `  body: JSON.stringify(${JSON.stringify(endpoint.requestBody.example, null, 4)})\n`;
    }
    
    example += `});\n\n`;
    example += `const data: ApiResponse = await response.json();`;
    
    return example;
  }

  /**
   * Generate cURL example
   */
  private generateCurlExample(endpoint: ApiEndpoint): string {
    let example = `# ${endpoint.summary}\n`;
    example += `curl -X ${endpoint.method} \\\n`;
    example += `  "${this.config.baseUrl}${endpoint.path}" \\\n`;
    
    if (endpoint.requestBody) {
      example += `  -H "Content-Type: ${endpoint.requestBody.contentType}" \\\n`;
    }
    if (endpoint.security.length > 0) {
      example += `  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\\n`;
    }
    
    if (endpoint.requestBody?.example) {
      example += `  -d '${JSON.stringify(endpoint.requestBody.example)}'`;
    }
    
    return example;
  }

  /**
   * Generate Python requests example
   */
  private generatePythonExample(endpoint: ApiEndpoint): string {
    let example = `# ${endpoint.summary}\n`;
    example += `import requests\n\n`;
    
    example += `url = "${this.config.baseUrl}${endpoint.path}"\n`;
    
    if (endpoint.requestBody || endpoint.security.length > 0) {
      example += `headers = {\n`;
      if (endpoint.requestBody) {
        example += `    "Content-Type": "${endpoint.requestBody.contentType}",\n`;
      }
      if (endpoint.security.length > 0) {
        example += `    "Authorization": "Bearer YOUR_JWT_TOKEN",\n`;
      }
      example += `}\n`;
    }
    
    if (endpoint.requestBody?.example) {
      example += `data = ${JSON.stringify(endpoint.requestBody.example, null, 4)}\n\n`;
    }
    
    example += `response = requests.${endpoint.method.toLowerCase()}(url`;
    
    if (endpoint.requestBody || endpoint.security.length > 0) {
      example += `, headers=headers`;
    }
    
    if (endpoint.requestBody?.example) {
      example += `, json=data`;
    }
    
    example += `)\n`;
    example += `print(response.json())`;
    
    return example;
  }

  /**
   * Register new API endpoint
   */
  registerEndpoint(endpoint: ApiEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
    
    debug.log(DebugCategory.API, 'API endpoint registered', {
      method: endpoint.method,
      path: endpoint.path,
      operationId: endpoint.operationId
    });
  }

  /**
   * Register new schema
   */
  registerSchema(name: string, schema: OpenAPISchema): void {
    this.schemas.set(name, schema);
    
    debug.log(DebugCategory.API, 'API schema registered', {
      name,
      type: schema.type
    });
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get endpoint by operation ID
   */
  getEndpointByOperationId(operationId: string): ApiEndpoint | undefined {
    return Array.from(this.endpoints.values()).find(endpoint => 
      endpoint.operationId === operationId
    );
  }

  /**
   * Get endpoints by tag
   */
  getEndpointsByTag(tag: string): ApiEndpoint[] {
    return Array.from(this.endpoints.values()).filter(endpoint =>
      endpoint.tags.includes(tag)
    );
  }

  /**
   * Export OpenAPI specification as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.generateOpenAPISpec(), null, 2);
  }

  /**
   * Export OpenAPI specification as YAML
   */
  exportAsYAML(): string {
    // Simple JSON to YAML conversion
    const spec = this.generateOpenAPISpec();
    return this.jsonToYaml(spec);
  }

  /**
   * Simple JSON to YAML converter
   */
  private jsonToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- ${this.jsonToYaml(item, indent + 1).trim()}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.jsonToYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
        }
      });
    } else {
      return JSON.stringify(obj);
    }

    return yaml;
  }
}

// Export singleton instance
export const apiDocumentationService = new ApiDocumentationService();

export { ApiDocumentationService }; 