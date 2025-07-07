#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function generateOpenApiSpec() {
  console.log('🚀 Starting OpenAPI spec generation for Users API...');
  
  try {
    // Create a focused OpenAPI specification for Users API only
    const userDocument = createUserApiSpec();

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', '..', 'docs', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write OpenAPI spec to file
    const outputPath = path.join(outputDir, 'user-api-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(userDocument, null, 2));

    console.log(`✅ Users API OpenAPI spec generated successfully!`);
    console.log(`📄 Output file: ${outputPath}`);
    console.log(`📊 Total endpoints: ${Object.keys(userDocument.paths).length}`);
    console.log(`🏷️  Tags: ${userDocument.tags.map(tag => tag.name).join(', ')}`);
    
    // Generate summary statistics
    const pathCount = Object.keys(userDocument.paths).length;
    const methodCount = Object.values(userDocument.paths).reduce((total, pathItem) => {
      return total + Object.keys(pathItem).length;
    }, 0);
    
    console.log(`📈 Summary:`);
    console.log(`   - API Paths: ${pathCount}`);
    console.log(`   - HTTP Methods: ${methodCount}`);
    console.log(`   - Security Schemes: ${Object.keys(userDocument.components.securitySchemes).length}`);
    console.log(`   - Tags: ${userDocument.tags.length}`);

    console.log('🎉 Users API generation completed successfully!');
    
    return {
      success: true,
      outputPath,
      stats: {
        paths: pathCount,
        methods: methodCount,
        tags: userDocument.tags.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error generating Users API spec:', error);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

function createUserApiSpec() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Multitenant Shell - Users API',
      description: `Comprehensive Users API documentation for the multitenant shell application.

This API provides complete user management functionality including creation, retrieval, updating, and deletion of users within tenant contexts.

## Key Features

- **Complete CRUD Operations**: Create, read, update, and delete users
- **Advanced Filtering**: Search users by name, email, role, and status
- **Pagination**: Efficient handling of large user datasets
- **Role-based Access**: Support for different user roles (user, admin, manager)
- **Status Management**: Handle active, inactive, and suspended users
- **Comprehensive Validation**: Robust input validation with detailed error messages

## Authentication

This API uses JWT-based authentication with two supported methods:
1. **Bearer Token**: Include JWT in Authorization header
2. **HTTP-Only Cookie**: Automatic cookie-based authentication

## Rate Limiting

Standard API rate limiting applies to all endpoints to ensure fair usage.

Generated on: ${new Date().toISOString()}`,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api-support@yourcompany.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development server'
      },
      {
        url: 'http://tenant.lvh.me:4000',
        description: 'Local tenant subdomain'
      }
    ],
    tags: [
      {
        name: 'Users',
        description: 'Complete user management operations within tenant context'
      }
    ],
    paths: {
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'Get all users',
          description: 'Retrieves a paginated list of users in the current tenant with optional filtering and sorting capabilities.',
          operationId: 'getUsers',
          security: [
            { 'Authentication': [] },
            { 'JWT-auth': [] }
          ],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                default: 1
              },
              description: 'Page number for pagination (starts from 1)',
              example: 1
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10
              },
              description: 'Number of users per page (maximum 100)',
              example: 10
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              schema: {
                type: 'string'
              },
              description: 'Search term to filter users by name or email',
              example: 'john'
            },
            {
              name: 'role',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['user', 'admin', 'manager']
              },
              description: 'Filter users by role',
              example: 'user'
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['active', 'inactive', 'suspended']
              },
              description: 'Filter users by status',
              example: 'active'
            },
            {
              name: 'sortBy',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt']
              },
              description: 'Field to sort by',
              example: 'lastName'
            },
            {
              name: 'sortOrder',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['asc', 'desc']
              },
              description: 'Sort order',
              example: 'asc'
            }
          ],
          responses: {
            '200': {
              description: 'Users retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/User'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/PaginationInfo'
                      },
                      filters: {
                        $ref: '#/components/schemas/FilterInfo'
                      }
                    }
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/Forbidden'
            }
          }
        },
        post: {
          tags: ['Users'],
          summary: 'Create a new user',
          description: 'Creates a new user in the current tenant with the provided details. Requires authentication and appropriate permissions.',
          operationId: 'createUser',
          security: [
            { 'Authentication': [] },
            { 'JWT-auth': [] }
          ],
          requestBody: {
            required: true,
            description: 'User creation data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserDto'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UserResponse'
                  }
                }
              }
            },
            '400': {
              $ref: '#/components/responses/BadRequest'
            },
            '401': {
              $ref: '#/components/responses/Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/Forbidden'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user by ID',
          description: 'Retrieves a specific user by their unique identifier. Returns detailed user information.',
          operationId: 'getUserById',
          security: [
            { 'Authentication': [] },
            { 'JWT-auth': [] }
          ],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              },
              description: 'Unique user identifier',
              example: '123e4567-e89b-12d3-a456-426614174000'
            }
          ],
          responses: {
            '200': {
              description: 'User found and retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UserDetailResponse'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/Forbidden'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        patch: {
          tags: ['Users'],
          summary: 'Update user',
          description: 'Updates a user with the provided data. Only provided fields will be updated (partial update).',
          operationId: 'updateUser',
          security: [
            { 'Authentication': [] },
            { 'JWT-auth': [] }
          ],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              },
              description: 'Unique user identifier',
              example: '123e4567-e89b-12d3-a456-426614174000'
            }
          ],
          requestBody: {
            required: true,
            description: 'User update data (all fields are optional)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateUserDto'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'User updated successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UserUpdateResponse'
                  }
                }
              }
            },
            '400': {
              $ref: '#/components/responses/BadRequest'
            },
            '401': {
              $ref: '#/components/responses/Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/Forbidden'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        },
        delete: {
          tags: ['Users'],
          summary: 'Delete user',
          description: 'Permanently deletes a user from the tenant. This action cannot be undone. Consider deactivating users instead of deleting them.',
          operationId: 'deleteUser',
          security: [
            { 'Authentication': [] },
            { 'JWT-auth': [] }
          ],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              },
              description: 'Unique user identifier',
              example: '123e4567-e89b-12d3-a456-426614174000'
            }
          ],
          responses: {
            '200': {
              description: 'User deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UserDeleteResponse'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/Forbidden'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        'Authentication': {
          type: 'apiKey',
          in: 'cookie',
          name: 'Authentication',
          description: 'HTTP-only cookie authentication'
        },
        'JWT-auth': {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager'],
              description: 'User role within the tenant'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'User account status'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        UserDetailResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            firstName: {
              type: 'string'
            },
            lastName: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager']
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended']
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            },
            profile: {
              type: 'object',
              nullable: true,
              properties: {
                phone: {
                  type: 'string',
                  nullable: true
                },
                department: {
                  type: 'string',
                  nullable: true
                },
                jobTitle: {
                  type: 'string',
                  nullable: true
                },
                timezone: {
                  type: 'string',
                  nullable: true
                }
              }
            }
          }
        },
        CreateUserDto: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
              description: 'User email address (must be unique within tenant)'
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'John',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'Doe',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager'],
              example: 'user',
              description: 'User role within the tenant (optional, defaults to "user")'
            }
          }
        },
        UpdateUserDto: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john.newemail@example.com',
              description: 'Updated email address'
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'Jonathan',
              description: 'Updated first name'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'Doe',
              description: 'Updated last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager'],
              example: 'manager',
              description: 'Updated user role'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              example: 'active',
              description: 'Updated user status'
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            role: {
              type: 'string',
              example: 'user'
            },
            status: {
              type: 'string',
              example: 'active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'ID of user who created this user'
            }
          }
        },
        UserUpdateResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            firstName: {
              type: 'string'
            },
            lastName: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager']
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended']
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedBy: {
              type: 'string',
              format: 'uuid',
              description: 'ID of user who made the update'
            }
          }
        },
        UserDeleteResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'User deleted successfully'
            },
            deletedUserId: {
              type: 'string',
              format: 'uuid'
            },
            deletedAt: {
              type: 'string',
              format: 'date-time'
            },
            deletedBy: {
              type: 'string',
              format: 'uuid',
              description: 'ID of user who performed the deletion'
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of users'
            },
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Users per page'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there are more pages'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there are previous pages'
            }
          }
        },
        FilterInfo: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              nullable: true,
              description: 'Applied search term'
            },
            role: {
              type: 'string',
              nullable: true,
              description: 'Applied role filter'
            },
            status: {
              type: 'string',
              nullable: true,
              description: 'Applied status filter'
            },
            sortBy: {
              type: 'string',
              nullable: true,
              description: 'Applied sort field'
            },
            sortOrder: {
              type: 'string',
              nullable: true,
              description: 'Applied sort order'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: {
                    type: 'integer',
                    example: 400
                  },
                  message: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['email must be a valid email']
                  },
                  error: {
                    type: 'string',
                    example: 'Bad Request'
                  }
                }
              }
            }
          }
        },
        Unauthorized: {
          description: 'Missing or invalid authentication',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: {
                    type: 'integer',
                    example: 401
                  },
                  message: {
                    type: 'string',
                    example: 'Unauthorized'
                  }
                }
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: {
                    type: 'integer',
                    example: 403
                  },
                  message: {
                    type: 'string',
                    example: 'Forbidden'
                  }
                }
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: {
                    type: 'integer',
                    example: 404
                  },
                  message: {
                    type: 'string',
                    example: 'User not found'
                  },
                  error: {
                    type: 'string',
                    example: 'Not Found'
                  }
                }
              }
            }
          }
        },
        Conflict: {
          description: 'Resource conflict',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: {
                    type: 'integer',
                    example: 409
                  },
                  message: {
                    type: 'string',
                    example: 'Email address already exists in this tenant'
                  },
                  error: {
                    type: 'string',
                    example: 'Conflict'
                  },
                  dependencies: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['Active projects: 3', 'Pending tasks: 5']
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  return spec;
}

// Run the script if called directly
if (require.main === module) {
  generateOpenApiSpec()
    .then(result => {
      if (result.success) {
        console.log('✨ Script completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { generateOpenApiSpec }; 