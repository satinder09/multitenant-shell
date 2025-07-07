#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SPEC_INPUT_PATH = path.join(__dirname, '..', 'generated', 'user-api-spec.json');
const CONTENT_OUTPUT_DIR = path.join(__dirname, '..', 'content', 'api');

async function integrateApiSpec() {
  console.log('📚 Starting Fumadocs Users API integration...');
  
  try {
    // Check if OpenAPI spec exists
    if (!fs.existsSync(SPEC_INPUT_PATH)) {
      throw new Error(`Users API spec not found at ${SPEC_INPUT_PATH}. Please run 'npm run api:generate' first.`);
    }

    // Read the OpenAPI specification
    const openApiSpec = JSON.parse(fs.readFileSync(SPEC_INPUT_PATH, 'utf8'));
    console.log(`📄 Loaded Users API spec: ${openApiSpec.info.title} v${openApiSpec.info.version}`);

    // Ensure output directory exists
    if (!fs.existsSync(CONTENT_OUTPUT_DIR)) {
      fs.mkdirSync(CONTENT_OUTPUT_DIR, { recursive: true });
    }

    // Generate focused Users API documentation
    const generatedFiles = [];

    // Create Users API overview page
    const overviewContent = generateUsersOverviewPage(openApiSpec);
    const overviewPath = path.join(CONTENT_OUTPUT_DIR, 'users.mdx');
    fs.writeFileSync(overviewPath, overviewContent);
    generatedFiles.push('users.mdx');

    // Generate comprehensive Users API reference
    const completeApiContent = generateUsersApiReference(openApiSpec);
    const completeApiPath = path.join(CONTENT_OUTPUT_DIR, 'users-reference.mdx');
    fs.writeFileSync(completeApiPath, completeApiContent);
    generatedFiles.push('users-reference.mdx');

    // Update meta.json for proper navigation
    updateMetaJson();

    console.log(`✅ Users API documentation generated successfully!`);
    console.log(`📁 Generated files: ${generatedFiles.length}`);
    generatedFiles.forEach(file => console.log(`   - ${file}`));

    return {
      success: true,
      generatedFiles,
      endpoints: Object.keys(openApiSpec.paths).length
    };

  } catch (error) {
    console.error('❌ Error integrating Users API spec:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function generateUsersOverviewPage(openApiSpec) {
  const info = openApiSpec.info;
  const pathCount = Object.keys(openApiSpec.paths).length;
  
  return `---
title: Users API
description: Complete user management API for tenant operations
---

# ${info.title}

${info.description.replace(/\n\n.*$/, '')}

## Key Features

- **Complete CRUD Operations**: Create, read, update, and delete users
- **Advanced Filtering**: Search users by name, email, role, and status
- **Pagination**: Efficient handling of large user datasets
- **Role-based Access**: Support for different user roles (user, admin, manager)
- **Status Management**: Handle active, inactive, and suspended users
- **Comprehensive Validation**: Robust input validation with detailed error messages

## API Information

- **Version**: ${info.version}
- **Base URL**: ${openApiSpec.servers?.[0]?.url || 'http://localhost:4000'}
- **Total Endpoints**: ${pathCount}
- **Authentication**: Bearer Token / Cookie-based

## Available Operations

### GET /users
Retrieve a paginated list of users with filtering and sorting options.

### POST /users
Create a new user in the current tenant.

### GET /users/{id}
Get detailed information about a specific user.

### PATCH /users/{id}
Update user information (partial update).

### DELETE /users/{id}
Permanently delete a user from the tenant.

## Authentication

This API uses JWT-based authentication. You can authenticate using:

1. **Bearer Token**: Include the JWT token in the Authorization header
   \`\`\`
   Authorization: Bearer <your-jwt-token>
   \`\`\`

2. **HTTP-Only Cookie**: The API automatically reads JWT tokens from the 'Authentication' cookie

## User Roles

The API supports three user roles:
- **user**: Standard user with basic permissions
- **admin**: Administrative user with elevated permissions
- **manager**: Management user with intermediate permissions

## User Status

Users can have the following statuses:
- **active**: User can access the system
- **inactive**: User account is temporarily disabled
- **suspended**: User account is suspended due to policy violations

## Rate Limiting

Standard API rate limiting applies to all endpoints to ensure fair usage and prevent abuse.

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "statusCode": 400,
  "message": ["email must be a valid email"],
  "error": "Bad Request"
}
\`\`\`

Common HTTP status codes:
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (user doesn't exist)
- **409**: Conflict (email already exists)

## Example Usage

### Create a New User

\`\`\`bash
curl -X POST http://localhost:4000/users \\
  -H "Authorization: Bearer your-jwt-token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }'
\`\`\`

### Get Users with Filtering

\`\`\`bash
curl -X GET "http://localhost:4000/users?page=1&limit=10&role=user&status=active" \\
  -H "Authorization: Bearer your-jwt-token"
\`\`\`

### Update User

\`\`\`bash
curl -X PATCH http://localhost:4000/users/123e4567-e89b-12d3-a456-426614174000 \\
  -H "Authorization: Bearer your-jwt-token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Jonathan",
    "role": "manager"
  }'
\`\`\`

Generated on: ${new Date().toISOString()}
`;
}

function generateUsersApiReference(openApiSpec) {
  let content = `---
title: Users API Reference
description: Complete technical reference for all Users API endpoints
---

# Users API Reference

Complete technical documentation for all Users API endpoints.

`;

  // Generate documentation for each endpoint
  Object.entries(openApiSpec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      content += generateEndpointDocumentation(path, method, operation);
    });
  });

  return content;
}

