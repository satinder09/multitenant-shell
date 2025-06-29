# Server-Side API Client with CSRF Protection

This module provides a generic server-side API client that automatically handles CSRF protection for all backend requests from Next.js API routes.

## Features

- ✅ **Automatic CSRF Token Management**: Fetches and caches CSRF tokens automatically
- ✅ **Request Retry Logic**: Automatically retries requests with fresh tokens on CSRF failures
- ✅ **Cookie Forwarding**: Properly forwards authentication cookies from client requests
- ✅ **Header Management**: Handles all necessary headers (Content-Type, X-Forwarded-Host, etc.)
- ✅ **Timeout Protection**: Built-in request timeout handling
- ✅ **Type Safety**: Full TypeScript support with proper interfaces

## Basic Usage

### Import the client

```typescript
import { serverGet, serverPost, serverPut, serverPatch, serverDelete } from '@/lib/api/server-client';
```

### Use in API routes

```typescript
// apps/frontend/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverGet, serverPost } from '@/lib/api/server-client';

export async function GET(req: NextRequest) {
  try {
    const response = await serverGet('/some-endpoint', {}, req);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await serverPost('/some-endpoint', body, {}, req);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
```

## API Reference

### Functions

#### `serverGet(endpoint, options?, request?)`
- **endpoint**: Backend endpoint path (e.g., '/tenants')
- **options**: Optional request options
- **request**: NextRequest object for cookie/header forwarding

#### `serverPost(endpoint, data?, options?, request?)`
- **endpoint**: Backend endpoint path
- **data**: Request body data (will be JSON stringified)
- **options**: Optional request options
- **request**: NextRequest object for cookie/header forwarding

#### `serverPut(endpoint, data?, options?, request?)`
- **endpoint**: Backend endpoint path
- **data**: Request body data
- **options**: Optional request options
- **request**: NextRequest object for cookie/header forwarding

#### `serverPatch(endpoint, data?, options?, request?)`
- **endpoint**: Backend endpoint path
- **data**: Request body data
- **options**: Optional request options
- **request**: NextRequest object for cookie/header forwarding

#### `serverDelete(endpoint, options?, request?)`
- **endpoint**: Backend endpoint path
- **options**: Optional request options
- **request**: NextRequest object for cookie/header forwarding

### Options Interface

```typescript
interface ServerApiOptions extends RequestInit {
  skipCSRF?: boolean;    // Skip CSRF protection (default: false)
  timeout?: number;      // Request timeout in ms (default: 10000)
}
```

## CSRF Protection Details

### How it works

1. **Token Caching**: CSRF tokens are fetched once and cached for 25 minutes
2. **Automatic Inclusion**: Tokens are automatically added to POST/PUT/PATCH/DELETE requests
3. **Retry Logic**: If a request fails with 403 (CSRF error), it automatically refreshes the token and retries
4. **Safe Methods**: GET/HEAD/OPTIONS requests skip CSRF protection

### Backend Endpoint

The client expects the backend to provide a CSRF token endpoint at:
- **GET** `/auth/csrf-token`
- **Response**: Returns token in `X-CSRF-Token` header and response body

### Token Locations

The client will include the CSRF token in these locations:
- `X-CSRF-Token` header (primary)
- `X-XSRF-Token` header (fallback)
- `_csrf` form field (for form data)

## Migration Guide

### Before (manual CSRF handling)

```typescript
// OLD: Manual CSRF token fetching
async function getCSRFToken(backendUrl: string, cookieHeader?: string): Promise<string | null> {
  const response = await fetch(`${backendUrl}/auth/csrf-token`, {
    method: 'GET',
    headers: { 'Cookie': cookieHeader || '' },
  });
  return response.headers.get('X-CSRF-Token');
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const csrfToken = await getCSRFToken(backendUrl, req.headers.get('cookie'));
  
  const response = await fetch(`${backendUrl}/some-endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': req.headers.get('cookie') || '',
      'X-CSRF-Token': csrfToken || '',
    },
    body: JSON.stringify(data),
  });
}
```

### After (generic client)

```typescript
// NEW: Using generic client
import { serverPost } from '@/lib/api/server-client';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await serverPost('/some-endpoint', body, {}, req);
  // CSRF protection is handled automatically!
}
```

## Error Handling

The client includes comprehensive error handling:

```typescript
try {
  const response = await serverPost('/endpoint', data, {}, req);
  
  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json(error, { status: response.status });
  }
  
  const result = await response.json();
  return NextResponse.json(result);
} catch (error) {
  console.error('API error:', error);
  return NextResponse.json(
    { error: 'Request failed', details: error.message }, 
    { status: 500 }
  );
}
```

## Performance Considerations

- **Token Caching**: Tokens are cached to avoid repeated fetches
- **Connection Reuse**: Uses the same HTTP client for efficiency
- **Timeout Protection**: Prevents hanging requests
- **Automatic Retry**: Only retries once on CSRF failures

## Security Features

- **CSRF Protection**: Automatic token management
- **Cookie Security**: Proper cookie forwarding with security headers
- **Request Validation**: Built-in request sanitization
- **Timeout Protection**: Prevents resource exhaustion
- **Error Sanitization**: Safe error message handling

## Examples

See these files for complete examples:
- `apps/frontend/app/api/auth/login/route.ts`
- `apps/frontend/app/api/auth/logout/route.ts`
- `apps/frontend/app/api/tenants/route.ts`
- `apps/frontend/app/api/modules/[module]/route.ts` 