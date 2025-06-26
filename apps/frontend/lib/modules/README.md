# Config-Driven Universal Module Architecture

## Overview

This architecture automatically generates complete module configurations from your Prisma schema, eliminating the need to manually define columns, operators, filters, and basic functionality for each module.

## Key Features

### 🚀 Auto-Generation from Schema
- **Field Types**: Automatically detects and maps Prisma types to UI column types
- **Operators**: Auto-assigns appropriate filter operators based on field types
- **Popular Filters**: Intelligently identifies commonly-filtered fields
- **Relationships**: Automatically handles model relationships
- **Validation**: Derives required/optional states from schema

### 🎯 Single Source of Truth
- One configuration object drives everything:
  - Table display and column rendering
  - Advanced filtering system
  - Actions (row, bulk, header)
  - Sorting and pagination
  - Popular filters and search

### ⚡ Ultra-Simple Module Creation
```tsx
// Create a new module in 3 lines:
import { generateConfigFromSchema } from '@/lib/modules/schema-config-generator';
import { BaseModulePage } from '@/lib/modules/BaseModulePage';

const config = generateConfigFromSchema('YourModel');
export default () => <BaseModulePage config={config} />;
```

## Architecture Components

### 1. Schema Config Generator (`schema-config-generator.ts`)
Automatically generates module configurations from Prisma schema:

```typescript
const config = generateConfigFromSchema('Tenant', {
  // Optional overrides
  module: { title: 'Custom Title' },
  display: { pageSize: 50 }
});
```

**Auto-Detection Features:**
- **Field Types**: String → text filters, DateTime → date filters, Boolean → toggle filters
- **Popular Filters**: Automatically identifies `name`, `email`, `status`, `isActive`, `createdAt` fields
- **Operators**: String fields get `contains`, `starts_with`; Numbers get `greater_than`, `between`
- **Visibility**: Hides sensitive fields (`passwordHash`, `encryptedDbUrl`)
- **Relationships**: Auto-generates reference columns for foreign keys

### 2. Module Configuration Types (`types.ts`)
Comprehensive TypeScript interfaces for type-safe configurations:

```typescript
interface ColumnDefinition {
  field: string;           // Database field name
  display: string;         // Display label
  type?: ColumnType;       // Auto-detected from schema
  operators?: FilterOperator[]; // Auto-assigned by type
  popular?: boolean;       // Auto-detected
  render?: (value: any, record: any) => ReactNode;
  // ... many more options
}
```

### 3. Base Module Page (`BaseModulePage.tsx`)
Universal component that renders any module from configuration:

```tsx
<BaseModulePage config={moduleConfig} />
```

## Real Examples

### Tenant Module Configuration
```tsx
// apps/frontend/app/platform/tenants/tenants.config.tsx
import { generateConfigFromSchema } from '@/lib/modules/schema-config-generator';

const baseConfig = generateConfigFromSchema('Tenant');

export const TenantsConfig = {
  ...baseConfig,
  // Custom overrides
  columns: baseConfig.columns.map(col => {
    if (col.field === 'name') {
      col.render = (name, record) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-sm text-muted-foreground">
              {record.subdomain}.app.com
            </div>
          </div>
        </div>
      );
    }
    return col;
  }),
  actions: {
    rowActions: [
      {
        key: 'secure-login',
        label: 'Secure Login',
        icon: Shield,
        onClick: async (tenant) => {
          // Custom secure login logic
        }
      }
    ]
  }
};
```

### Page Implementation
```tsx
// apps/frontend/app/platform/tenants/page-new.tsx
import { BaseModulePage } from '@/lib/modules/BaseModulePage';
import { TenantsConfig } from './tenants.config';

export default function TenantsPage() {
  return <BaseModulePage config={TenantsConfig} />;
}
```

## Auto-Generated Features

### Field Type Mapping
| Prisma Type | UI Type | Auto Operators |
|-------------|---------|----------------|
| `String` | `string` | `contains`, `starts_with`, `ends_with`, `equals` |
| `Int/Float` | `number` | `equals`, `greater_than`, `less_than`, `between` |
| `Boolean` | `boolean` | `equals` |
| `DateTime` | `datetime` | `equals`, `greater_than`, `between`, `preset` |
| `Enum` | `enum` | `equals`, `in`, `not_in` |

### Popular Filter Detection
Automatically identifies and creates popular filters for:
- **Name fields**: `contains` operator for search
- **Email fields**: `contains` operator for search  
- **Status/Active fields**: `equals` operator with default values
- **Date fields**: `preset` operator with "Last 30 days", "Last week" options
- **Boolean fields**: `equals` operator with appropriate defaults

### Smart Field Visibility
- **Hidden by default**: `passwordHash`, `encryptedDbUrl`, `sessionId`
- **Visible by default**: All other fields except `updatedAt`
- **ID fields**: Primary key visible, foreign keys hidden in table view

## Benefits

### For Developers
- **90% less boilerplate**: No need to define columns, operators, filters manually
- **Consistent UX**: All modules follow same patterns automatically
- **Type Safety**: Full TypeScript support with auto-completion
- **Easy Customization**: Override only what you need to change

### For Users
- **Consistent Interface**: Same filtering, sorting, actions across all modules
- **Smart Defaults**: Popular filters appear automatically
- **Responsive Design**: Works perfectly on all screen sizes
- **Rich Interactions**: Bulk actions, row actions, advanced filtering

## Migration Path

### Current Approach (100+ lines per module)
```tsx
// Old way - lots of manual configuration
const columns = [
  { field: 'name', display: 'Name', sortable: true, filterable: true, operators: ['contains', 'equals'] },
  { field: 'email', display: 'Email', sortable: true, filterable: true, operators: ['contains', 'equals'] },
  // ... 20+ more column definitions
];

const filters = [
  { name: 'name', type: 'string', operators: ['contains'] },
  // ... 15+ more filter definitions  
];

// Custom hook, custom components, custom logic...
```

### New Approach (5-10 lines per module)
```tsx
// New way - auto-generated with overrides
import { generateConfigFromSchema, BaseModulePage } from '@/lib/modules';

const config = generateConfigFromSchema('ModelName', {
  // Only override what you need
  actions: { 
    rowActions: [{ key: 'custom', label: 'Custom Action', onClick: handler }] 
  }
});

export default () => <BaseModulePage config={config} />;
```

## Future Enhancements

1. **Reference Resolution**: Automatic nested filtering through relationships
2. **Dynamic Schema Loading**: Real-time schema introspection from database
3. **Permission Integration**: Auto-hide columns/actions based on user roles
4. **Form Generation**: Auto-generate create/edit forms from same config
5. **Export Templates**: Auto-generate PDF/Excel exports with proper formatting

## Getting Started

1. **Create a module config**:
```tsx
// your-module.config.tsx
import { generateConfigFromSchema } from '@/lib/modules/schema-config-generator';
export const YourModuleConfig = generateConfigFromSchema('YourPrismaModel');
```

2. **Create a page component**:
```tsx
// page.tsx
import { BaseModulePage } from '@/lib/modules/BaseModulePage';
import { YourModuleConfig } from './your-module.config';
export default () => <BaseModulePage config={YourModuleConfig} />;
```

3. **Add custom overrides as needed**:
```tsx
// Override specific columns, actions, or display settings
export const YourModuleConfig = {
  ...generateConfigFromSchema('YourPrismaModel'),
  // Your customizations here
};
```

That's it! You now have a fully functional module with advanced filtering, sorting, pagination, actions, and responsive design. 