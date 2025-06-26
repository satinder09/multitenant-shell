# Tenants Module - Advanced Filtering Reference Implementation

This module serves as the **reference implementation** for advanced filtering, pagination, and data management across the entire application. It demonstrates a modern, scalable approach with complex filtering capabilities that can be applied to any data-heavy module.

## 🎯 Purpose

This module is designed to be the **gold standard** for all other data-heavy modules in the application. It showcases:
- **Complex Dynamic Filtering** with AND/OR logic
- **Saved Searches** with favorites and sharing
- **Nested Field Selection** for related data
- **Server-side Pagination** with performance optimization
- **Generic Components** that can be reused across modules

## 🏗️ Architecture Overview

### Enhanced Structure
```
tenants/
├── components/                   # UI Components
│   ├── TenantList.tsx           # Advanced data table (existing)
│   ├── AdvancedTenantFilters.tsx # NEW: Complex filtering interface
│   ├── ServerPagination.tsx     # Pagination controls (existing)
│   ├── CreateTenantDialog.tsx   # Modal for tenant creation
│   ├── SecureLoginModal.tsx     # Secure admin access modal
│   └── ImpersonationModal.tsx   # User impersonation modal
├── hooks/                       # Data Management
│   └── useFetchTenants.ts       # UPDATED: Uses generic filter hook
├── types/                       # TypeScript Definitions
│   └── index.ts                 # UPDATED: Enhanced with complex filtering
├── utils/                       # Helper Functions
│   └── tenantHelpers.ts         # Business logic utilities
└── page.tsx                     # UPDATED: Uses advanced filters
```

### 🆕 New Generic Filter System
```
/lib/
├── hooks/
│   └── useGenericFilter.ts      # Universal filtering hook
├── types.ts                     # Enhanced with complex filtering types
└── utils.ts                     # Filter utility functions

/components/generic-filter/
├── ComplexFilterBuilder.tsx     # Main filter builder component
├── FilterRuleComponent.tsx      # Individual filter rule
├── NestedFieldSelector.tsx      # Dynamic field selection
├── MultiValueSelector.tsx       # Multi-select with search
└── index.ts                     # Component exports
```

## 🔧 Key Features

### 1. **Advanced Complex Filtering**
- **AND/OR Logic**: Match all or any conditions
- **Nested Groups**: Create complex filter hierarchies
- **Dynamic Field Discovery**: Fields are loaded from the backend
- **Multiple Operators**: equals, contains, greater than, between, etc.
- **Type-Aware Inputs**: Different inputs for strings, numbers, dates, relations

### 2. **Saved Searches**
- **Personal & Public Searches**: Save filters for quick access
- **Favorites System**: Star frequently used searches
- **Search Management**: Create, load, delete, and share searches
- **Automatic Persistence**: Searches are saved to the database

### 3. **Dynamic Field Selection**
- **Nested Field Navigation**: Access related entity fields
- **Tree-based Selection**: Visual hierarchy of available fields
- **Search Capability**: Find fields quickly by name
- **Type Information**: Shows field types and available operators

### 4. **Multi-Value Selection**
- **Tag-based Interface**: Selected values shown as removable tags
- **Search & Filter**: Find values quickly in large datasets
- **Bulk Selection**: Select multiple values with checkboxes
- **Count Information**: Shows how many records match each value

## 🚀 Usage Examples

### Basic Implementation for Any Module

```tsx
// 1. Create module-specific types
interface UserModel extends GenericEntity {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface UserFilters extends AdvancedBaseFilters {
  role?: string;
  isActive?: boolean;
}

// 2. Create the hook
function useFetchUsers() {
  return useGenericFilter<UserModel, UserFilters>('users', {
    defaultLimit: 10,
    defaultSort: { field: 'name', direction: 'asc' },
    enableSavedSearches: true
  });
}

// 3. Use in component
export default function UsersPage() {
  const userHook = useFetchUsers();

  return (
    <div>
      <AdvancedUserFilters userHook={userHook} />
      <UserList data={userHook.data} isLoading={userHook.isLoading} />
    </div>
  );
}
```

### Advanced Filter Component

