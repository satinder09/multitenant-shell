# API Documentation Generation Guide

## Overview

This guide provides a standardized, automated method for generating API documentation from NestJS backend endpoints. The system generates interactive, beautiful documentation using Swagger/OpenAPI specifications and integrates seamlessly with Fumadocs.

## 🎯 Key Features

- **Fully Automated**: Generate complete API documentation with one command
- **Interactive**: Beautiful, interactive documentation with try-it-out functionality
- **Tenant-Focused**: Specifically filters and documents tenant-side APIs only
- **Standardized**: Consistent workflow for all developers
- **Integration Ready**: Seamless integration with Fumadocs documentation platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- NPM 8+
- Backend and docs applications set up

### Generate API Documentation

```bash
# From project root - generates complete API documentation
npm run api:generate

# Or step by step:
npm run api:spec     # Generate OpenAPI spec from backend
npm run api:sync     # Sync spec with Fumadocs
```

### View Documentation

```bash
# Start documentation server
npm run api:dev      # Generates docs and starts dev server

# Or manually:
npm run api:generate
cd apps/docs && npm run dev
```

Visit: `http://localhost:3001/api/overview`

## 📋 Developer Workflow

### 1. Adding New API Endpoints

When creating new controllers or endpoints:

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('YourFeature')  // Groups endpoints in documentation
@Controller('your-feature')
export class YourFeatureController {
  
