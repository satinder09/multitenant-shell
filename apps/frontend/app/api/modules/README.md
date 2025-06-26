# Universal Module API Endpoint

## Overview

The `/api/modules/[module]` endpoint provides a universal API for retrieving data from any module based on its configuration and table source. This endpoint automatically:

- Discovers the source table from the module name
- Generates the module configuration from the database schema
- Handles complex filtering, searching, sorting, and pagination
- Provides fallback data when the backend is unavailable
- Returns metadata about the module and available fields

## Endpoints

### GET `/api/modules/[module]`
Simple data retrieval with query parameters.

### POST `/api/modules/[module]`
Advanced data retrieval with complex filtering in the request body.

## Supported Modules

The following modules are currently supported:

- `tenants` - Tenant management
- `users` - User management  
- `permissions` - Permission management
- `roles` - Role management
- `impersonation` - Impersonation sessions
- `access-logs` - Access logs

## Request Parameters

### Query Parameters (GET)

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Global search across visible string fields | - |
| `page` | number | Page number for pagination | 1 |
| `limit` | number | Number of items per page | 25 |
| `sortField` | string | Field to sort by | createdAt |
| `sortDirection` | 'asc' \| 'desc' | Sort direction | desc |
| `fields` | string | Comma-separated list of fields to return | all visible |
| `includeConfig` | boolean | Include module configuration in response | false |

### Request Body (POST)

```typescript
interface ModuleDataRequest {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: {
    rootGroup: {
      logic: 'AND' | 'OR';
      rules: FilterRule[];
    }
  };
  fields?: string[];
  includeConfig?: boolean;
}

interface FilterRule {
  field: string;
  operator: string;
  value: any;
  fieldPath?: string[];
}
```

## Response Format

```typescript
interface ModuleDataResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    moduleName: string;
    sourceTable: string;
    totalFiltered: number;
    totalUnfiltered: number;
    availableFields: string[];
  };
  config?: {
    columns: ColumnConfig[];
    actions: ActionConfig[];
    display: DisplayConfig;
    module: ModuleConfig;
  };
}
```

## Usage Examples

### Simple GET Request

```javascript
// Get first 10 tenants
const response = await fetch('/api/modules/tenants?limit=10');
const data = await response.json();
```

### Search with Pagination

```javascript
// Search for users with pagination
const response = await fetch('/api/modules/users?search=john&page=2&limit=25');
const data = await response.json();
```

### Complex Filtering (POST)

```javascript
// Complex filter for active tenants created in the last month
const response = await fetch('/api/modules/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    complexFilter: {
      rootGroup: {
        logic: 'AND',
        rules: [
          {
            field: 'isActive',
            operator: 'equals',
            value: true
          },
          {
            field: 'createdAt',
            operator: 'greater_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    },
    page: 1,
    limit: 50,
    sortBy: {
      field: 'name',
      direction: 'asc'
    }
  })
});
const data = await response.json();
```

### Include Module Configuration

```javascript
// Get data with module configuration
const response = await fetch('/api/modules/tenants?includeConfig=true');
const data = await response.json();

// Access configuration
console.log(data.config.columns); // Column definitions
console.log(data.config.actions); // Available actions
```

### Specific Fields Only

```javascript
// Get only specific fields
const response = await fetch('/api/modules/users?fields=id,name,email,isActive');
const data = await response.json();
```

## Supported Filter Operators

| Operator | Description | Applicable Types |
|----------|-------------|------------------|
| `equals` | Exact match | All |
| `not_equals` | Not equal | All |
| `contains` | Contains substring | String |
| `not_contains` | Does not contain | String |
| `starts_with` | Starts with | String |
| `ends_with` | Ends with | String |
| `greater_than` | Greater than | Number, Date |
| `less_than` | Less than | Number, Date |
| `greater_equal` | Greater or equal | Number, Date |
| `less_equal` | Less or equal | Number, Date |
| `is_empty` | Is null or empty | All |
| `is_not_empty` | Is not null/empty | All |
| `in` | In array | All |
| `not_in` | Not in array | All |

## Backend Integration

The endpoint automatically maps modules to their corresponding backend endpoints:

- `tenants` → `POST /tenants/search`
- `users` → `GET /platform/users`
- `permissions` → `GET /platform-rbac/permissions`
- `roles` → `GET /platform-rbac/roles`
- `impersonation` → `GET /tenant-access/sessions`
- `access-logs` → `GET /platform/access-logs`

## Fallback Behavior

When the backend is unavailable, the endpoint provides:

1. **Mock Data Generation**: Creates sample data based on the module configuration
2. **Client-side Filtering**: Applies filters on the frontend when backend filtering is unavailable
3. **Graceful Degradation**: Returns appropriate error messages with fallback data

## Error Handling

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 404 | Module not found or not configured |
| 500 | Server error |
| 503 | Backend unavailable (with fallback) |

## Adding New Modules

To add a new module:

1. Add the table mapping in `getTableNameFromModule()`
2. Add backend endpoint mapping in `MODULE_BACKEND_MAPPING`
3. Ensure the table schema exists in the Prisma schema
4. The module configuration will be auto-generated

## Integration with Components

This endpoint is designed to work seamlessly with:

- `ConfigDrivenModulePage` component
- `BaseModulePage` component  
- Generic filtering system
- Universal module architecture

## Performance Considerations

- Backend filtering is preferred over client-side filtering
- Pagination is handled efficiently
- Field selection reduces payload size
- Caching can be implemented at the component level 