# Rich API Documentation Developer Guide

This guide provides comprehensive instructions for developers to maintain, update, and enhance the interactive API documentation system.

## Table of Contentsy

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Adding New API Endpoints](#adding-new-api-endpoints)
5. [Updating OpenAPI Specifications](#updating-openapi-specifications)
6. [Enhancing Interactive Features](#enhancing-interactive-features)
7. [Content Management](#content-management)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Deployment](#deployment)

## Overview

The documentation system is built with:
- **Fumadocs** - Documentation framework
- **Next.js 14** - React framework
- **fumadocs-openapi** - OpenAPI integration
- **MDX** - Markdown with JSX components
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Architecture

```
apps/docs/
├── content/                 # MDX documentation files
│   ├── index.mdx           # Homepage
│   ├── getting-started/    # Getting started guides
│   └── api/                # API documentation
├── src/
│   ├── app/                # Next.js app router
│   ├── components/         # React components
│   └── lib/                # Utilities and configuration
├── generated/              # Auto-generated OpenAPI files
├── scripts/                # Build and generation scripts
└── public/                 # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to backend OpenAPI specification

### Development Setup

1. **Install dependencies:**
```bash
cd apps/docs
npm install
```

2. **Start development server:**
```bash
npm run dev -- --port 3002  # Use custom port to avoid conflicts
```

3. **Access documentation:**
```
http://localhost:3002
```

### Environment Variables

Create `.env.local` file:
```bash
# Backend API URL for interactive testing
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Optional: Authentication for protected endpoints
NEXT_PUBLIC_API_KEY=your-api-key
```

## Adding New API Endpoints

### 1. Update Backend API

First, ensure your new endpoint is properly documented with Swagger decorators:

```typescript
// In your controller
@ApiOperation({
  summary: 'Create new resource',
  description: 'Creates a new resource with the provided data'
})
@ApiResponse({
  status: 201,
  description: 'Resource created successfully',
  type: CreateResourceResponseDto
})
@ApiResponse({
  status: 400,
  description: 'Invalid input data',
  type: ValidationErrorDto
})
@Post('/resources')
async createResource(@Body() createDto: CreateResourceDto) {
  // Implementation
}
```

### 2. Regenerate OpenAPI Specification

```bash
# From backend directory
cd apps/backend
npm run generate:openapi

# From docs directory
cd apps/docs
npm run api:sync
```

### 3. Update Documentation

Create or update MDX files in `content/api/`:

```mdx
---
title: Resources API
description: Manage application resources
---

# Resources API

Complete CRUD operations for managing resources.

## Create Resource

Creates a new resource in the system.

### Request Example

```json
{
  "name": "My Resource",
  "description": "Resource description",
  "type": "standard"
}
```

### Response Example

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "My Resource",
  "description": "Resource description",
  "type": "standard",
  "createdAt": "2024-01-01T00:00:00Z"
}
```
```

### 4. Update Navigation

Update `content/meta.json`:

```json
{
  "navigation": [
    {
      "title": "API Reference",
      "url": "/docs/api",
      "children": [
        {
          "title": "Users API",
          "url": "/docs/api/users"
        },
        {
          "title": "Resources API",
          "url": "/docs/api/resources"
        }
      ]
    }
  ]
}
```

## Updating OpenAPI Specifications

### Automated Updates

Set up automated regeneration in your CI/CD pipeline:

```yaml
# .github/workflows/docs-update.yml
name: Update API Documentation

on:
  push:
    branches: [main]
    paths: ['apps/backend/src/**/*.ts']

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate OpenAPI spec
        run: |
          cd apps/backend
          npm run generate:openapi
          
      - name: Update documentation
        run: |
          cd apps/docs
          npm run api:sync
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add apps/docs/generated/
          git commit -m "Update API documentation" || exit 0
          git push
```

### Manual Updates

When making breaking changes:

1. **Update the OpenAPI spec:**
```bash
cd apps/backend
npm run generate:openapi
```

2. **Review changes:**
```bash
cd apps/docs
git diff generated/user-api-spec.json
```

3. **Update examples and descriptions:**
   - Review generated documentation
   - Update MDX files with new examples
   - Add migration notes for breaking changes

4. **Test interactive features:**
```bash
npm run dev
# Test API playground functionality
```

## Enhancing Interactive Features

### Adding Code Examples

Create reusable code example components:

```tsx
// src/components/CodeExample.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CodeExampleProps {
  endpoint: string;
  method: string;
  requestBody?: object;
}

export function CodeExample({ endpoint, method, requestBody }: CodeExampleProps) {
  const curlExample = `curl -X ${method} \\
  ${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN"${requestBody ? ` \\
  -d '${JSON.stringify(requestBody, null, 2)}'` : ''}`;

  const jsExample = `const response = await fetch('${endpoint}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  }${requestBody ? `,
  body: JSON.stringify(${JSON.stringify(requestBody, null, 2)})` : ''}
});

const data = await response.json();`;

  return (
    <Tabs defaultValue="curl">
      <TabsList>
        <TabsTrigger value="curl">cURL</TabsTrigger>
        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
      </TabsList>
      <TabsContent value="curl">
        <pre><code>{curlExample}</code></pre>
      </TabsContent>
      <TabsContent value="javascript">
        <pre><code>{jsExample}</code></pre>
      </TabsContent>
    </Tabs>
  );
}
```

### Adding Interactive Playground

Create API testing components:

```tsx
// src/components/ApiPlayground.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ApiPlaygroundProps {
  endpoint: string;
  method: string;
  schema?: object;
}

export function ApiPlayground({ endpoint, method, schema }: ApiPlaygroundProps) {
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('api_token') || 'demo-token'}`
        },
        body: method !== 'GET' ? requestBody : undefined
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Try it out</h3>
      
      {method !== 'GET' && (
        <div>
          <label className="block text-sm font-medium mb-2">Request Body</label>
          <Textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder="Enter JSON request body"
            rows={6}
          />
        </div>
      )}
      
      <Button onClick={handleTest} disabled={loading}>
        {loading ? 'Testing...' : `Test ${method} ${endpoint}`}
      </Button>
      
      {response && (
        <div>
          <label className="block text-sm font-medium mb-2">Response</label>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            <code>{response}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
```

### Use in MDX

```mdx
import { CodeExample } from '@/components/CodeExample';
import { ApiPlayground } from '@/components/ApiPlayground';

# Create User

<CodeExample 
  endpoint="/api/v1/users"
  method="POST"
  requestBody={{
    name: "John Doe",
    email: "john@example.com",
    role: "user"
  }}
/>

<ApiPlayground 
  endpoint="/api/v1/users"
  method="POST"
/>
```

## Content Management

### Writing Effective API Documentation

1. **Structure each endpoint page:**
```mdx
---
title: Endpoint Name
description: Brief description
---

# Endpoint Name

Brief overview of what this endpoint does.

## Authentication

Required authentication method.

## Parameters

### Path Parameters
- `id` (string): Resource identifier

### Query Parameters
- `limit` (number): Maximum results (default: 10)

### Request Body
Description of request structure.

## Response

### Success Response (200)
Description and example.

### Error Responses
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid authentication
- `404 Not Found`: Resource not found

## Examples

### Request
```json
{
  "example": "data"
}
```

### Response
```json
{
  "result": "success"
}
```

## Code Examples

<CodeExample endpoint="/api/endpoint" method="POST" />

## Try It Out

<ApiPlayground endpoint="/api/endpoint" method="POST" />
```

2. **Use consistent formatting:**
   - Always include authentication requirements
   - Provide realistic examples
   - Document all possible error responses
   - Include rate limiting information

3. **Keep content up to date:**
   - Review documentation with each API change
   - Update examples when response formats change
   - Add deprecation notices for old endpoints

## Troubleshooting

### Common Issues

1. **Port conflicts (EADDRINUSE):**
```bash
# Use different port
npm run dev -- --port 3002

# Or kill existing process
npx kill-port 3001
```

2. **OpenAPI generation fails:**
```bash
# Check backend is running
cd apps/backend
npm run start:dev

# Verify endpoint accessibility
curl http://localhost:4000/api/docs-json
```

3. **MDX compilation errors:**
   - Check for unescaped curly braces: `{id}` → `\{id\}`
   - Verify component imports
   - Check frontmatter syntax

4. **Interactive features not working:**
   - Verify `NEXT_PUBLIC_API_BASE_URL` is set
   - Check CORS configuration on backend
   - Ensure API is accessible from frontend

### Debugging Steps

1. **Check logs:**
```bash
npm run dev 2>&1 | tee debug.log
```

2. **Verify file generation:**
```bash
ls -la generated/
cat generated/user-api-spec.json | jq '.'
```

3. **Test API connectivity:**
```bash
curl -v http://localhost:4000/api/health
```

## Best Practices

### Documentation Standards

1. **Always include:**
   - Clear descriptions
   - Authentication requirements
   - Parameter validation rules
   - Response examples
   - Error handling

2. **Code quality:**
   - Use TypeScript for all components
   - Follow consistent naming conventions
   - Add proper error boundaries
   - Include loading states

3. **Performance:**
   - Optimize images and assets
   - Use code splitting for large components
   - Implement proper caching headers

### Workflow

1. **Development process:**
   - Make API changes in backend
   - Update Swagger decorators
   - Regenerate OpenAPI spec
   - Update MDX documentation
   - Test interactive features
   - Review and merge

2. **Release process:**
   - Tag releases with version numbers
   - Update changelog
   - Deploy to staging first
   - Verify all links work
   - Deploy to production

## Deployment

### Build Process

```bash
# Build documentation
npm run build

# Export static files (optional)
npm run export

# Start production server
npm start
```

### CI/CD Pipeline

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          cd apps/docs
          npm ci
          
      - name: Build documentation
        run: |
          cd apps/docs
          npm run build
          
      - name: Deploy to hosting
        run: |
          # Your deployment commands here
          echo "Deploy to your hosting platform"
```

### Environment Configuration

Production environment variables:
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_DOCS_URL=https://docs.yourdomain.com
NODE_ENV=production
```

## Maintenance Schedule

### Daily
- Monitor for broken links
- Check API connectivity
- Review user feedback

### Weekly
- Update OpenAPI specifications
- Review and merge documentation PRs
- Update examples with real data

### Monthly
- Audit content for accuracy
- Update dependencies
- Performance review
- User experience improvements

### Quarterly
- Major version updates
- Documentation reorganization
- Accessibility audit
- SEO optimization

---

## Quick Reference

### Useful Commands

```bash
# Development
npm run dev -- --port 3002

# API sync
npm run api:sync

# Build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### File Locations

- **OpenAPI Spec:** `generated/user-api-spec.json`
- **Navigation:** `content/meta.json`
- **Source Config:** `src/lib/source.ts`
- **Components:** `src/components/`
- **Content:** `content/`

### Support

For questions or issues:
1. Check this guide first
2. Review existing GitHub issues
3. Create detailed issue with reproduction steps
4. Include relevant logs and configuration

---

*Last updated: $(date)* 