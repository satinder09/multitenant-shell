# 📡 API Documentation - Enhanced Multitenant Shell Platform

## 📚 Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Platform APIs](#platform-apis)
- [Tenant APIs](#tenant-apis)
- [Performance APIs](#performance-apis)
- [Interactive Examples](#interactive-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK Reference](#sdk-reference)

## 🎯 Overview

The **Enhanced Multitenant Shell Platform** provides a comprehensive REST API with advanced features including automatic tenant context resolution, performance monitoring, and enterprise-grade security.

### **Base URLs**
- **Platform API**: `http://lvh.me:4000/api/platform`
- **Tenant API**: `http://lvh.me:4000/api/tenant`
- **Performance API**: `http://lvh.me:4000/api/performance`
- **Health Check**: `http://lvh.me:4000/api/health`

### **API Features**
- **Automatic tenant context resolution** from subdomain or headers
- **Enhanced caching** with stale-while-revalidate
- **Circuit breaker protection** for resilient operations
- **Real-time performance monitoring** with 100+ metrics
- **Comprehensive error handling** with user-friendly messages
- **Rate limiting** with intelligent backoff

## 🔐 Authentication

### **Authentication Flow**

```typescript
// Enhanced authentication with automatic context resolution
interface AuthenticationFlow {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  refreshSession: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User>;
  validateSession: () => Promise<boolean>;
}

// Login request
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "tenantContext": "optional-tenant-id"
}
```

### **Authentication Headers**

```typescript
// Standard headers for authenticated requests
interface AuthHeaders {
  'Authorization': 'Bearer <jwt-token>';
  'X-Tenant-ID': 'tenant-id';           // Optional: Override tenant context
  'X-User-ID': 'user-id';               // Optional: For impersonation
  'X-Session-ID': 'session-id';         // Optional: For session tracking
}

// Example authenticated request
const response = await fetch('/api/platform/tenants', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'tenant-123'
  }
});
```

### **Session Management**

```typescript
// Session information endpoint
GET /api/auth/session
Authorization: Bearer <token>

// Response
{
  "sessionId": "sess_123456",
  "userId": "user_123",
  "tenantId": "tenant_123",
  "permissions": ["read", "write", "admin"],
  "expiresAt": "2025-01-15T10:30:00Z",
  "refreshToken": "refresh_token_here",
  "isValid": true,
  "lastActivity": "2025-01-15T09:45:00Z"
}
```

## 🏗️ Platform APIs

### **Tenant Management**

#### **GET /api/platform/tenants**
List all tenants with pagination and filtering.

```typescript
// Request
GET /api/platform/tenants?page=1&limit=10&search=acme&status=active

// Response
{
  "tenants": [
    {
      "id": "tenant_123",
      "name": "Acme Corp",
      "subdomain": "acme",
      "status": "active",
      "plan": "enterprise",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z",
      "metadata": {
        "industry": "technology",
        "size": "large",
        "region": "us-west"
      },
      "stats": {
        "totalUsers": 150,
        "activeUsers": 120,
        "storageUsed": "2.5GB",
        "apiCalls": 50000
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "status": ["active", "inactive", "suspended"],
    "plan": ["free", "pro", "enterprise"],
    "region": ["us-west", "us-east", "eu-west"]
  }
}
```

#### **POST /api/platform/tenants**
Create a new tenant.

```typescript
// Request
POST /api/platform/tenants
Content-Type: application/json

{
  "name": "New Company",
  "subdomain": "newcompany",
  "plan": "pro",
  "adminEmail": "admin@newcompany.com",
  "metadata": {
    "industry": "healthcare",
    "size": "medium",
    "region": "us-east"
  },
  "features": {
    "customBranding": true,
    "ssoEnabled": true,
    "apiAccess": true
  }
}

// Response
{
  "tenant": {
    "id": "tenant_456",
    "name": "New Company",
    "subdomain": "newcompany",
    "status": "active",
    "plan": "pro",
    "createdAt": "2025-01-15T10:30:00Z",
    "apiKey": "ak_live_123456789",
    "webhookSecret": "whsec_123456789"
  },
  "setupTasks": [
    {
      "id": "setup_admin",
      "title": "Set up admin user",
      "status": "pending",
      "url": "/setup/admin"
    },
    {
      "id": "configure_sso",
      "title": "Configure SSO",
      "status": "pending",
      "url": "/setup/sso"
    }
  ]
}
```

#### **GET /api/platform/tenants/:id**
Get detailed tenant information.

```typescript
// Request
GET /api/platform/tenants/tenant_123

// Response
{
  "tenant": {
    "id": "tenant_123",
    "name": "Acme Corp",
    "subdomain": "acme",
    "status": "active",
    "plan": "enterprise",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z",
    "metadata": {
      "industry": "technology",
      "size": "large",
      "region": "us-west"
    },
    "features": {
      "customBranding": true,
      "ssoEnabled": true,
      "apiAccess": true,
      "advancedAnalytics": true
    },
    "limits": {
      "maxUsers": 500,
      "maxStorage": "10GB",
      "maxApiCalls": 100000
    },
    "usage": {
      "currentUsers": 150,
      "currentStorage": "2.5GB",
      "currentApiCalls": 50000
    }
  },
  "recentActivity": [
    {
      "timestamp": "2025-01-15T09:30:00Z",
      "action": "user_login",
      "user": "john@acme.com",
      "details": "Successful login from 192.168.1.1"
    }
  ],
  "performanceMetrics": {
    "avgResponseTime": 245,
    "errorRate": 0.002,
    "uptime": 99.99
  }
}
```

### **User Management**

#### **GET /api/platform/users**
List platform users with role-based filtering.

```typescript
// Request
GET /api/platform/users?role=admin&tenant=tenant_123

// Response
{
  "users": [
    {
      "id": "user_123",
      "email": "admin@acme.com",
      "name": "John Admin",
      "role": "tenant_admin",
      "tenantId": "tenant_123",
      "status": "active",
      "lastLogin": "2025-01-15T09:30:00Z",
      "permissions": [
        "tenant.read",
        "tenant.write",
        "users.manage",
        "settings.configure"
      ],
      "profile": {
        "avatar": "https://example.com/avatar.jpg",
        "timezone": "America/Los_Angeles",
        "language": "en-US"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

## 🏢 Tenant APIs

### **Tenant Context Resolution**

The API automatically resolves tenant context from:
1. **Subdomain**: `https://acme.yourdomain.com/api/...`
2. **X-Tenant-ID header**: `X-Tenant-ID: tenant_123`
3. **JWT token claims**: Embedded tenant information

```typescript
// Automatic tenant context resolution
interface TenantContext {
  tenantId: string;
  subdomain: string;
  metadata: TenantMetadata;
  permissions: string[];
  limits: TenantLimits;
}

// Example: All tenant API calls automatically include context
GET /api/tenant/dashboard
// Automatically resolves to tenant based on subdomain or headers
```

### **Dashboard Data**

#### **GET /api/tenant/dashboard**
Get comprehensive tenant dashboard data.

```typescript
// Request
GET /api/tenant/dashboard

// Response
{
  "summary": {
    "totalUsers": 150,
    "activeUsers": 120,
    "newUsersToday": 5,
    "totalProjects": 25,
    "activeProjects": 18,
    "storageUsed": "2.5GB",
    "storageLimit": "10GB"
  },
  "charts": {
    "userGrowth": {
      "timeframe": "30d",
      "data": [
        { "date": "2025-01-01", "users": 100 },
        { "date": "2025-01-15", "users": 150 }
      ]
    },
    "activityHeatmap": {
      "timeframe": "7d",
      "data": [
        { "hour": 9, "day": "monday", "activity": 45 },
        { "hour": 10, "day": "monday", "activity": 67 }
      ]
    }
  },
  "recentActivity": [
    {
      "timestamp": "2025-01-15T09:30:00Z",
      "type": "user_action",
      "user": "john@acme.com",
      "action": "created_project",
      "details": "Project 'Q1 Launch' created"
    }
  ],
  "alerts": [
    {
      "id": "alert_123",
      "type": "info",
      "message": "Your plan will renew on January 31st",
      "actions": [
        {
          "label": "Review Plan",
          "url": "/settings/billing"
        }
      ]
    }
  ]
}
```

### **Tenant Settings**

#### **GET /api/tenant/settings**
Get tenant configuration settings.

```typescript
// Request
GET /api/tenant/settings

// Response
{
  "general": {
    "name": "Acme Corp",
    "description": "Leading technology company",
    "timezone": "America/Los_Angeles",
    "dateFormat": "MM/DD/YYYY",
    "language": "en-US"
  },
  "branding": {
    "logoUrl": "https://example.com/logo.png",
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "customCss": "/* Custom styles */",
    "favicon": "https://example.com/favicon.ico"
  },
  "security": {
    "ssoEnabled": true,
    "ssoProvider": "okta",
    "mfaRequired": true,
    "sessionTimeout": 3600,
    "passwordPolicy": {
      "minLength": 8,
      "requireUppercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    }
  },
  "features": {
    "customBranding": true,
    "apiAccess": true,
    "advancedAnalytics": true,
    "exportData": true
  },
  "notifications": {
    "email": {
      "enabled": true,
      "frequency": "daily"
    },
    "slack": {
      "enabled": false,
      "webhookUrl": ""
    }
  }
}
```

#### **PUT /api/tenant/settings**
Update tenant settings.

```typescript
// Request
PUT /api/tenant/settings
Content-Type: application/json

{
  "general": {
    "name": "Acme Corporation",
    "description": "Updated description"
  },
  "branding": {
    "primaryColor": "#ff6b6b"
  },
  "security": {
    "sessionTimeout": 7200
  }
}

// Response
{
  "success": true,
  "message": "Settings updated successfully",
  "updatedFields": ["general.name", "general.description", "branding.primaryColor", "security.sessionTimeout"],
  "validationErrors": [],
  "settings": {
    // ... updated settings object
  }
}
```

## ⚡ Performance APIs

### **Performance Metrics**

#### **GET /api/performance/metrics**
Get real-time performance metrics.

```typescript
// Request
GET /api/performance/metrics?timeframe=1h&granularity=5m

// Response
{
  "overview": {
    "avgResponseTime": 245,
    "errorRate": 0.002,
    "throughput": 1250,
    "uptime": 99.99,
    "cacheHitRatio": 0.92
  },
  "timeSeries": {
    "responseTime": [
      { "timestamp": "2025-01-15T09:00:00Z", "value": 230 },
      { "timestamp": "2025-01-15T09:05:00Z", "value": 245 }
    ],
    "errorRate": [
      { "timestamp": "2025-01-15T09:00:00Z", "value": 0.001 },
      { "timestamp": "2025-01-15T09:05:00Z", "value": 0.002 }
    ]
  },
  "breakdown": {
    "byEndpoint": [
      {
        "endpoint": "/api/tenant/dashboard",
        "requests": 1500,
        "avgResponseTime": 180,
        "errorRate": 0.001
      }
    ],
    "byTenant": [
      {
        "tenantId": "tenant_123",
        "requests": 800,
        "avgResponseTime": 210,
        "errorRate": 0.0005
      }
    ]
  },
  "insights": {
    "score": 95,
    "recommendations": [
      "Cache hit ratio is excellent (92%)",
      "Response times are within acceptable range"
    ],
    "alerts": []
  }
}
```

### **Cache Performance**

#### **GET /api/performance/cache**
Get detailed cache performance metrics.

```typescript
// Request
GET /api/performance/cache

// Response
{
  "overview": {
    "hitRatio": 0.92,
    "missRatio": 0.08,
    "totalRequests": 10000,
    "cacheHits": 9200,
    "cacheMisses": 800,
    "avgLookupTime": 0.5,
    "memoryUsage": "45MB",
    "memoryLimit": "100MB"
  },
  "byCache": {
    "tenantCache": {
      "size": 50,
      "maxSize": 100,
      "hitRatio": 0.95,
      "evictions": 5,
      "staleSenes": 120
    },
    "userCache": {
      "size": 200,
      "maxSize": 500,
      "hitRatio": 0.88,
      "evictions": 15,
      "staleSenes": 45
    }
  },
  "performance": {
    "backgroundRefreshes": 25,
    "staleWhileRevalidate": 120,
    "cacheWarmups": 3,
    "evictionPolicy": "LRU"
  },
  "recommendations": [
    "Consider increasing tenant cache size for better hit ratio",
    "Background refresh is working optimally"
  ]
}
```

### **Health Check**

#### **GET /api/health**
Comprehensive health check with detailed system status.

```typescript
// Request
GET /api/health

// Response
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "2.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 12,
      "connections": {
        "active": 5,
        "idle": 15,
        "total": 20
      }
    },
    "cache": {
      "status": "healthy",
      "responseTime": 1,
      "memoryUsage": "45MB",
      "hitRatio": 0.92
    },
    "authentication": {
      "status": "healthy",
      "responseTime": 45,
      "activeSession": 250
    }
  },
  "metrics": {
    "cpu": 45.2,
    "memory": 62.1,
    "disk": 34.5,
    "network": {
      "inbound": "125 Mbps",
      "outbound": "89 Mbps"
    }
  },
  "checks": [
    {
      "name": "Database Connection",
      "status": "pass",
      "responseTime": 12,
      "lastCheck": "2025-01-15T10:29:45Z"
    },
    {
      "name": "External API",
      "status": "pass",
      "responseTime": 145,
      "lastCheck": "2025-01-15T10:29:50Z"
    }
  ]
}
```

## 💡 Interactive Examples

### **JavaScript/TypeScript SDK Usage**

```typescript
// Initialize the enhanced API client
import { createBrowserApiClient } from '@/shared/services/api-client';

const apiClient = createBrowserApiClient({
  baseURL: 'http://lvh.me:4000/api',
  timeout: 10000,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000
  }
});

// Authentication
const authResponse = await apiClient.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// Set auth token for subsequent requests
apiClient.setAuthToken(authResponse.data.token);

// Tenant operations (automatically resolves context)
const tenants = await apiClient.get('/platform/tenants', {
  params: {
    page: 1,
    limit: 10,
    status: 'active'
  }
});

// Create tenant
const newTenant = await apiClient.post('/platform/tenants', {
  name: 'New Company',
  subdomain: 'newcompany',
  plan: 'pro'
});

// Get tenant dashboard (context-aware)
const dashboard = await apiClient.get('/tenant/dashboard');

// Update tenant settings
const settings = await apiClient.put('/tenant/settings', {
  general: {
    name: 'Updated Company Name'
  }
});

// Performance monitoring
const metrics = await apiClient.get('/performance/metrics', {
  params: {
    timeframe: '1h',
    granularity: '5m'
  }
});
```

### **React Hook Examples**

```typescript
// Custom hooks for API integration
import { useAuth } from '@/domains/auth';
import { usePlatform } from '@/context/PlatformContext';

// Tenant dashboard hook
function useTenantDashboard() {
  const { tenantId } = usePlatform();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tenantId) {
      apiClient.get('/tenant/dashboard')
        .then(response => {
          setDashboard(response.data);
          setError(null);
        })
        .catch(error => {
          setError(error.message);
          setDashboard(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tenantId]);

  return { dashboard, loading, error };
}

// Performance metrics hook
function usePerformanceMetrics(timeframe = '1h') {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiClient.get('/performance/metrics', {
          params: { timeframe }
        });
        setMetrics(response.data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [timeframe]);

  return { metrics, loading };
}

// Usage in components
function DashboardComponent() {
  const { dashboard, loading, error } = useTenantDashboard();
  const { metrics } = usePerformanceMetrics('1h');

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Active Users: {dashboard.summary.activeUsers}</div>
      <div>Response Time: {metrics?.overview.avgResponseTime}ms</div>
    </div>
  );
}
```

### **cURL Examples**

```bash
# Authentication
curl -X POST http://lvh.me:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Get tenants (with authentication)
curl -X GET http://lvh.me:4000/api/platform/tenants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Create tenant
curl -X POST http://lvh.me:4000/api/platform/tenants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company",
    "subdomain": "newcompany",
    "plan": "pro"
  }'

# Get tenant dashboard (context-aware)
curl -X GET http://lvh.me:4000/api/tenant/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-ID: tenant_123"

# Performance metrics
curl -X GET "http://lvh.me:4000/api/performance/metrics?timeframe=1h" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Health check (no auth required)
curl -X GET http://lvh.me:4000/api/health
```

## 🚨 Error Handling

### **Error Response Format**

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    userMessage: string;
    details?: any;
    timestamp: string;
    requestId: string;
    shouldRetry: boolean;
    retryAfter?: number;
  };
  meta?: {
    suggestions: string[];
    documentation: string;
    supportContact: string;
  };
}

// Example error response
{
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant with ID 'tenant_123' not found",
    "userMessage": "The requested organization could not be found. Please check the URL and try again.",
    "details": {
      "tenantId": "tenant_123",
      "resolvedFrom": "subdomain"
    },
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_123456",
    "shouldRetry": false
  },
  "meta": {
    "suggestions": [
      "Verify the organization subdomain in the URL",
      "Contact your administrator if you believe this is an error"
    ],
    "documentation": "https://docs.yourdomain.com/errors/tenant-not-found",
    "supportContact": "support@yourdomain.com"
  }
}
```

### **Common Error Codes**

| Code | HTTP Status | Description | Retry |
|------|-------------|-------------|-------|
| `AUTHENTICATION_REQUIRED` | 401 | Authentication token required | No |
| `INVALID_TOKEN` | 401 | JWT token is invalid or expired | No |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions | No |
| `TENANT_NOT_FOUND` | 404 | Tenant not found or inaccessible | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Yes |
| `VALIDATION_ERROR` | 422 | Request validation failed | No |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Yes |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Yes |

### **Client-side Error Handling**

```typescript
// Enhanced error handling with automatic retry
class APIError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public shouldRetry: boolean = false,
    public retryAfter?: number,
    public details?: any
  ) {
    super(userMessage);
    this.name = 'APIError';
  }
}

