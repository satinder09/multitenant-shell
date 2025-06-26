# Module Registry System - Zero Dependencies

## Overview

The Module Registry System eliminates the need to manually import module configurations in multiple places. Instead of importing `TenantsConfig` in every API route and component, you simply register the module once and it becomes available everywhere.

## How It Works

### 1. Single Registration Point

All modules are registered in one place: `lib/modules/module-registry.ts`

```typescript
// Static imports - Next.js can resolve these at build time
const configImports = {
  tenants: () => import('@/app/platform/tenants/tenants.config').then(m => m.TenantsConfig),
  users: () => import('@/app/platform/users/users.config').then(m => m.UsersConfig),
  // Add new modules here
} as const;

// Module metadata
const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    name: 'tenants',
    title: 'Tenants',
    description: 'Manage tenant organizations'
  },
  {
    name: 'users',
    title: 'Users', 
    description: 'Manage system users'
  }
];
```

### 2. Automatic Discovery

Components and API routes automatically discover and load configs:

```typescript
// Before: Manual imports everywhere
import { TenantsConfig } from '@/app/platform/tenants/tenants.config';

// After: Automatic discovery
const config = await getModuleConfig('tenants'); // Loads automatically!
```

### 3. Zero Dependencies

Once registered, modules work everywhere without additional imports:

- ✅ API routes automatically load configs
- ✅ Components automatically load configs  
- ✅ Hooks automatically load configs
- ✅ Filters automatically load configs

## Adding New Modules

### Step 1: Create Your Config

Create your module config file (e.g., `app/platform/permissions/permissions.config.tsx`):

```typescript
import { ModuleConfig } from '@/lib/modules/types';

export const PermissionsConfig: ModuleConfig = {
  sourceTable: 'Permission',
  columns: [
    {
      field: 'name',
      display: 'Permission Name',
      type: 'string',
      visible: true,
      searchable: true,
      filterable: true
    }
    // ... more columns
  ],
  module: {
    name: 'permissions',
    title: 'Permissions'
  }
};
```

### Step 2: Register in Module Registry

Add to `lib/modules/module-registry.ts`:

```typescript
// Add to configImports
const configImports = {
  tenants: () => import('@/app/platform/tenants/tenants.config').then(m => m.TenantsConfig),
  users: () => import('@/app/platform/users/users.config').then(m => m.UsersConfig),
  permissions: () => import('@/app/platform/permissions/permissions.config').then(m => m.PermissionsConfig), // NEW
} as const;

// Add to MODULE_REGISTRY
const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  { name: 'tenants', title: 'Tenants', description: 'Manage tenant organizations' },
  { name: 'users', title: 'Users', description: 'Manage system users' },
  { name: 'permissions', title: 'Permissions', description: 'Manage user permissions' }, // NEW
];
```

### Step 3: Create Your Page

Create your page component:

```typescript
// app/platform/permissions/page.tsx
'use client';

import { ConfigDrivenModulePage } from '@/lib/modules/ConfigDrivenModulePage';

export default function PermissionsPage() {
  return (
    <ConfigDrivenModulePage 
      moduleName="permissions"
      // That's it! No imports needed.
    />
  );
}
```

## That's It! 🎉

Your new module now works everywhere:

- ✅ `/api/modules/permissions` - Automatic API endpoint
- ✅ `/api/filters/permissions/auto-discovery` - Automatic field discovery
- ✅ `/api/filters/permissions/field-tree` - Automatic field tree
- ✅ Advanced filtering, sorting, pagination - All automatic
- ✅ Table columns, actions, bulk operations - All from config
- ✅ Popular filters, search, export - All automatic

## Benefits

### Before: Multiple Dependencies
```
❌ Import TenantsConfig in:
   - /api/filters/[module]/auto-discovery/route.ts
   - /api/filters/[module]/field-tree/route.ts  
   - /api/modules/[module]/route.ts
   - app/platform/tenants/page.tsx
   - lib/hooks/useGenericFilter.ts
   - And more...

❌ For each new module:
   - Update 5+ files
   - Add manual imports
   - Risk missing imports
   - Maintenance nightmare
```

### After: Zero Dependencies
```
✅ Register once in module-registry.ts
✅ Works everywhere automatically
✅ Add new modules in 3 steps
✅ No manual imports needed
✅ No risk of missing dependencies
✅ Easy maintenance
```

## Advanced Features

### Lazy Loading
Configs are loaded on-demand and cached:

```typescript
// First call: Loads and caches
const config1 = await getModuleConfig('tenants');

// Subsequent calls: Returns from cache
const config2 = await getModuleConfig('tenants'); // Instant!
```

### Error Handling
Built-in error handling and validation:

```typescript
const config = await getModuleConfig('nonexistent');
// Returns null, logs warning
// Your code handles gracefully
```

### Development Tools
Debug and introspect the registry:

```typescript
// Get all registered modules
const modules = getRegisteredModules(); // ['tenants', 'users', 'permissions']

// Check if module exists
const exists = isModuleRegistered('tenants'); // true

// Get module metadata
const metadata = getModuleMetadata('tenants'); // { name, title, description }

// Clear cache (development)
clearConfigCache();
```

## Migration Guide

### From Manual Imports

**Before:**
```typescript
// Every file needed this
import { TenantsConfig } from '@/app/platform/tenants/tenants.config';

// API routes
export async function GET() {
  const config = TenantsConfig; // Manual import
  // ...
}

// Components  
export default function TenantsPage() {
  return <ConfigDrivenModulePage config={TenantsConfig} />; // Manual import
}
```

**After:**
```typescript
// API routes - no imports needed
export async function GET() {
  const config = await getModuleConfig('tenants'); // Automatic!
  // ...
}

// Components - no imports needed
export default function TenantsPage() {
  return <ConfigDrivenModulePage moduleName="tenants" />; // Automatic!
}
```

## Best Practices

1. **Always use the registry** - Don't import configs directly
2. **Register modules early** - Add to registry as soon as you create the config
3. **Use consistent naming** - Module names should match folder names
4. **Handle null configs** - Always check if config loaded successfully
5. **Clear cache in development** - Use `clearConfigCache()` when testing

## Troubleshooting

### "Module not found" Error
- Check that module is added to `configImports`
- Verify the import path is correct
- Ensure the export name matches

### "Config not found" Error  
- Check that the config file exports the correct name
- Verify the config structure is valid
- Check for TypeScript errors in the config

### "Invalid config structure" Error
- Ensure config has `module`, `columns`, and other required fields
- Check that `columns` is an array
- Verify all required properties are present

## Examples

See these working examples:

- **Tenants**: `app/platform/tenants/` - Full featured with modals
- **Users**: `app/platform/users/` - Complete CRUD operations  
- **Module Registry**: `lib/modules/module-registry.ts` - Core system

## Summary

The Module Registry System transforms module management from a complex dependency web into a simple, centralized system. Register once, use everywhere, zero dependencies. 🚀 