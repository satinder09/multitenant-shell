# Pipe Operator Support in BuildWhereClause

## Overview

The pipe operator (`|`) has been implemented across all query building services to support OR conditions in filter values. This allows users to enter multiple values separated by pipes and have them automatically converted to OR conditions.

## Syntax

```
value1|value2|value3
```

This translates to:
```sql
(field contains value1) OR (field contains value2) OR (field contains value3)
```

## Supported Operators

The pipe operator works with the following filter operators:
- `contains` (default behavior)
- `equals`
- `starts_with`
- `ends_with`

## Examples

### Tenant Name Filtering
**Input:** `tenant1|tenant2|tenant3`
**Operator:** `contains`
**Result:** Find tenants where name contains "tenant1" OR "tenant2" OR "tenant3"

### User Email Filtering
**Input:** `admin@|user@|test@`
**Operator:** `starts_with`
**Result:** Find users where email starts with "admin@" OR "user@" OR "test@"

### Exact Matching
**Input:** `Active|Inactive|Pending`
**Operator:** `equals`
**Result:** Find records where status equals "Active" OR "Inactive" OR "Pending"

## Generated Prisma Query Structure

For a pipe-separated value like `tenant1|tenant2|tenant3` with `contains` operator:

```typescript
{
  OR: [
    { name: { contains: "tenant1", mode: "insensitive" } },
    { name: { contains: "tenant2", mode: "insensitive" } },
    { name: { contains: "tenant3", mode: "insensitive" } }
  ]
}
```

## Implementation Details

### Services Updated

1. **TenantService** (`apps/backend/src/modules/tenant/tenant.service.ts`)
   - Method: `buildDirectFieldCondition`
   - Supports all tenant field filtering

2. **TenantRepository** (`apps/backend/src/common/repositories/tenant.repository.ts`)
   - Method: `buildDirectFieldCondition`
   - Repository-level tenant queries

3. **PlatformUsersService** (`apps/backend/src/modules/platform-admin/users/platform-users.service.ts`)
   - Method: `buildStringCondition`
   - Platform user filtering

4. **UserRepository** (`apps/backend/src/common/repositories/user.repository.ts`)
   - Method: `buildStringCondition`
   - Tenant user filtering

5. **BaseRepository** (`apps/backend/src/common/repositories/base.repository.ts`)
   - Method: `buildFieldConditionWithPipeSupport`
   - Reusable helper for other repositories

### Logic Flow

1. **Detection:** Check if value is string and contains `|`
2. **Validation:** Ensure operator supports pipe functionality
3. **Parsing:** Split by `|`, trim whitespace, filter empty values
4. **Conversion:** Map each value to appropriate Prisma condition
5. **Combination:** Wrap in `{ OR: [...] }` structure

### Error Handling

- Empty values after trimming are filtered out
- Single values (no pipe) fall back to standard behavior
- Unsupported operators ignore pipe functionality
- Invalid values are handled by individual operator logic

## Usage in Frontend

Users can now enter pipe-separated values in any filter input:

```typescript
// Popular filter example
{
  field: 'name',
  operator: 'contains',
  value: 'tenant1|tenant2|tenant3'
}

// Custom filter example
{
  field: 'email',
  operator: 'starts_with', 
  value: 'admin@|user@'
}
```

## Performance Considerations

- OR conditions are optimized by Prisma
- Each pipe value creates a separate condition
- Consider database indexing for frequently filtered fields
- Large numbers of pipe values may impact query performance

## Logging

Pipe operator detection is logged for debugging:

```
🔄 Pipe operator detected: Converting "tenant1|tenant2|tenant3" to OR conditions for name
```

## Future Enhancements

- Support for additional operators (`not_contains`, `not_equals`)
- Configurable delimiter (not just `|`)
- Nested field pipe support
- Performance optimization for large value sets 