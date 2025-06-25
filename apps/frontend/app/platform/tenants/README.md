# Tenants Module

A comprehensive, modular tenant management system that demonstrates best practices for building scalable SaaS admin interfaces with **server-side pagination**, filtering, and sorting.

## 🏗️ **Architecture Overview**

This module uses a **system-wide architecture** for data management:

- **Global Types** (`/lib/types.ts`) - Reusable pagination, filtering, and data table interfaces
- **Module-Specific Extensions** - Tenant-specific types that extend the global interfaces
- **Server-Side Data Management** - All pagination, filtering, and sorting handled by the API
- **Reusable Patterns** - Can be copied to other modules (users, roles, etc.)

## 📁 **Structure**

```
tenants/
├── components/
│   ├── TenantList.tsx           # Advanced data table with server-side pagination
│   ├── TenantFilters.tsx        # Comprehensive filtering component
│   ├── CreateTenantDialog.tsx   # Modal for tenant creation
│   ├── SecureLoginModal.tsx     # Secure admin access modal
│   └── ImpersonationModal.tsx   # User impersonation modal
├── hooks/
│   └── useFetchTenants.ts       # Server-side data fetching hook
├── types/
│   └── index.ts                 # Module-specific type extensions
├── utils/
│   └── tenantHelpers.ts         # Server actions and utilities
├── page.tsx                     # Main tenants page
└── README.md                    # This documentation
```

## 🔧 **Key Components**

### **TenantList** 
Advanced data table with:
- ✅ Server-side pagination with page size controls
- ✅ Column sorting (name, status, access level, created date)
- ✅ Row selection with bulk actions
- ✅ Action dropdowns (secure login, impersonate, toggle status)
- ✅ Loading states and empty states
- ✅ Responsive design with mobile optimization

### **TenantFilters**
Comprehensive filtering with:
- ✅ Real-time search (name, subdomain)
- ✅ Status filtering (active/inactive/all)
- ✅ Access level filtering (read/write/admin/all)
- ✅ Date range filtering (created date)
- ✅ Active filters summary with clear all
- ✅ Filter count badges

### **useFetchTenants Hook**
Server-side data management:
- ✅ Pagination state management (page, limit)
- ✅ Filter state management with debouncing
- ✅ Sort state management
- ✅ Loading and error states
- ✅ Automatic refetching on parameter changes
- ✅ Manual refetch capability

## 🌐 **System-Wide Types**

Located in `/lib/types.ts` for reuse across modules:

```typescript
// Generic pagination
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Generic query parameters
interface QueryParams<TFilters, TSort> {
  page: number;
  limit: number;
  filters?: TFilters;
  sort?: SortParams<TSort>;
}

// Generic hook return type
interface UseServerDataReturn<T, TFilters, TSort> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  queryParams: QueryParams<TFilters, TSort>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  setSort: (sort: SortParams<TSort>) => void;
  refetch: () => void;
  resetFilters: () => void;
}
```

## 🎯 **Module-Specific Extensions**

```typescript
// Tenant-specific filters extending base filters
interface TenantFilters extends ModuleFilters<{
  status: StatusFilter;           // 'all' | 'active' | 'inactive'
  accessLevel: AccessLevelFilter; // 'all' | 'read' | 'write' | 'admin'
}> {}

// Type aliases using system-wide generics
type TenantQueryParams = QueryParams<TenantFilters, TenantModel>;
type TenantListResponse = PaginatedResponse<TenantModel>;
type UseFetchTenantsReturn = UseServerDataReturn<TenantModel, TenantFilters, TenantModel>;
```

## 🚀 **Usage Examples**

### **Basic Usage**
```tsx
export default function TenantsPage() {
  const {
    data: tenants,
    isLoading,
    pagination,
    setPage,
    setFilters,
    setSort,
  } = useFetchTenants();

  return (
    <TenantList
      data={tenants}
      isLoading={isLoading}
      pagination={pagination}
      onPageChange={setPage}
      onFiltersChange={setFilters}
      onSortChange={setSort}
    />
  );
}
```

### **With Filters**
```tsx
const [showFilters, setShowFilters] = useState(false);

return (
  <div className="flex gap-6">
    {showFilters && (
      <div className="w-80">
        <TenantFilters
          filters={queryParams.filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />
      </div>
    )}
    <div className="flex-1">
      <TenantList {...props} />
    </div>
  </div>
);
```

## 🔄 **Server-Side API Contract**

The hook expects the API to support these query parameters:

```
GET /api/tenants?page=1&limit=10&search=acme&status=active&accessLevel=admin&sortField=name&sortDirection=asc&dateFrom=2024-01-01&dateTo=2024-12-31
```

**Response Format:**
```json
{
  "data": [
    {
      "id": "tenant-1",
      "name": "Acme Corp",
      "subdomain": "acme",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "canAccess": true,
      "canImpersonate": true,
      "accessLevel": "admin"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🎨 **Styling & UX**

- **Consistent Design Language** - Uses shadcn/ui components
- **Loading States** - Skeleton loaders for better perceived performance
- **Empty States** - Helpful messages with call-to-action buttons
- **Error Handling** - User-friendly error messages with retry options
- **Responsive Design** - Mobile-first approach with adaptive layouts
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support

## 🔧 **Extension Points**

### **Adding New Filters**
1. Extend `TenantFilters` interface in `types/index.ts`
2. Add filter UI in `TenantFilters.tsx`
3. Update API query building in `useFetchTenants.ts`

### **Adding New Actions**
1. Add action props to `TenantListProps`
2. Add action buttons in `TenantList.tsx` action dropdown
3. Implement handlers in `page.tsx`

### **Customizing Table Columns**
1. Modify `columns` array in `TenantList.tsx`
2. Add new accessors to `TenantModel` interface
3. Update API response to include new fields

## 📋 **Replication Guide**

To replicate this pattern for other modules:

1. **Copy Global Types** - Already in `/lib/types.ts`
2. **Create Module Types** - Extend base interfaces
3. **Create Hook** - Use `UseServerDataReturn<T, TFilters, TSort>`
4. **Create Components** - List, Filters, Modals
5. **Update API** - Support pagination query parameters

## ✅ **Completed Features**

- ✅ **Server-Side Pagination** - Scalable for large datasets
- ✅ **Advanced Filtering** - Search, status, access level, date range
- ✅ **Column Sorting** - Server-side sorting on all columns
- ✅ **Bulk Operations** - Multi-select actions (activate/deactivate multiple)
- ✅ **Type Safety** - Full TypeScript coverage with generics
- ✅ **Separation of Concerns** - Clear component boundaries
- ✅ **Reusable Architecture** - System-wide types and patterns
- ✅ **Performance Optimization** - Debounced filters, efficient re-renders
- ✅ **User Experience** - Loading states, error handling, accessibility
- ✅ **Maintainability** - Clear structure, comprehensive documentation

## 🚧 **Future Enhancements**

- [ ] **Export Functionality** - CSV/Excel export with current filters
- [ ] **Advanced Sorting** - Multi-column sorting
- [ ] **Saved Filters** - User-defined filter presets
- [ ] **Real-time Updates** - WebSocket integration for live data
- [ ] **Column Customization** - User-configurable column visibility
- [ ] **Keyboard Shortcuts** - Power user navigation
- [ ] **Audit Trail** - Activity logging for all actions

---

This module serves as a **reference implementation** for building scalable, maintainable admin interfaces in multi-tenant SaaS applications. 