import { ComplexFilterRule } from '@/shared/types/types';

export const createFilterLabel = (
  fieldName: string, 
  operator: string, 
  value: any
): string => {
  // Handle pipe operator for OR conditions
  const hasPipeOperator = typeof value === 'string' && value.includes('|');
  
  // Format the display value without quotes for consistency
  const formatDisplayValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No';
    }

    // Handle date range objects (from/to)
    if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if (val.from && val.to) {
        try {
          const fromDate = new Date(val.from);
          const toDate = new Date(val.to);
          return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
        } catch {
          return `${val.from} - ${val.to}`;
        }
      }
      // For other objects, try to get a meaningful string representation
      return JSON.stringify(val);
    }

    // Handle date objects
    if (val instanceof Date) {
      return val.toLocaleDateString();
    }

    // Handle date strings
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        return new Date(val).toLocaleDateString();
      } catch {
        return val;
      }
    }
    
    if (hasPipeOperator) {
      return value.split('|').map((v: string) => v.trim()).join(' or ');
    }
    
    return String(val);
  };
  
  const displayValue = formatDisplayValue(value);
  
  switch (operator) {
    case 'contains':
      return `${fieldName} contains ${displayValue}`;
    case 'not_contains':
      return `${fieldName} does not contain ${displayValue}`;
    case 'starts_with':
      return `${fieldName} starts with ${displayValue}`;
    case 'ends_with':
      return `${fieldName} ends with ${displayValue}`;
    case 'equals':
      return typeof value === 'boolean' 
        ? `${fieldName} is ${displayValue}`
        : `${fieldName} equals ${displayValue}`;
    case 'not_equals':
      return typeof value === 'boolean'
        ? `${fieldName} is not ${displayValue}`
        : `${fieldName} does not equal ${displayValue}`;
    case 'greater_than':
      return `${fieldName} > ${displayValue}`;
    case 'less_than':
      return `${fieldName} < ${displayValue}`;
    case 'greater_equal':
      return `${fieldName} >= ${displayValue}`;
    case 'less_equal':
      return `${fieldName} <= ${displayValue}`;
    case 'between':
      return `${fieldName} is between ${displayValue}`;
    case 'in':
      return `${fieldName} is any of ${displayValue}`;
    case 'not_in':
      return `${fieldName} is none of ${displayValue}`;
    case 'is_empty':
      return `${fieldName} is empty`;
    case 'is_not_empty':
      return `${fieldName} is not empty`;
    default:
      return `${fieldName} ${operator} ${displayValue}`;
  }
};

export const createComplexFilterRule = (
  field: string,
  operator: string,
  value: any,
  fieldName?: string
): ComplexFilterRule => {
  const displayName = fieldName || field;
  
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    field,
    operator: operator as any,
    value,
    fieldPath: [field],
    label: createFilterLabel(displayName, operator, value)
  };
}; 