```tsx
export const AdvancedTenantFilters: React.FC<Props> = ({ tenantHook }) => {
  const {
    fieldDiscovery,
    complexFilter,
    setComplexFilter,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch
  } = tenantHook;

return (
    <div>
      {/* Quick Search */}
      <SearchInput onSearch={tenantHook.setSearch} />
      
      {/* Complex Filter Builder */}
      <ComplexFilterBuilder
        moduleName="tenants"
        fieldDiscovery={fieldDiscovery}
        initialFilter={complexFilter}
        onFilterChange={setComplexFilter}
        />
      
      {/* Saved Searches */}
      <SavedSearches
        searches={savedSearches}
        onSave={saveCurrentSearch}
        onLoad={loadSavedSearch}
      />
  </div>
);
};
```

## 🌐 Backend Integration

### API Endpoints Required

```typescript
// Field metadata discovery
GET /api/filters/{module}/metadata
Response: DynamicFieldDiscovery

// Dynamic search with complex filters
POST /api/filters/{module}/search
Body: AdvancedQueryParams
Response: FilteredResult<T>

// Field values for dropdowns
POST /api/filters/{module}/field-values
Body: { fieldPath: string[], search?: string }
Response: FieldValue[]

// Saved searches management
GET    /api/filters/{module}/saved-searches
POST   /api/filters/{module}/saved-searches
DELETE /api/filters/{module}/saved-searches/{id}
PATCH  /api/filters/{module}/saved-searches/{id}/favorite
```

### Complex Filter Processing

```typescript
// Backend DTO
export class GetTenantsQueryDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  complexFilter?: ComplexFilterDto;
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  groupBy?: string;
  savedSearchId?: string;
}

// Complex filter structure
interface ComplexFilterDto {
  rootGroup: {
    logic: 'AND' | 'OR';
    rules: ComplexFilterRuleDto[];
    groups?: FilterGroupDto[];
  };
}
```

## 🎨 UI/UX Features

### Filter Builder Interface
- **Visual Rule Builder**: Drag-and-drop interface for creating filters
- **Real-time Validation**: Immediate feedback on filter validity
- **Active Filter Display**: Shows current filters as removable badges
- **Filter Count Indicators**: Shows how many filters are active

### Search Experience
- **Debounced Search**: Smooth typing experience without API spam
- **Search Suggestions**: Auto-complete based on existing data
- **Recent Searches**: Quick access to recently used filters
- **Search History**: Persistent search history per user

### Performance Optimizations
- **Lazy Loading**: Field metadata loaded on-demand
- **Caching**: Field values cached to reduce API calls
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Background Refresh**: Data refreshes without blocking UI

## 🔄 Migration Guide

### From Simple Filters to Advanced Filters

1. **Update Types**:
```tsx
// Before
interface SimpleFilters extends BaseFilters {
  status: string;
}

// After  
interface EnhancedFilters extends AdvancedBaseFilters {
  status?: string;
}
```

2. **Update Hook**:
```tsx
// Before
const { data, setFilters } = useSimpleFetch();

// After
const hook = useGenericFilter('module-name');
const { data, setComplexFilter } = hook;
```

3. **Update Components**:
```tsx
// Before
<SimpleFilters onFiltersChange={setFilters} />

// After
<AdvancedFilters moduleHook={hook} />
```

## 📋 Implementation Checklist

### For New Modules

- [ ] Create module-specific types extending `GenericEntity`
- [ ] Define `AdvancedBaseFilters` extension for the module
- [ ] Implement backend endpoints for filter metadata
- [ ] Create field discovery configuration
- [ ] Set up saved searches database tables
- [ ] Implement complex filter processing in backend
- [ ] Create module-specific filter component
- [ ] Test with various filter combinations
- [ ] Add performance monitoring
- [ ] Document module-specific fields and relationships

### Backend Requirements

- [ ] Field metadata API endpoint
- [ ] Complex filter query processing
- [ ] Field values API for dropdowns
- [ ] Saved searches CRUD operations
- [ ] Proper indexing for filtered fields
- [ ] Query optimization for complex filters
- [ ] Rate limiting for filter APIs
- [ ] Caching for field metadata

## 🎯 Best Practices

1. **Field Configuration**: Always provide meaningful labels and proper field types
2. **Performance**: Index frequently filtered fields in the database
3. **UX**: Provide clear feedback when filters return no results
4. **Security**: Validate all filter inputs on the backend
5. **Accessibility**: Ensure filter components work with screen readers
6. **Testing**: Test with various filter combinations and edge cases

This implementation serves as the foundation for all future data-heavy modules in the application. 