  @Post()
  @ApiOperation({ 
    summary: 'Create new feature',
    description: 'Creates a new feature with the provided data'
  })
  @ApiBody({ 
    type: CreateFeatureDto,
    description: 'Feature creation data'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Feature created successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(@Body() dto: CreateFeatureDto) {
    // Implementation
  }
}
```

### 2. Update Documentation

After adding or modifying endpoints:

```bash
# Regenerate complete API documentation
npm run api:generate

# Check the generated documentation
npm run api:dev
```

### 3. Customize Content (Optional)

Generated MDX files can be customized:

```
apps/docs/content/api/
├── overview.mdx           # API overview page
├── authentication.mdx     # Auth endpoints
├── tenants.mdx           # Tenant management
├── tenant-access.mdx     # Access control
├── search.mdx            # Search functionality
└── complete-reference.mdx # Interactive API reference
```

### 4. Review and Deploy

```bash
# Build for production
npm run api:build

# Test the production build
cd apps/docs && npm run start
```

## 🔧 Command Reference

### Root Package Commands

| Command | Description |
|---------|-------------|
| `npm run api:generate` | Complete API documentation generation |
| `npm run api:spec` | Generate OpenAPI spec from backend |
| `npm run api:sync` | Sync OpenAPI spec with Fumadocs |
| `npm run api:dev` | Generate docs and start dev server |
| `npm run api:build` | Generate docs and build for production |

### Backend Commands

| Command | Description |
|---------|-------------|
| `npm run api:generate` | Generate OpenAPI specification |
| `npm run api:serve` | Build and start backend with docs |
| `npm run api:test` | Test OpenAPI spec generation |

### Docs Commands

| Command | Description |
|---------|-------------|
| `npm run api:sync` | Integrate OpenAPI spec with Fumadocs |
| `npm run api:dev` | Sync and start dev server |
| `npm run api:build` | Sync and build for production |
| `npm run api:check` | Check if OpenAPI spec exists |

## 📝 Swagger Decorator Standards

### Required Decorators

Every controller should have:

```typescript
@ApiTags('FeatureName')           // Group endpoints
@ApiCookieAuth('Authentication')  // Cookie auth
@ApiBearerAuth('JWT-auth')       // Bearer token auth
@Controller('feature')
export class FeatureController {
  // endpoints
}
```

### Endpoint Documentation

Every endpoint should have:

```typescript
@ApiOperation({ 
  summary: 'Brief description',
  description: 'Detailed description of what this endpoint does'
})
@ApiResponse({ status: 200, description: 'Success response' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
// Add more responses as needed
```

### Request/Response Documentation

```typescript
// For request bodies
@ApiBody({ 
  type: YourDto,
  description: 'Description of request data'
})

// For parameters
@ApiParam({ 
  name: 'id', 
  type: String,
  description: 'Resource ID'
})

// For query parameters
@ApiQuery({ 
  name: 'page', 
  required: false, 
  type: Number,
  description: 'Page number'
})
```

## 🎨 Generated Documentation Structure

### Overview Page
- API information and statistics
- Authentication guide
- Rate limiting information
- Error handling standards

### Feature Pages
- Grouped by `@ApiTags`
- All endpoints for that feature
- Request/response examples
- Parameter documentation

### Interactive Reference
- Complete OpenAPI specification
- Try-it-out functionality
- Schema documentation
- Authentication testing

## 🔒 Security and Filtering

The system automatically:
- ✅ Includes tenant-related endpoints (`/auth`, `/tenants`, `/tenant-access`, `/search`)
- ❌ Excludes platform-specific endpoints (`/platform/*`, `/metrics`, `/performance`)
- 🔐 Documents authentication requirements
- 🛡️ Includes rate limiting information

## 📊 Generated Files

### Backend Output
```
apps/backend/dist/                    # Compiled backend
apps/docs/generated/
├── tenant-api-spec.json             # OpenAPI specification
└── generation-report.md             # Generation summary
```

### Documentation Output
```
apps/docs/content/api/
├── overview.mdx                     # API overview
├── authentication.mdx               # Auth endpoints
├── tenants.mdx                      # Tenant management
├── tenant-access.mdx                # Access control
├── search.mdx                       # Search functionality
└── complete-reference.mdx           # Interactive reference
```

## 🔍 Troubleshooting

### Common Issues

**Backend not building:**
```bash
cd apps/backend
npm run build
# Check for TypeScript errors
```

**OpenAPI spec not generating:**
```bash
cd apps/backend
npm run api:test
# Check console output for errors
```

**Documentation not updating:**
```bash
npm run api:generate  # Regenerate everything
rm -rf apps/docs/.next  # Clear Next.js cache
```

**Missing endpoints in documentation:**
- Ensure controllers have proper `@ApiTags` decorators
- Check that endpoints are not being filtered out
- Verify endpoints are in tenant-related paths

### Debug Mode

Add debug logging to see what's being generated:

```bash
# Enable debug mode
DEBUG=api:* npm run api:generate
```

## 🚀 Best Practices

### 1. Consistent Naming
- Use clear, descriptive `@ApiTags` names
- Follow RESTful conventions for endpoints
- Use consistent response status codes

### 2. Complete Documentation
- Always include `@ApiOperation` with summary and description
- Document all possible responses
- Include request/response examples

### 3. Regular Updates
- Regenerate documentation after endpoint changes
- Review generated content for accuracy
- Keep custom content in sync with changes

### 4. Testing
- Test interactive documentation regularly
- Verify authentication flows work
- Check that examples are accurate

## 📖 Integration with Fumadocs

### OpenAPI Component Usage

In your custom MDX files:

```mdx
---
title: Complete API Reference
---

# Interactive API Documentation

<OpenAPI spec={require('../generated/tenant-api-spec.json')} />
```

### Custom Content

You can add custom content to generated files:

```mdx
---
title: Authentication
---

# Authentication API

Custom introduction content here...

## Getting Started

1. Register for an account
2. Login to get JWT token
3. Use token in requests

<!-- Generated content starts here -->
```

## 🎯 Next Steps

1. **Run the generator**: `npm run api:generate`
2. **Review the output**: Check generated documentation
3. **Customize as needed**: Edit MDX files for additional content
4. **Test thoroughly**: Verify all endpoints work correctly
5. **Deploy**: Integrate with your deployment pipeline

## 🆘 Support

For issues or questions:
1. Check the generation report: `apps/docs/generated/generation-report.md`
2. Review console output for errors
3. Verify all dependencies are installed
4. Check that backend builds successfully

---

*This guide was created for the Multitenant Shell API Documentation System* 