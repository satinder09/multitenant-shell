# Dynamic Filtering System

A comprehensive, database-driven filtering system that provides advanced search capabilities with complex logic, saved searches, and dynamic field discovery. This system is designed to be **completely generic** and can be applied to any data module in the application.

## 🎯 Overview

The Dynamic Filtering System allows users to create sophisticated filters with:
- **Complex Logic**: AND/OR combinations with nested groups
- **Dynamic Fields**: Field discovery from database schema
- **Type-Aware Inputs**: Different UI components based on field types
- **Saved Searches**: Persistent filter combinations with sharing
- **Real-time Validation**: Immediate feedback on filter validity
- **Performance Optimization**: Caching, debouncing, and lazy loading

## 🏗️ System Architecture

### Core Components

```
Dynamic Filtering System/
├── Frontend/
│   ├── /lib/
│   │   ├── types.ts                    # Core filtering types
│   │   ├── utils.ts                    # Filtering utilities
│   │   └── hooks/
│   │       └── useGenericFilter.ts     # Universal filter hook
│   ├── /components/generic-filter/
│   │   ├── ComplexFilterBuilder.tsx    # Main filter builder
│   │   ├── FilterRuleComponent.tsx     # Individual filter rules
│   │   ├── NestedFieldSelector.tsx     # Dynamic field selection
│   │   ├── MultiValueSelector.tsx      # Multi-value inputs
│   │   └── index.ts                    # Component exports
│   └── /app/[module]/
│       ├── types/index.ts              # Module-specific types
│       ├── hooks/useFetch[Module].ts   # Module hook
│       └── components/
│           └── Advanced[Module]Filters.tsx
└── Backend/
    ├── /modules/[module]/
    │   ├── dto/get-[module]-query.dto.ts
    │   ├── [module].controller.ts
    │   └── [module].service.ts
    └── /filters/
        ├── filter-metadata.service.ts
        ├── dynamic-query.service.ts
        └── saved-searches.service.ts
```

## 🔧 Core Types & Interfaces

### Base Filtering Types

```typescript
// Core filter rule
interface ComplexFilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  fieldPath?: string[];     // For nested fields
  label?: string;
}

// Filter group with logic
interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: ComplexFilterRule[];
  groups?: FilterGroup[];   // Nested groups
}

// Complete filter structure
interface ComplexFilter {
  rootGroup: FilterGroup;
}

// Field metadata for dynamic discovery
interface FilterMetadata {
  moduleName: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FilterType;
  isFilterable: boolean;
  isGroupable: boolean;
  operators: FilterOperator[];
  relationConfig?: RelationConfig;
}
```

### Supported Operators

```typescript
type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'greater_equal' | 'less_equal'
  | 'between' | 'not_between'
  | 'is_set' | 'is_not_set'
  | 'in' | 'not_in'
  | 'is_in' | 'is_not_in'
  | 'contains_any' | 'contains_all';
```

### Field Types

```typescript
type FilterType = 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'relation';
```

## 🚀 Implementation Guide

### Step 1: Define Module Types

```typescript
// apps/frontend/app/[module]/types/index.ts
import { GenericEntity, AdvancedBaseFilters } from '@/lib/types';

// Extend GenericEntity for your module
interface YourModuleModel extends GenericEntity {
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdBy?: User;
  tags: Tag[];
}

// Extend AdvancedBaseFilters for module-specific filters
interface YourModuleFilters extends AdvancedBaseFilters {
  status?: 'active' | 'inactive' | 'all';
  createdById?: string;
  hasTag?: boolean;
}

// Hook return type
type UseFetchYourModuleReturn = UseGenericFilterReturn<YourModuleModel, YourModuleFilters>;
```

### Step 2: Create Module Hook

```typescript
// apps/frontend/app/[module]/hooks/useFetchYourModule.ts
import { useGenericFilter } from '@/lib/hooks/useGenericFilter';
import { YourModuleModel, YourModuleFilters, UseFetchYourModuleReturn } from '../types';

export function useFetchYourModule(): UseFetchYourModuleReturn {
  return useGenericFilter<YourModuleModel, YourModuleFilters>('your-module', {
    defaultLimit: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' },
    enableSavedSearches: true
  });
}
```

### Step 3: Create Filter Component