// Error handling middleware
const handleApiError = (error: any): APIError => {
  if (error.response?.data?.error) {
    const errorData = error.response.data.error;
    return new APIError(
      errorData.code,
      errorData.userMessage,
      errorData.shouldRetry,
      errorData.retryAfter,
      errorData.details
    );
  }
  
  return new APIError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred. Please try again.',
    true
  );
};

// Usage with automatic retry
async function makeApiCall(url: string, options: any) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        const apiError = handleApiError({ response: { data: errorData } });
        
        if (apiError.shouldRetry && attempts < maxAttempts - 1) {
          const delay = apiError.retryAfter || Math.pow(2, attempts) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }
        
        throw apiError;
      }
      
      return response.json();
    } catch (error) {
      if (attempts === maxAttempts - 1) {
        throw error;
      }
      attempts++;
    }
  }
}
```

## 🔒 Rate Limiting

### **Rate Limit Headers**

```typescript
// Rate limiting information in response headers
interface RateLimitHeaders {
  'X-RateLimit-Limit': string;      // Maximum requests per window
  'X-RateLimit-Remaining': string;  // Remaining requests in current window
  'X-RateLimit-Reset': string;      // Unix timestamp when window resets
  'X-RateLimit-Window': string;     // Window size in seconds
  'Retry-After': string;            // Seconds to wait before retry (on 429)
}

