// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============= GENERIC FILTER UTILITIES =============

// Generate unique IDs for filter rules and groups
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Humanize field names (camelCase to Title Case)
export function humanizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/Id$/, ' ID')
    .replace(/Url$/, ' URL')
    .replace(/Api$/, ' API')
    .trim();
}

// Format field path for display (e.g., ['user', 'profile', 'name'] -> 'User > Profile > Name')
export function formatFieldPath(path: string[]): string {
  return path.map(humanizeFieldName).join(' > ');
}

// Parse value based on field type
export function parseFilterValue(value: any, fieldType: string): any {
  switch (fieldType) {
    case 'number':
      return Number(value);
    case 'date':
      return new Date(value);
    case 'boolean':
      return Boolean(value);
    default:
      return value;
  }
}

// Get operator label for display
export function getOperatorLabel(operator: string): string {
  const operatorLabels: Record<string, string> = {
    'equals': 'is equal to',
    'not_equals': 'is not equal to',
    'contains': 'contains',
    'not_contains': 'does not contain',
    'starts_with': 'starts with',
    'ends_with': 'ends with',
    'greater_than': 'is greater than',
    'less_than': 'is less than',
    'greater_equal': 'is greater than or equal to',
    'less_equal': 'is less than or equal to',
    'between': 'is between',
    'not_between': 'is not between',
    'is_set': 'is set',
    'is_not_set': 'is not set',
    'in': 'is in',
    'not_in': 'is not in',
    'is_in': 'is in',
    'is_not_in': 'is not in',
    'contains_any': 'contains any of',
    'contains_all': 'contains all of'
  };

  return operatorLabels[operator] || operator;
}

// Format filter value for display
export function formatFilterValue(value: any, operator: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (typeof value[0] === 'object' && value[0].label) {
      return value.map(v => v.label).join(', ');
    }
    return value.join(', ');
  }

  if (typeof value === 'object' && value.label) {
    return value.label;
  }

  if (operator === 'between' && Array.isArray(value)) {
    return `${value[0]} and ${value[1]}`;
  }

  return String(value);
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

// Check if two objects are equal (shallow comparison)
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => isEqual(val, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => isEqual(a[key], b[key]));
  }
  
  return false;
}

// Validate filter rule
export function validateFilterRule(rule: any): boolean {
  if (!rule.field || !rule.operator) return false;
  
  // Check if value is required for this operator
  const noValueOperators = ['is_set', 'is_not_set'];
  if (!noValueOperators.includes(rule.operator)) {
    if (rule.value === null || rule.value === undefined || rule.value === '') {
      return false;
    }
  }
  
  return true;
}

// Get available operators for a field type
export function getOperatorsForFieldType(fieldType: string): string[] {
  const operatorMap: Record<string, string[]> = {
    string: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_set', 'is_not_set'],
    number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_set', 'is_not_set'],
    date: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'is_set', 'is_not_set'],
    boolean: ['equals', 'not_equals'],
    enum: ['equals', 'not_equals', 'in', 'not_in'],
    relation: ['equals', 'not_equals', 'in', 'not_in', 'is_set', 'is_not_set']
  };

  return operatorMap[fieldType] || ['equals', 'not_equals'];
}

// Format date for display
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date);
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toLocaleDateString('en-US');
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Get color for status
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'green',
    inactive: 'red',
    pending: 'yellow',
    draft: 'gray',
    published: 'blue',
    archived: 'purple'
  };
  
  return colorMap[status.toLowerCase()] || 'gray';
}

// Sleep function for testing
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