```typescript
// apps/frontend/app/[module]/components/AdvancedYourModuleFilters.tsx
import React from 'react';
import { ComplexFilterBuilder } from '@/components/generic-filter';
import { UseFetchYourModuleReturn } from '../types';

interface AdvancedYourModuleFiltersProps {
  moduleHook: UseFetchYourModuleReturn;
}

export const AdvancedYourModuleFilters: React.FC<AdvancedYourModuleFiltersProps> = ({
  moduleHook
}) => {
  const {
    fieldDiscovery,
    complexFilter,
    setComplexFilter,
    setSearch,
    clearFilters,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch
  } = moduleHook;

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <SearchInput onSearch={setSearch} />
      
      {/* Advanced Filter Builder */}
      <ComplexFilterBuilder
        moduleName="your-module"
        fieldDiscovery={fieldDiscovery}
        initialFilter={complexFilter}
        onFilterChange={setComplexFilter}
      />
      
      {/* Saved Searches */}
      <SavedSearchManager
        searches={savedSearches}
        onSave={saveCurrentSearch}
        onLoad={loadSavedSearch}
      />
    </div>
  );
};
```

### Step 4: Use in Page Component

```typescript
// apps/frontend/app/[module]/page.tsx
export default function YourModulePage() {
  const moduleHook = useFetchYourModule();
  const { data, isLoading, pagination } = moduleHook;

  return (
    <div className="space-y-6">
      <AdvancedYourModuleFilters moduleHook={moduleHook} />
      <YourModuleList data={data} isLoading={isLoading} pagination={pagination} />
    </div>
  );
}
```

## 🌐 Backend Implementation

### Step 1: Create DTOs

```typescript
// apps/backend/src/modules/[module]/dto/get-[module]-query.dto.ts
import { IsOptional, IsString, IsNumber, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ComplexFilterDto } from '@/common/dto/complex-filter.dto';

export class GetYourModuleQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => ComplexFilterDto)
  complexFilter?: ComplexFilterDto;

  @IsOptional()
  @IsObject()
  sortBy?: { field: string; direction: 'asc' | 'desc' };

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  savedSearchId?: string;
}
```

### Step 2: Configure Field Metadata

```typescript
// apps/backend/src/modules/[module]/[module].metadata.ts
import { FilterMetadata } from '@/common/types/filter-metadata';

export const yourModuleMetadata: FilterMetadata[] = [
  {
    moduleName: 'your-module',
    fieldName: 'name',
    fieldLabel: 'Name',
    fieldType: 'string',
    isFilterable: true,
    isSearchable: true,
    operators: ['equals', 'contains', 'starts_with', 'ends_with']
  },
  {
    moduleName: 'your-module',
    fieldName: 'email',
    fieldLabel: 'Email Address',
    fieldType: 'string',
    isFilterable: true,
    isSearchable: true,
    operators: ['equals', 'contains', 'ends_with']
  },
  {
    moduleName: 'your-module',
    fieldName: 'status',
    fieldLabel: 'Status',
    fieldType: 'enum',
    isFilterable: true,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    fieldValues: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  },
  {
    moduleName: 'your-module',
    fieldName: 'createdBy',
    fieldLabel: 'Created By',
    fieldType: 'relation',
    isFilterable: true,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    relationConfig: {
      targetModule: 'users',
      targetTable: 'user',
      valueField: 'id',
      labelField: 'name',
      searchFields: ['name', 'email']
    }
  },
  {
    moduleName: 'your-module',
    fieldName: 'tags',
    fieldLabel: 'Tags',
    fieldType: 'relation',
    isFilterable: true,
    operators: ['contains_any', 'contains_all', 'is_set', 'is_not_set'],
    relationConfig: {
      targetModule: 'tags',
      targetTable: 'tag',
      valueField: 'id',
      labelField: 'name',
      searchFields: ['name']
    }
  }
];
```

### Step 3: Implement Controller Endpoints

```typescript
// apps/backend/src/modules/[module]/[module].controller.ts
@Controller('your-module')
export class YourModuleController {
  
  @Post('search')
  async searchWithFilters(@Body() query: GetYourModuleQueryDto) {
    return this.yourModuleService.findWithComplexFilters(query);
  }

  @Get('metadata')
  async getFilterMetadata() {
    return this.filterMetadataService.getModuleMetadata('your-module');
  }

  @Post('field-values')
  async getFieldValues(@Body() request: GetFieldValuesDto) {
    return this.filterMetadataService.getFieldValues(
      'your-module',
      request.fieldPath,
      request.search
    );
  }

  @Get('saved-searches')
  async getSavedSearches(@Request() req) {
    return this.savedSearchService.findByUser(req.user.id, 'your-module');
  }

  @Post('saved-searches')
  async createSavedSearch(@Body() data: CreateSavedSearchDto, @Request() req) {
    return this.savedSearchService.create({
      ...data,
      userId: req.user.id,
      moduleName: 'your-module'
    });
  }
}
```

### Step 4: Implement Service Logic

