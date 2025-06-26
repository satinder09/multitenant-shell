export interface FieldTypeConfig {
  type: string;
  operators: OperatorConfig[];
  renderComponent?: string;
  defaultValue?: any;
  validation?: (value: any) => boolean;
}

export interface OperatorConfig {
  value: string;
  label: string;
  requiresValue?: boolean;
  multiValue?: boolean;
  customRenderer?: string;
}

export interface DatePreset {
  value: string;
  label: string;
  getValue: () => Date | [Date, Date];
}

// Date presets that work for any module
export const DATE_PRESETS: DatePreset[] = [
  {
    value: 'today',
    label: 'Today',
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  {
    value: 'yesterday',
    label: 'Yesterday',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    }
  },
  {
    value: 'last_7_days',
    label: 'Last 7 days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
  },
  {
    value: 'last_30_days',
    label: 'Last 30 days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
  },
  {
    value: 'this_week',
    label: 'This week',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
  },
  {
    value: 'this_month',
    label: 'This month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
  },
  {
    value: 'custom',
    label: 'Custom date...',
    getValue: () => new Date() // Placeholder, will open date picker
  }
];

// Universal field type configurations
export const FIELD_TYPE_CONFIGS: Record<string, FieldTypeConfig> = {
  string: {
    type: 'string',
    operators: [
      { value: 'equals', label: 'is equal to' },
      { value: 'not_equals', label: 'is not equal to' },
      { value: 'contains', label: 'contains' },
      { value: 'not_contains', label: 'does not contain' },
      { value: 'starts_with', label: 'starts with' },
      { value: 'ends_with', label: 'ends with' },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false }
    ],
    defaultValue: ''
  },
  
  number: {
    type: 'number',
    operators: [
      { value: 'equals', label: 'is equal to' },
      { value: 'not_equals', label: 'is not equal to' },
      { value: 'greater_than', label: 'is greater than' },
      { value: 'less_than', label: 'is less than' },
      { value: 'greater_equal', label: 'is greater than or equal to' },
      { value: 'less_equal', label: 'is less than or equal to' },
      { value: 'between', label: 'is between', multiValue: true },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false }
    ],
    defaultValue: 0
  },
  
  boolean: {
    type: 'boolean',
    operators: [
      { value: 'equals', label: 'is' },
      { value: 'not_equals', label: 'is not' }
    ],
    defaultValue: true
  },
  
  date: {
    type: 'date',
    operators: [
      { value: 'equals', label: 'is on' },
      { value: 'not_equals', label: 'is not on' },
      { value: 'greater_than', label: 'is after' },
      { value: 'less_than', label: 'is before' },
      { value: 'between', label: 'is between', multiValue: true },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
      { value: 'preset', label: 'is', customRenderer: 'date-preset' }
    ],
    renderComponent: 'date-picker',
    defaultValue: new Date()
  },
  
  datetime: {
    type: 'datetime',
    operators: [
      { value: 'equals', label: 'is on' },
      { value: 'not_equals', label: 'is not on' },
      { value: 'greater_than', label: 'is after' },
      { value: 'less_than', label: 'is before' },
      { value: 'between', label: 'is between', multiValue: true },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
      { value: 'preset', label: 'is', customRenderer: 'date-preset' }
    ],
    renderComponent: 'datetime-picker',
    defaultValue: new Date()
  },
  
  enum: {
    type: 'enum',
    operators: [
      { value: 'equals', label: 'is' },
      { value: 'not_equals', label: 'is not' },
      { value: 'in', label: 'is any of', multiValue: true },
      { value: 'not_in', label: 'is none of', multiValue: true },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false }
    ],
    renderComponent: 'enum-selector',
    defaultValue: null
  },
  
  text: {
    type: 'text',
    operators: [
      { value: 'contains', label: 'contains' },
      { value: 'not_contains', label: 'does not contain' },
      { value: 'equals', label: 'is exactly' },
      { value: 'not_equals', label: 'is not exactly' },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false }
    ],
    renderComponent: 'textarea',
    defaultValue: ''
  }
};

// Auto-detect field types based on field names and metadata
export const detectFieldType = (fieldName: string, fieldPath: string[], metadata?: any): string => {
  // Check metadata first if available
  if (metadata?.type) {
    return metadata.type;
  }
  
  // Date/time fields
  if (fieldName.includes('At') || fieldName.includes('Date') || fieldName.includes('Time')) {
    return 'datetime';
  }
  
  // Boolean fields
  if (fieldName.startsWith('is') || fieldName.startsWith('has') || fieldName.startsWith('can')) {
    return 'boolean';
  }
  
  // Enum fields based on common patterns
  if (fieldName === 'status' || fieldName === 'type' || fieldName === 'level' || fieldName === 'role') {
    return 'enum';
  }
  
  // ID fields
  if (fieldName === 'id' || fieldName.endsWith('Id')) {
    return 'string';
  }
  
  // Number fields
  if (fieldName === 'count' || fieldName === 'amount' || fieldName === 'price' || fieldName === 'quantity') {
    return 'number';
  }
  
  // Text fields for longer content
  if (fieldName === 'description' || fieldName === 'content' || fieldName === 'notes' || fieldName === 'comment') {
    return 'text';
  }
  
  // Default to string
  return 'string';
};

// Get operators for a field type
export const getOperatorsForFieldType = (fieldType: string): OperatorConfig[] => {
  const config = FIELD_TYPE_CONFIGS[fieldType];
  return config ? config.operators : FIELD_TYPE_CONFIGS.string.operators;
};

// Get default value for a field type
export const getDefaultValueForFieldType = (fieldType: string): any => {
  const config = FIELD_TYPE_CONFIGS[fieldType];
  return config ? config.defaultValue : '';
};

// Check if operator requires a value
export const operatorRequiresValue = (operator: string, fieldType: string): boolean => {
  const operators = getOperatorsForFieldType(fieldType);
  const operatorConfig = operators.find(op => op.value === operator);
  return operatorConfig?.requiresValue !== false; // Default to true if not specified
};

// Check if operator supports multiple values
export const operatorSupportsMultiValue = (operator: string, fieldType: string): boolean => {
  const operators = getOperatorsForFieldType(fieldType);
  const operatorConfig = operators.find(op => op.value === operator);
  return operatorConfig?.multiValue === true;
}; 