function generateEndpointDocumentation(path, method, operation) {
  const methodUpper = method.toUpperCase();
  const summary = operation.summary || 'No summary available';
  const description = operation.description || 'No description available';
  
  // Escape curly braces in paths so MDX doesn't try to evaluate them as JavaScript
  const escapedPath = path.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
  
  let doc = `
## ${methodUpper} ${escapedPath}

**${summary}**

${description}

`;

  // Add parameters documentation
  if (operation.parameters && operation.parameters.length > 0) {
    doc += `
### Parameters

| Name | Type | In | Required | Description |
|------|------|----|---------|-----------| 
`;
    operation.parameters.forEach(param => {
      const required = param.required ? '✅' : '❌';
      const type = param.schema?.type || 'string';
      const description = param.description || 'No description';
      doc += `| ${param.name} | ${type} | ${param.in} | ${required} | ${description} |\n`;
    });
    doc += '\n';
  }

  // Add request body documentation
  if (operation.requestBody) {
    doc += `
### Request Body

${operation.requestBody.description || 'Request body data'}

`;
    
    // Add JSON schema example if available
    const jsonContent = operation.requestBody.content?.['application/json'];
    if (jsonContent && jsonContent.schema) {
      doc += `**Schema:**\n\n`;
      doc += `\`\`\`json\n${JSON.stringify(jsonContent.schema, null, 2)}\n\`\`\`\n\n`;
    }
  }

  // Add response documentation
  if (operation.responses) {
    doc += `
### Responses

`;
    Object.entries(operation.responses).forEach(([statusCode, response]) => {
      doc += `
#### ${statusCode} - ${response.description || 'No description'}

`;
      if (response.content?.['application/json']?.schema) {
        doc += `**Schema:**\n\n`;
        doc += `\`\`\`json\n${JSON.stringify(response.content['application/json'].schema, null, 2)}\n\`\`\`\n\n`;
      }
    });
  }

  // Add security information
  if (operation.security && operation.security.length > 0) {
    doc += `
### Security

This endpoint requires authentication:
`;
    operation.security.forEach(securityItem => {
      Object.keys(securityItem).forEach(scheme => {
        doc += `- ${scheme}\n`;
      });
    });
    doc += '\n';
  }

  doc += `
---

`;

  return doc;
}

function updateMetaJson() {
  const metaPath = path.join(__dirname, '..', 'content', 'meta.json');
  
  const meta = {
    "title": "API Documentation",
    "pages": [
      "index",
      "quick-start",
      {
        "title": "API Reference",
        "pages": [
          "api",
          "api/users",
          "api/users-reference"
        ]
      }
    ]
  };
  
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log('📝 Updated meta.json with Users API navigation');
}

// Run the script if called directly
if (require.main === module) {
  integrateApiSpec()
    .then(result => {
      if (result.success) {
        console.log('✨ API integration completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 API integration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { integrateApiSpec }; 