```typescript
// apps/backend/src/modules/[module]/[module].service.ts
@Injectable()
export class YourModuleService {
  
  async findWithComplexFilters(query: GetYourModuleQueryDto) {
    const queryBuilder = this.repository.createQueryBuilder('entity');
    
    // Apply complex filters
    if (query.complexFilter) {
      this.dynamicQueryService.applyComplexFilter(
        queryBuilder,
        query.complexFilter,
        'your-module'
      );
    }
    
    // Apply search
    if (query.search) {
      queryBuilder.andWhere(
        '(entity.name ILIKE :search OR entity.email ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }
    
    // Apply sorting
    if (query.sortBy) {
      queryBuilder.orderBy(
        `entity.${query.sortBy.field}`,
        query.sortBy.direction.toUpperCase() as 'ASC' | 'DESC'
      );
    }
    
    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    queryBuilder.skip(offset).take(query.limit);
    
    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1
      }
    };
  }
}
```

## 🎨 UI Components Deep Dive

### ComplexFilterBuilder

The main component that orchestrates the entire filtering experience:

```typescript
interface ComplexFilterBuilderProps {
  moduleName: string;
  fieldDiscovery: DynamicFieldDiscovery | null;
  initialFilter?: ComplexFilter | null;
  onFilterChange: (filter: ComplexFilter | null) => void;
}
```

**Features:**
- Visual filter rule builder
- AND/OR logic selection
- Nested group support
- Add/remove rules and groups
- Real-time validation

### FilterRuleComponent

Individual filter rule with dynamic inputs based on field type:

```typescript
interface FilterRuleComponentProps {
  rule: ComplexFilterRule;
  fieldDiscovery: DynamicFieldDiscovery;
  onRuleChange: (updates: Partial<ComplexFilterRule>) => void;
  onRemove: () => void;
  moduleName: string;
}
```

**Features:**
- Dynamic field selection
- Operator selection based on field type
- Type-aware value inputs
- Validation feedback

### NestedFieldSelector

Tree-based field selection with search capabilities:

```typescript
interface NestedFieldSelectorProps {
  fieldDiscovery: DynamicFieldDiscovery;
  selectedPath: string[];
  onPathChange: (path: string[]) => void;
  moduleName: string;
  onClose?: () => void;
}
```

**Features:**
- Hierarchical field navigation
- Search functionality
- Type indicators
- Path breadcrumbs

### MultiValueSelector

Tag-based multi-select with search and pagination:

```typescript
interface MultiValueSelectorProps {
  fieldPath: string[];
  moduleName: string;
  selectedValues: FieldValue[];
  onValuesChange: (values: FieldValue[]) => void;
  fieldConfig: NestedFieldConfig;
}
```

**Features:**
- Tag-based selection display
- Searchable dropdown
- Checkbox selection
- Value count indicators

## 📊 Advanced Features

### Saved Searches

Users can save complex filter combinations for reuse:

```typescript
interface SavedSearch {
  id: string;
  name: string;
  filters: ComplexFilterRule[];
  complexFilter?: ComplexFilter;
  groupBy?: string;
  sortBy?: SortParams;
  isDefault?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Field Discovery

Dynamic field configuration loaded from the backend:

```typescript
interface DynamicFieldDiscovery {
  fields: FilterMetadata[];
  nestedFields: NestedFieldConfig[];
  relationPaths: RelationPath[];
}
```

### Performance Optimizations

- **Debounced Search**: 300ms delay for search inputs
- **Field Value Caching**: Cache field values to reduce API calls
- **Lazy Loading**: Load field metadata on-demand
- **Optimistic Updates**: UI updates immediately, syncs with server

## 🔍 Query Processing

### Complex Filter Translation

The system translates UI filters into database queries:

```typescript
// Frontend Filter
{
  rootGroup: {
    logic: 'AND',
    rules: [
      { field: 'name', operator: 'contains', value: 'john' },
      { field: 'status', operator: 'equals', value: 'active' }
    ]
  }
}

// Generated SQL
WHERE (name ILIKE '%john%' AND status = 'active')
```

### Nested Field Queries

Support for filtering on related entity fields:

```typescript
// Filter on related field
{ 
  field: 'name', 
  fieldPath: ['createdBy', 'name'], 
  operator: 'contains', 
  value: 'admin' 
}

