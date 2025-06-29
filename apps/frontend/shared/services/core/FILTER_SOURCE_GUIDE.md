# Dynamic Filter Source System

The Dynamic Filter Source System provides a powerful way to populate dropdown filters and other filter components with data from various sources including APIs, database queries, tables, and custom functions.

## Overview

Instead of hardcoding filter options, you can now configure dynamic data sources that:
- Load data from REST APIs with search and pagination
- Execute database queries with parameters
- Query tables with conditions and sorting
- Call custom functions for complex logic
- Support caching, error handling, and fallback data
- Provide rich options with colors and descriptions

## Configuration Types

### 1. Static Options (Legacy Support)

```typescript
{
  field: 'department',
  filterSource: {
    type: 'static',
    options: [
      { value: 'engineering', label: 'Engineering', color: '#3b82f6' },
      { value: 'marketing', label: 'Marketing', color: '#ef4444' }
    ]
  }
}
```

### 2. API-Based Sources

```typescript
{
  field: 'role',
  filterSource: {
    type: 'api',
    api: {
      url: '/api/filters/dropdown-options',
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
      params: { field: 'role', module: 'users' },
      body: { additionalData: 'value' },
      
      // Field mapping for response data
      mapping: {
        value: 'id',           // Maps to option.value
        label: 'name',         // Maps to option.label
        color: 'color',        // Maps to option.color (optional)
        description: 'desc'    // Maps to option.description (optional)
      },
      
      // Response structure
      dataPath: 'data.options',    // Path to array in response
      totalPath: 'data.total',     // Path to total count
      
      // Caching (optional)
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000,      // 10 minutes
        key: 'user-roles'         // Custom cache key
      },
      
      // Search support (optional)
      searchable: {
        enabled: true,
        param: 'search',          // Search parameter name
        minLength: 2,             // Minimum search length
        debounce: 300             // Debounce delay in ms
      },
      
      // Pagination support (optional)
      pagination: {
        enabled: true,
        pageParam: 'page',        // Page parameter name
        sizeParam: 'limit',       // Size parameter name
        defaultSize: 50           // Default page size
      }
    },
    
    // Error handling
    fallback: [
      { value: 'admin', label: 'Administrator', color: '#dc2626' }
    ],
    errorMessage: 'Failed to load roles'
  }
}
```

### 3. Database Query Sources

```typescript
{
  field: 'manager',
  filterSource: {
    type: 'query',
    query: {
      sql: `
        SELECT u.id as value, 
               CONCAT(u.first_name, ' ', u.last_name) as label,
               CASE WHEN u.is_super_admin THEN '#dc2626' ELSE '#6b7280' END as color,
               u.email as description
        FROM users u 
        WHERE u.is_manager = true 
          AND u.active = true 
        ORDER BY u.first_name, u.last_name
      `,
      params: { department: 'engineering' },
      
      mapping: {
        value: 'value',
        label: 'label',
        color: 'color',
        description: 'description'
      },
      
      cache: {
        enabled: true,
        ttl: 15 * 60 * 1000,
        key: 'active-managers'
      }
    },
    
    // Transform function (optional)
    transform: (data) => data.map(item => ({
      ...item,
      label: `${item.label} (${item.description})`
    })),
    
    fallback: [
      { value: 'system', label: 'System Manager' }
    ]
  }
}
```

### 4. Table-Based Sources

```typescript
{
  field: 'location',
  filterSource: {
    type: 'table',
    table: {
      name: 'locations',
      valueColumn: 'code',
      labelColumn: 'name',
      colorColumn: 'color',        // Optional
      descriptionColumn: 'country', // Optional
      
      // Filtering
      where: { active: true, region: 'APAC' },
      orderBy: ['name ASC', 'country ASC'],
      limit: 100,
      
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000,
        key: 'active-locations'
      }
    },
    
    fallback: [
      { value: 'us', label: 'United States', description: 'North America' }
    ]
  }
}
```

### 5. Function-Based Sources

```typescript
{
  field: 'customField',
  filterSource: {
    type: 'function',
    function: {
      name: 'getCustomOptions',
      params: { 
        userId: 'current',
        includeInactive: false 
      },
      
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000,
        key: 'custom-options'
      }
    },
    
    fallback: [
      { value: 'default', label: 'Default Option' }
    ]
  }
}
```

## API Response Format

### Expected Response Structure

```json
{
  "data": {
    "options": [
      {
        "id": "admin",
        "name": "Administrator", 
        "color": "#dc2626",
        "description": "Full system access"
      }
    ],
    "total": 25,
    "page": 1,
    "hasMore": true
  },
  "success": true
}
```

### Error Response

```json
{
  "error": "Failed to load options",
  "success": false
}
```

## Backend Implementation

### Creating Filter API Endpoints

```typescript
// /api/filters/dropdown-options/route.ts
export async function POST(request: NextRequest) {
  const { field, module, search, page = 1, limit = 50 } = await request.json();
  
  // Your data loading logic here
  const data = await loadFilterOptions(module, field, search, page, limit);
  
  return NextResponse.json({
    data: {
      options: data.items,
      total: data.total,
      page,
      limit,
      hasMore: data.hasMore
    },
    success: true
  });
}
```

### Query Endpoint

