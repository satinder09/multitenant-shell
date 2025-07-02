# Table Skeleton Implementation

## Overview
Professional table loading skeletons that automatically match the actual table column structure and proportions. The system intelligently detects column types and applies appropriate skeleton styles.

## Smart Column Detection
The skeleton system automatically analyzes table columns and applies appropriate skeleton types:

### Column Type Detection
- **Name columns** (`name`, `title`, `tenant`): Icon + multi-line text (250px width)
- **Code columns** (`subdomain`, `domain`): Monospace code block (200px width)  
- **Status columns** (`isActive`, `status`, `active`): Rounded badge (100px width)
- **Number columns** (`userCount`, `users`, `count`): Icon + number (100px width)
- **Date columns** (`createdAt`, `updatedAt`, `*Date`): Date format (120px width)
- **Text columns** (default): Standard text skeleton (120px width)

### Skeleton Variants
1. **TableSkeleton**: Basic skeleton for simple tables
2. **TableSkeletonWithSelection**: Includes checkbox column for bulk selection
3. **TableSkeletonWithActions**: Includes action buttons column
4. **TableSkeletonWithSelectionAndActions**: Both selection and actions

## Auto-Detection in DataTable
The DataTable component automatically:
- Analyzes column definitions and field names
- Detects presence of selection and action columns
- Generates appropriate column configuration
- Chooses the correct skeleton variant

```tsx
// Automatic skeleton selection in DataTable
if (loading) {
  const columnConfig = tableColumns.map((col: any) => {
    const field = col.accessorKey || col.id
    let type = 'text'
    let width = 120
    
    // Smart type detection
    if (field === 'name' || field === 'title') {
      type = 'name'
      width = 250
    } else if (field === 'subdomain') {
      type = 'code' 
      width = 200
    } // ... more detection logic
    
    return { width, type }
  })
  
  // Auto-select skeleton variant
  if (enableRowSelection && hasActions) {
    return <TableSkeletonWithSelectionAndActions columnConfig={columnConfig} />
  } // ... other variants
}
```

## Column Configuration
Pass custom column configurations for precise control:

```tsx
const columnConfig = [
  { width: 250, type: 'name' },     // Tenant name with icon
  { width: 200, type: 'code' },     // Subdomain code block
  { width: 100, type: 'status' },   // Active/inactive badge
  { width: 100, type: 'number' },   // User count with icon
  { width: 120, type: 'date' }      // Created date
]

<TableSkeleton 
  columns={5} 
  rows={6} 
  columnConfig={columnConfig} 
/>
```

## Visual Examples

### Name Column Skeleton
```
[🏢] ████████████████████
     ██████████████
```

### Status Column Skeleton  
```
[●●●●●●●●●●●●]
```

### Code Column Skeleton
```
████████.app.com
```

### Number Column Skeleton
```
[👥] ██
```

### Date Column Skeleton
```
██/██/████
```

## Integration with ConfigDrivenModulePage
The skeleton automatically integrates with module configurations:

```tsx
// In tenants.config.tsx
columns: [
  {
    field: 'name',
    display: 'Tenant Name', 
    width: 250,
    render: customRenderers.name  // Icon + name + subdomain
  },
  {
    field: 'isActive',
    display: 'Status',
    width: 100,
    render: customRenderers.isActive  // Badge component
  }
  // ... more columns
]
```

The skeleton system reads these configurations and creates matching skeleton layouts automatically.

## Performance Benefits
- **Realistic Loading**: Skeletons match actual content proportions
- **No Layout Shift**: Exact width/height matching prevents CLS
- **Theme Aware**: Automatically adapts to light/dark themes
- **Accessible**: Proper semantic table structure maintained

## Technical Implementation
- Uses native HTML `<table>` structure for proper layout
- CSS-based width constraints for consistent sizing
- ShadCN Skeleton component for theme consistency
- TypeScript interfaces for type safety

## Usage Across Application
All DataTable instances automatically get appropriate skeletons:
- ✅ Platform Admin → Tenants (name + status + actions)
- ✅ Platform Admin → Users (name + role + status)  
- ✅ Tenant Admin → Permissions (name + description)
- ✅ Any future modules with standard DataTable

The system requires no additional configuration - skeletons are automatically generated based on table structure. 