// Generated SQL with JOIN
LEFT JOIN user createdBy ON entity.createdById = createdBy.id
WHERE createdBy.name ILIKE '%admin%'
```

## 🛠️ Customization Options

### Custom Operators

Add new operators for specific field types:

```typescript
// In field metadata
{
  fieldName: 'coordinates',
  fieldType: 'custom',
  operators: ['within_radius', 'outside_radius'],
  customOperatorConfig: {
    within_radius: {
      label: 'Within radius of',
      inputType: 'location_radius',
      valueSchema: { lat: 'number', lng: 'number', radius: 'number' }
    }
  }
}
```

### Custom Field Types

Extend the system with new field types:

```typescript
// Register custom field type
registerCustomFieldType('location', {
  operators: ['equals', 'within_radius', 'outside_radius'],
  inputComponent: LocationInput,
  valueFormatter: (value) => `${value.lat}, ${value.lng}`,
  queryBuilder: (field, operator, value) => {
    // Custom query building logic
  }
});
```

### Custom Input Components

Create specialized input components:

```typescript
// Custom input for date ranges
const DateRangeInput: React.FC<CustomInputProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2">
      <DatePicker value={value?.start} onChange={(start) => onChange({ ...value, start })} />
      <DatePicker value={value?.end} onChange={(end) => onChange({ ...value, end })} />
    </div>
  );
};
```

## 🧪 Testing

### Unit Tests

Test individual components and utilities:

```typescript
describe('ComplexFilterBuilder', () => {
  it('should create new filter rules', () => {
    const onFilterChange = jest.fn();
    render(
      <ComplexFilterBuilder
        moduleName="test"
        fieldDiscovery={mockFieldDiscovery}
        onFilterChange={onFilterChange}
      />
    );
    
    fireEvent.click(screen.getByText('Add Rule'));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rootGroup: expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({ field: '', operator: 'equals' })
          ])
        })
      })
    );
  });
});
```

### Integration Tests

Test the complete filtering flow:

```typescript
describe('Filter Integration', () => {
  it('should filter data based on complex criteria', async () => {
    const { result } = renderHook(() => useGenericFilter('test-module'));
    
    act(() => {
      result.current.setComplexFilter({
        rootGroup: {
          logic: 'AND',
          rules: [
            { field: 'name', operator: 'contains', value: 'test' }
          ]
        }
      });
    });
    
    await waitFor(() => {
      expect(result.current.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.stringContaining('test') })
        ])
      );
    });
  });
});
```

## 📈 Performance Considerations

### Database Optimization

1. **Index Strategy**: Create indexes on frequently filtered fields
2. **Query Optimization**: Use EXPLAIN ANALYZE to optimize complex queries
3. **Connection Pooling**: Manage database connections efficiently
4. **Caching**: Cache field metadata and common filter results

### Frontend Optimization

1. **Component Memoization**: Use React.memo for expensive components
2. **Debouncing**: Prevent excessive API calls during user input
3. **Virtual Scrolling**: Handle large datasets in dropdowns
4. **Code Splitting**: Lazy load filter components

### API Optimization

1. **Pagination**: Always paginate large result sets
2. **Field Selection**: Only return required fields
3. **Compression**: Use gzip compression for API responses
4. **Rate Limiting**: Prevent abuse of filter APIs

## 🔒 Security Considerations

### Input Validation

- Validate all filter inputs on the backend
- Sanitize search terms to prevent injection attacks
- Limit the complexity of filter queries

### Access Control

- Restrict access to sensitive fields based on user permissions
- Implement row-level security for multi-tenant applications
- Audit filter usage for compliance

### Performance Limits

- Set maximum limits on filter complexity
- Implement query timeouts
- Monitor and alert on expensive queries

## 🚀 Future Enhancements

### Planned Features

- [ ] **Visual Query Builder**: Drag-and-drop interface
- [ ] **Filter Templates**: Pre-built filter combinations
- [ ] **Export Functionality**: Export filtered data to CSV/Excel
- [ ] **Real-time Filters**: WebSocket-based live filtering
- [ ] **AI-Powered Suggestions**: Smart filter recommendations
- [ ] **Advanced Analytics**: Filter usage analytics and optimization
- [ ] **Mobile Optimization**: Touch-friendly filter interface
- [ ] **Collaborative Filters**: Share and collaborate on filter sets

### Integration Opportunities

- [ ] **GraphQL Support**: Extend to work with GraphQL APIs
- [ ] **ElasticSearch**: Advanced search capabilities
- [ ] **Redis Caching**: Distributed caching for filter results
- [ ] **Event Sourcing**: Track filter changes over time

---

## 📚 Resources

### Documentation Links
- [API Reference](./API_REFERENCE.md)
- [Component Library](./COMPONENT_LIBRARY.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

### Examples
- [Basic Implementation](./examples/basic-implementation.md)
- [Advanced Use Cases](./examples/advanced-use-cases.md)
- [Custom Field Types](./examples/custom-field-types.md)
- [Performance Optimization](./examples/performance-optimization.md)

This Dynamic Filtering System provides a robust, scalable foundation for advanced search and filtering capabilities across any data-driven application. The generic architecture ensures consistency while allowing for module-specific customization and optimization. 