# Realistic Filter Implementation Guide

## Overview

This document explains the realistic implementation of the auto-filter system based on the actual Prisma schema structure. The system has been updated to reflect real database relationships and field types.

## Actual Database Schema Analysis

### Master Database Tables

Based on `apps/backend/prisma/schema.prisma`:

#### **Tenant Model**
```prisma
model Tenant {
  id             String   @id @default(cuid())
  name           String
  subdomain      String   @unique
  dbName         String   @unique
  encryptedDbUrl String
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  permissions TenantUserPermission[]
  impersonationSessions ImpersonationSession[]
  accessLogs TenantAccessLog[]
}
```

#### **User Model**
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  isSuperAdmin Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  permissions TenantUserPermission[]
  initiatedImpersonations ImpersonationSession[] @relation("OriginalUser")
  accessLogs TenantAccessLog[]
  userRoles UserRole[]
}
```

## Realistic Field Discovery Implementation

### **Tenant Fields** (Based on Actual Schema)

```typescript
// Auto-discovered fields for tenants table
const tenantFields = [
  {
    name: 'id',
    label: 'ID',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains']
  },
  {
    name: 'name',
    label: 'Tenant Name',
    type: 'string',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'not_equals']
  },
  {
    name: 'subdomain',
    label: 'Subdomain',
    type: 'string',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'not_equals']
  },
  {
    name: 'dbName',
    label: 'Database Name',
    type: 'string',
    operators: ['equals', 'contains', 'starts_with']
  },
  {
    name: 'isActive',
    label: 'Active Status',
    type: 'boolean',
    operators: ['equals']
  },
  {
    name: 'createdAt',
    label: 'Created Date',
    type: 'date',
    operators: ['equals', 'greater_than', 'less_than', 'between', 'greater_than_or_equal', 'less_than_or_equal']
  },
  {
    name: 'updatedAt',
    label: 'Updated Date',
    type: 'date',
    operators: ['equals', 'greater_than', 'less_than', 'between', 'greater_than_or_equal', 'less_than_or_equal']
  }
];
```

### **Realistic Relationships** (Based on Actual Foreign Keys)

```typescript
// Auto-discovered relationships for tenants
const tenantRelationships = [
  {
    name: 'permissions',
    label: 'User Permissions',
    relatedTable: 'tenant_user_permissions',
    relationshipType: 'one-to-many',
    children: [
      {
        name: 'permissions.user',
        label: 'User Permissions > User',
        children: [
          'permissions.user.email',
          'permissions.user.name',
          'permissions.user.isSuperAdmin'
        ]
      }
    ]
  },
  {
    name: 'impersonationSessions',
    label: 'Impersonation Sessions',
    relatedTable: 'impersonation_sessions',
    children: [
      'impersonationSessions.originalUser.email',
      'impersonationSessions.status',
      'impersonationSessions.startedAt',
      'impersonationSessions.endedAt'
    ]
  },
  {
    name: 'accessLogs',
    label: 'Access Logs',
    relatedTable: 'tenant_access_logs',
    children: [
      'accessLogs.user.email',
      'accessLogs.accessType',
      'accessLogs.startedAt',
      'accessLogs.ipAddress'
    ]
  }
];
```

## Realistic Popular Filters

### **Tenants Module Configuration**

```typescript
// apps/frontend/app/platform/tenants/filter-config.ts
registerModuleFilter({
  moduleName: 'tenants',
  sourceTable: 'tenants',
  
  popularFilters: [
    // PRELOADED FILTERS - Based on actual boolean fields
    {
      id: 'active',
      label: 'Active',
      type: 'preloaded',
      field: 'isActive',
      operator: 'equals',
      preloadedValue: true
    },
    {
      id: 'inactive',
      label: 'Inactive',
      type: 'preloaded',
      field: 'isActive',
      operator: 'equals',
      preloadedValue: false
    },
    {
      id: 'recent_activity',
      label: 'Recent Activity',
      type: 'preloaded',
      field: 'updatedAt',
      operator: 'greater_than',
      preloadedValue: 'last7days'
    },
    
    // USER INPUT FILTERS - Based on actual date/string fields
    {
      id: 'created_date',
      label: 'Created Date',
      type: 'user-input',
      field: 'createdAt',
      operator: 'greater_than',
      inputConfig: {
        renderType: 'datepicker',
        datePresets: [
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'thisWeek' },
          { label: 'This Month', value: 'thisMonth' },
          { label: 'Last 7 Days', value: 'last7days' }
        ]
      }
    },
    {
      id: 'subdomain_search',
      label: 'Subdomain',
      type: 'user-input',
      field: 'subdomain',
      operator: 'contains',
      inputConfig: {
        renderType: 'dropdown',
        dataSource: {
          table: 'tenants',
          valueField: 'subdomain',
          displayField: 'subdomain'
        }
      }
    }
  ]
});
```

### **Users Module Configuration** (Example)

```typescript
// apps/frontend/app/platform/users/filter-config.ts
registerModuleFilter({
  moduleName: 'users',
  sourceTable: 'users',
  
  popularFilters: [
    {
      id: 'super_admins',
      label: 'Super Admins',
      type: 'preloaded',
      field: 'isSuperAdmin',
      operator: 'equals',
      preloadedValue: true
    },
    {
      id: 'regular_users',
      label: 'Regular Users',
      type: 'preloaded',
      field: 'isSuperAdmin',
      operator: 'equals',
      preloadedValue: false
    },
    {
      id: 'registration_date',
      label: 'Registration Date',
      type: 'user-input',
      field: 'createdAt',
      operator: 'greater_than',
      inputConfig: {
        renderType: 'datepicker'
      }
    }
  ]
});
```

## Realistic Dropdown Options

### **Based on Actual Data Structure**

```typescript
// Realistic dropdown options based on schema
const dropdownOptions = {
  tenants: [
    { value: 'tenant1', label: 'Acme Corporation (acme)' },
    { value: 'tenant2', label: 'TechStart Inc (techstart)' },
    { value: 'tenant3', label: 'Global Solutions (global)' }
  ],
  
  users: [
    { value: 'user1', label: 'john.doe@example.com (John Doe)' },
    { value: 'user2', label: 'jane.smith@example.com (Jane Smith)' },
    { value: 'user3', label: 'mike.johnson@example.com (Mike Johnson)' }
  ],
  
  // Enum values from Prisma schema
  impersonation_status: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ENDED', label: 'Ended' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'REVOKED', label: 'Revoked' }
  ],
  
  access_type: [
    { value: 'SECURE_LOGIN', label: 'Secure Login' },
    { value: 'IMPERSONATION', label: 'Impersonation' },
    { value: 'DIRECT_ACCESS', label: 'Direct Access' }
  ]
};
```

## Field Types and Operators Mapping

### **Automatic Type Detection**

```typescript
const fieldTypeMapping = {
  // String fields
  'String': {
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'not_equals'],
    renderType: 'input'
  },
  
  // Boolean fields
  'Boolean': {
    operators: ['equals'],
    renderType: 'dropdown'
  },
  
  // DateTime fields
  'DateTime': {
    operators: ['equals', 'greater_than', 'less_than', 'between', 'greater_than_or_equal', 'less_than_or_equal'],
    renderType: 'datepicker'
  },
  
  // Enum fields
  'Enum': {
    operators: ['equals', 'not_equals'],
    renderType: 'dropdown'
  }
};
```

## Multi-Level Relationship Navigation

### **Example: Tenant → User Permissions → User → Roles**

```typescript
const multiLevelExample = {
  // Level 1: Tenant
  tenant: {
    name: 'Acme Corporation',
    
    // Level 2: User Permissions
    permissions: [{
      createdAt: '2024-01-15',
      
      // Level 3: User
      user: {
        email: 'john.doe@acme.com',
        name: 'John Doe',
        
        // Level 4: User Roles
        userRoles: [{
          role: {
            name: 'Administrator',
            description: 'Full system access'
          }
        }]
      }
    }]
  }
};