// Example response headers
{
  'X-RateLimit-Limit': '1000',
  'X-RateLimit-Remaining': '995',
  'X-RateLimit-Reset': '1642262400',
  'X-RateLimit-Window': '3600'
}
```

### **Rate Limit Tiers**

| Tier | Requests/Hour | Burst Limit | Description |
|------|---------------|-------------|-------------|
| **Free** | 1,000 | 100 | Basic API access |
| **Pro** | 10,000 | 500 | Standard business use |
| **Enterprise** | 100,000 | 2,000 | High-volume applications |
| **Custom** | Unlimited | Custom | Enterprise contracts |

### **Rate Limit Handling**

```typescript
// Intelligent rate limit handling
class RateLimitHandler {
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  async handleRequest(url: string, options: any): Promise<any> {
    const key = this.getRateLimitKey(url);
    const info = this.rateLimitInfo.get(key);

    // Check if we're rate limited
    if (info && info.remaining <= 0 && Date.now() < info.resetTime) {
      const waitTime = info.resetTime - Date.now();
      throw new APIError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        true,
        Math.ceil(waitTime / 1000)
      );
    }

    try {
      const response = await fetch(url, options);
      
      // Update rate limit info from headers
      this.updateRateLimitInfo(key, response.headers);
      
      return response;
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers['Retry-After'] || '60');
        throw new APIError(
          'RATE_LIMIT_EXCEEDED',
          `Too many requests. Please wait ${retryAfter} seconds.`,
          true,
          retryAfter
        );
      }
      throw error;
    }
  }

  private updateRateLimitInfo(key: string, headers: Headers) {
    const limit = parseInt(headers.get('X-RateLimit-Limit') || '0');
    const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0');
    const reset = parseInt(headers.get('X-RateLimit-Reset') || '0');

    this.rateLimitInfo.set(key, {
      limit,
      remaining,
      resetTime: reset * 1000 // Convert to milliseconds
    });
  }
}
```

## 🛠️ SDK Reference

### **Browser API Client**

```typescript
// Enhanced browser API client with all features
import { BrowserApiClient } from '@/shared/services/api-client';