```typescript
// /api/filters/query/route.ts
export async function POST(request: NextRequest) {
  const { sql, params, mapping, search, page, pageSize } = await request.json();
  
  // Execute SQL query with parameters
  const results = await executeQuery(sql, params);
  
  // Apply search filter if provided
  // Apply pagination
  // Map results using mapping configuration
  
  return NextResponse.json({
    options: mappedResults,
    total: totalCount
  });
}
```

### Table Endpoint

```typescript
// /api/filters/table/route.ts
export async function POST(request: NextRequest) {
  const { 
    name, 
    valueColumn, 
    labelColumn, 
    colorColumn, 
    descriptionColumn,
    where, 
    orderBy, 
    limit,
    search,
    page,
    pageSize 
  } = await request.json();
  
  // Build and execute table query
  const results = await queryTable(name, {
    select: [valueColumn, labelColumn, colorColumn, descriptionColumn],
    where,
    orderBy,
    limit,
    search,
    page,
    pageSize
  });
  
  return NextResponse.json({
    options: results.map(row => ({
      value: row[valueColumn],
      label: row[labelColumn],
      color: row[colorColumn],
      description: row[descriptionColumn]
    })),
    total: results.total
  });
}
```

## Usage Examples

### Basic Dropdown with API Source

```typescript
{
  field: 'status',
  display: 'Status',
  type: 'string',
  filterable: true,
  popular: true,
  popularFilter: {
    field: 'status',
    operator: 'equals',
    label: 'Filter by Status'
  },
  filterSource: {
    type: 'api',
    api: {
      url: '/api/filters/dropdown-options',
      method: 'POST',
      params: { field: 'status', module: 'users' },
      mapping: { value: 'id', label: 'name', color: 'color' },
      dataPath: 'data.options'
    }
  }
}
```

### Searchable Dropdown with Caching

```typescript
{
  field: 'assignee',
  filterSource: {
    type: 'api',
    api: {
      url: '/api/users/search',
      mapping: { value: 'id', label: 'fullName', description: 'email' },
      searchable: {
        enabled: true,
        param: 'q',
        minLength: 3,
        debounce: 500
      },
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000
      }
    },
    fallback: [
      { value: 'unassigned', label: 'Unassigned' }
    ]
  }
}
```

### Complex Query with Transform

```typescript
{
  field: 'reportingManager',
  filterSource: {
    type: 'query',
    query: {
      sql: `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as full_name,
          d.name as department,
          u.email
        FROM users u
        JOIN departments d ON u.department_id = d.id
        WHERE u.is_manager = true
        ORDER BY u.first_name
      `,
      mapping: {
        value: 'id',
        label: 'full_name',
        description: 'department'
      }
    },
    transform: (data) => data.map(item => ({
      ...item,
      label: `${item.label} - ${item.description}`,
      color: getDepartmentColor(item.description)
    }))
  }
}
```

## Advanced Features

### Conditional Filter Sources

```typescript
{
  field: 'subcategory',
  filterSource: {
    type: 'api',
    api: {
      url: '/api/subcategories',
      params: { 
        categoryId: '${filters.category}' // Dynamic parameter
      },
      mapping: { value: 'id', label: 'name' }
    }
  }
}
```

### Multi-level Caching

```typescript
{
  filterSource: {
    type: 'api',
    api: {
      url: '/api/expensive-data',
      cache: {
        enabled: true,
        ttl: 60 * 60 * 1000, // 1 hour
        key: 'expensive-data-${user.id}' // User-specific cache
      }
    }
  }
}
```

### Error Handling with Retry

```typescript
{
  filterSource: {
    type: 'api',
    api: {
      url: '/api/unreliable-source',
      retries: 3,
      retryDelay: 1000
    },
    fallback: [
      { value: 'fallback', label: 'Fallback Option' }
    ],
    errorMessage: 'Unable to load data, showing fallback options'
  }
}
```

## Performance Considerations

### Caching Strategy
- Use appropriate TTL values based on data volatility
- Implement user-specific cache keys when needed
- Clear cache when underlying data changes

### Search Optimization
- Set minimum search length to avoid excessive API calls
- Use debouncing to reduce request frequency
- Implement server-side search for large datasets

### Pagination
- Enable pagination for large datasets
- Use reasonable page sizes (25-100 items)
- Implement virtual scrolling for very large lists

### Error Handling
- Always provide fallback options
- Use meaningful error messages
- Implement retry logic for transient failures

## Migration Guide

### From Static Options

```typescript
// Before
{
  field: 'status',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]
}

// After
{
  field: 'status',
  filterSource: {
    type: 'static',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  }
}
```

### From API Endpoint

```typescript
// Before
{
  field: 'category',
  apiEndpoint: '/api/categories'
}

// After
{
  field: 'category',
  filterSource: {
    type: 'api',
    api: {
      url: '/api/categories',
      mapping: { value: 'id', label: 'name' }
    }
  }
}
```

## Best Practices

1. **Always provide fallback options** for critical filters
2. **Use appropriate cache TTL** based on data change frequency  
3. **Implement search for large datasets** to improve UX
4. **Use meaningful field mappings** that match your API response structure
5. **Handle errors gracefully** with user-friendly messages
6. **Test with slow/failing APIs** to ensure fallbacks work
7. **Monitor cache hit rates** to optimize performance
8. **Use transform functions** to customize option display
9. **Implement pagination** for datasets > 100 items
10. **Document your API contracts** for filter endpoints 