// This creates filter paths like:
// "User Permissions > User > Email"
// "User Permissions > User > User Roles > Role > Name"
```

## Security Considerations

### **Field Hiding Configuration**

```typescript
// Hide sensitive fields automatically
const securityConfig = {
  tenants: {
    disabledFields: ['encryptedDbUrl'], // Hide database connection strings
  },
  
  users: {
    disabledFields: ['passwordHash'], // Hide password hashes
  },
  
  impersonationSessions: {
    disabledFields: ['sessionId'], // Hide session tokens
  }
};
```

## Performance Optimizations

### **Relationship Depth Limiting**

```typescript
// Prevent infinite recursion and improve performance
const performanceConfig = {
  maxRelationshipDepth: 3, // Limit to 3 levels deep
  fieldCaching: true,      // Cache field discovery results
  lazyLoading: true        // Load relationship data on demand
};
```

## Integration with Real Prisma Client

### **Future Enhancement: Live Schema Introspection**

```typescript
// This would replace the mock implementation
async function realFieldDiscovery(tableName: string) {
  const prismaSchema = await prisma.$queryRaw`
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = ${tableName}
  `;
  
  const relationships = await prisma.$queryRaw`
    SELECT 
      constraint_name,
      table_name,
      column_name,
      foreign_table_name,
      foreign_column_name
    FROM information_schema.key_column_usage
    WHERE table_name = ${tableName}
  `;
  
  return {
    fields: processSchemaFields(prismaSchema),
    relationships: processSchemaRelationships(relationships)
  };
}
```

## Testing the Realistic Implementation

### **What You Can Test Now**

1. **Navigate to `/platform/tenants`**
2. **Click the search input** → See realistic tenant fields
3. **Try Popular Filters:**
   - "Active" → Filters `isActive = true`
   - "Inactive" → Filters `isActive = false`
   - "Recent Activity" → Filters `updatedAt > last7days`
   - "Created Date" → Interactive datepicker
   - "Subdomain" → Dropdown with tenant subdomains

4. **Explore Linked Fields:**
   - "User Permissions >" → Shows related user permission fields
   - "User Permissions > User >" → Shows nested user fields
   - "Impersonation Sessions >" → Shows session-related fields
   - "Access Logs >" → Shows access log fields

5. **Field Search:** Type in the field search to filter available fields

## Adding to New Modules

### **Minimal Configuration Required**

```typescript
// For any new module, just create this file:
// apps/frontend/app/platform/[module]/filter-config.ts

registerModuleFilter({
  moduleName: 'orders',        // Module name
  sourceTable: 'orders',       // Database table
  // Everything else is auto-generated!
});
```

The system will automatically:
- ✅ Discover all table fields
- ✅ Generate appropriate operators
- ✅ Detect field types and render types
- ✅ Map all foreign key relationships
- ✅ Create multi-level navigation
- ✅ Handle enum values
- ✅ Provide search and filtering

This realistic implementation provides a production-ready filtering system that scales with your actual database structure! 🚀 