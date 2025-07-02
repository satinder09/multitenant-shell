// Column Generation Helpers
import React from 'react';
import { ColumnDefinition, ColumnType, FilterOperator } from '../types';
import { FieldSchema } from './types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// Mapping from field types to column types
function mapFieldType(fieldType: FieldSchema['type']): ColumnType {
  const typeMap: Record<FieldSchema['type'], ColumnType> = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'datetime': 'datetime',
    'currency': 'number',
    'email': 'string',
    'select': 'enum',
    'image': 'string'
  };
  return typeMap[fieldType] || 'string';
}

// Default renderers for different field types
export function getDefaultRenderer(fieldType: FieldSchema['type'], format?: string) {
  const renderers = {
    boolean: (value: boolean) => (
      <Badge variant={value ? 'default' : 'secondary'}>
        {value ? 'Active' : 'Inactive'}
      </Badge>
    ),
    
    date: (value: string) => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = new Date(value);
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </div>
        </div>
      );
    },
    
    datetime: (value: string) => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = new Date(value);
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
    
    currency: (value: number) => (
      <span className="font-mono font-medium">
        ${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
    
    number: (value: number) => {
      if (format === 'percentage') {
        return <span className="font-mono">{(value || 0).toFixed(1)}%</span>;
      }
      return <span className="font-mono">{(value || 0).toLocaleString()}</span>;
    },
    
    email: (value: string) => (
      <a 
        href={`mailto:${value}`} 
        className="text-blue-600 hover:text-blue-800 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {value}
      </a>
    ),
    
    select: (value: any, record: any, options?: Array<{ value: any; label: string; color?: string }>) => {
      const option = options?.find(opt => opt.value === value);
      if (!option) return <span className="text-muted-foreground">{value || '-'}</span>;
      
      return (
        <Badge 
          variant="outline"
          style={{ 
            borderColor: option.color, 
            color: option.color 
          }}
        >
          {option.label}
        </Badge>
      );
    },
    
    image: (value: string) => {
      if (!value) return <span className="text-muted-foreground">No image</span>;
      return (
        <img 
          src={value} 
          alt="Preview" 
          className="w-8 h-8 rounded object-cover"
        />
      );
    },
    
    string: (value: string) => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      if (value.length > 50) {
        return (
          <span title={value}>
            {value.substring(0, 47)}...
          </span>
        );
      }
      return <span>{value}</span>;
    }
  };
  
  return renderers[fieldType] || renderers.string;
}

// Humanize field names (camelCase -> Title Case)
export function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Id$/, 'ID')
    .replace(/Url$/, 'URL')
    .replace(/Api$/, 'API')
    .trim();
}

// Generate column definitions from field schemas
export function generateColumnsFromSchema(fields: FieldSchema[]): ColumnDefinition[] {
  return fields.map(field => {
    const columnType = mapFieldType(field.type);
    
    // Build filter operators based on type
    const getFilterOperators = (): FilterOperator[] => {
      switch (field.type) {
        case 'string':
        case 'email':
          return ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty'];
        case 'number':
        case 'currency':
          return ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between'];
        case 'boolean':
          return ['equals', 'not_equals'];
        case 'date':
        case 'datetime':
          return ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset'];
        case 'select':
          return ['equals', 'not_equals', 'in', 'not_in'];
        default:
          return ['equals', 'not_equals'];
      }
    };

    const column: ColumnDefinition = {
      field: field.name,
      display: field.display || humanize(field.name),
      type: columnType,
      visible: field.visible !== false,
      sortable: field.sortable !== false,
      searchable: field.searchable !== false,
      filterable: field.filterable !== false,
      required: field.required || false,
      width: field.width,
      operators: getFilterOperators(),
      render: field.customRenderer || getDefaultRenderer(field.type, field.format)
    };

    // Add filter preset if specified
    if (field.filterPreset) {
      column.filterPreset = {
        field: field.name,
        operator: field.filterPreset.operator as FilterOperator,
        value: field.filterPreset.value,
        label: field.filterPreset.label || `Filter by ${column.display}`
      };
    }

    // Add options for select fields
    if (field.options && Array.isArray(field.options)) {
      column.options = field.options;
      // Update renderer to use options
      const fieldOptions = field.options;
      column.render = (value: any, record: any) => {
        const option = fieldOptions.find(opt => opt.value === value);
        if (!option) return <span className="text-muted-foreground">{value || '-'}</span>;
        
        return (
          <Badge 
            variant="outline"
            style={{ 
              borderColor: option.color, 
              color: option.color 
            }}
          >
            {option.label}
          </Badge>
        );
      };
    }

    return column;
  });
} 