const client = new BrowserApiClient({
  baseURL: 'http://lvh.me:4000/api',
  timeout: 10000,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    retryCondition: (error) => {
      return error.shouldRetry || error.status >= 500;
    }
  },
  cacheConfig: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  performanceMonitoring: {
    enabled: true,
    trackMetrics: true,
    sendAnalytics: false
  }
});

// Authentication methods
client.setAuthToken(token);
client.clearAuthToken();
client.isAuthenticated();

// Tenant context
client.setTenantId(tenantId);
client.getTenantId();

// Request methods with automatic context resolution
const response = await client.get('/tenant/dashboard');
const created = await client.post('/tenant/users', userData);
const updated = await client.put('/tenant/settings', settings);
const deleted = await client.delete('/tenant/users/123');

// Performance monitoring
const metrics = client.getPerformanceMetrics();
const debugInfo = client.getDebugInfo();
```

### **React Integration**

```typescript
// React provider for API client
import { ApiClientProvider, useApiClient } from '@/shared/services/api-client';

function App() {
  return (
    <ApiClientProvider baseURL="http://lvh.me:4000/api">
      <Dashboard />
    </ApiClientProvider>
  );
}

function Dashboard() {
  const apiClient = useApiClient();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiClient.get('/tenant/dashboard')
      .then(response => setData(response.data))
      .catch(error => console.error('Error:', error));
  }, [apiClient]);

  return (
    <div>
      {data && (
        <div>
          <h1>Dashboard</h1>
          <p>Active Users: {data.summary.activeUsers}</p>
        </div>
      )}
    </div>
  );
}
```

### **Error Boundary Integration**

```typescript
// Enhanced error boundary for API errors
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function ApiErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleError = (error: Error, errorInfo: any) => {
    if (error instanceof APIError) {
      // Handle API errors specifically
      if (error.code === 'AUTHENTICATION_REQUIRED') {
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (error.shouldRetry) {
        // Show retry option
        console.log('Retrying in', error.retryAfter, 'seconds');
        return;
      }
    }
    
    // Log error for monitoring
    console.error('API Error:', error, errorInfo);
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={({ error, retry }) => (
        <div className="api-error">
          <h2>Something went wrong</h2>
          <p>{error.userMessage || error.message}</p>
          {error.shouldRetry && (
            <button onClick={retry}>
              Retry {error.retryAfter && `(${error.retryAfter}s)`}
            </button>
          )}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 🔗 Related Documentation

- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Platform Context Guide](./PLATFORM_CONTEXT_GUIDE.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Last Updated**: January 2025  
**Version**: 2.0 (Enhanced API System)  
**Maintainer**: Platform Team 