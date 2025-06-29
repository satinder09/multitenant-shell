'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Edit, Filter } from 'lucide-react';
import { ComplexFilter, ComplexFilterRule } from '@/shared/types/types';
import { DATE_PRESETS } from '@/shared/utils/filter-field-types';
import { format } from 'date-fns';

interface FilterTagsProps {
  filter: ComplexFilter | null;
  onEditFilter: (filter: ComplexFilter) => void;
  onRemoveFilter: (ruleId: string) => void;
  onClearAll: () => void;
}

export const FilterTags: React.FC<FilterTagsProps> = ({
  filter,
  onEditFilter,
  onRemoveFilter,
  onClearAll
}) => {
  if (!filter?.rootGroup.rules.length) {
    return null;
  }

  const formatFilterValue = (rule: ComplexFilterRule): string => {
    if (rule.value === null || rule.value === undefined) {
      return '';
    }

    // Debug logging to help identify the issue
    console.log('FilterTags formatFilterValue:', {
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      valueType: typeof rule.value,
      isArray: Array.isArray(rule.value),
      isDate: rule.value instanceof Date
    });

    // Handle date range objects (from/to)
    if (typeof rule.value === 'object' && !Array.isArray(rule.value) && !(rule.value instanceof Date)) {
      if (rule.value.from && rule.value.to) {
        try {
          const fromDate = new Date(rule.value.from);
          const toDate = new Date(rule.value.to);
          // Ensure dates are valid before formatting
          if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
            return `${format(fromDate, 'MMM dd, yyyy')} - ${format(toDate, 'MMM dd, yyyy')}`;
          } else {
            return `${rule.value.from} - ${rule.value.to}`;
          }
        } catch (error) {
          console.warn('Error formatting date range:', error);
          return `${rule.value.from} - ${rule.value.to}`;
        }
      }
      // If it's some other object, try to stringify it meaningfully
      console.warn('Unhandled object value in filter:', rule.value);
      return JSON.stringify(rule.value);
    }

    // Handle array values (for multi-select)
    if (Array.isArray(rule.value)) {
      if (rule.value.length === 0) return '';
      if (rule.value.length === 1) return String(rule.value[0]);
      if (rule.value.length === 2 && rule.operator === 'between') {
        // Handle date arrays for between operations
        if (typeof rule.value[0] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rule.value[0])) {
          try {
            const fromDate = new Date(rule.value[0]);
            const toDate = new Date(rule.value[1]);
            return `${format(fromDate, 'MMM dd, yyyy')} - ${format(toDate, 'MMM dd, yyyy')}`;
          } catch {
            return `${rule.value[0]} - ${rule.value[1]}`;
          }
        }
        return `${rule.value[0]} - ${rule.value[1]}`;
      }
      return `${rule.value.length} items`;
    }

    // Handle date values
    if (rule.value instanceof Date) {
      return format(rule.value, 'MMM dd, yyyy');
    }

    // Handle date strings
    if (typeof rule.value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rule.value)) {
      try {
        return format(new Date(rule.value), 'MMM dd, yyyy');
      } catch {
        return rule.value;
      }
    }

    // Handle boolean values
    if (typeof rule.value === 'boolean') {
      return rule.value ? 'True' : 'False';
    }

    return String(rule.value);
  };

  const getOperatorLabel = (operator: string): string => {
    const operatorLabels: Record<string, string> = {
      'equals': 'is',
      'not_equals': 'is not',
      'contains': 'contains',
      'not_contains': 'does not contain',
      'starts_with': 'starts with',
      'ends_with': 'ends with',
      'greater_than': 'is greater than',
      'less_than': 'is less than',
      'greater_equal': 'is ≥',
      'less_equal': 'is ≤',
      'between': 'is between',
      'in': 'is any of',
      'not_in': 'is none of',
      'is_empty': 'is empty',
      'is_not_empty': 'is not empty',
      'preset': 'is'
    };
    return operatorLabels[operator] || operator;
  };

  const formatFilterLabel = (rule: ComplexFilterRule): string => {
    // If rule.label already contains a complete filter description (includes operator keywords), use it as-is
    if (rule.label && (
      rule.label.includes('contains') || 
      rule.label.includes('equals') || 
      rule.label.includes('is ') || 
      rule.label.includes('starts with') || 
      rule.label.includes('ends with') ||
      rule.label.includes('between') ||
      rule.label.includes('after') ||
      rule.label.includes('before')
    )) {
      return rule.label;
    }
    
    // Otherwise, construct the label from components
    const fieldLabel = rule.label || rule.field;
    const operatorLabel = getOperatorLabel(rule.operator);
    const value = formatFilterValue(rule);

    // For operators that don't need values
    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
      return `${fieldLabel} ${operatorLabel}`;
    }

    // For operators with values
    if (value) {
      return `${fieldLabel} ${operatorLabel} ${value}`;
    }

    return `${fieldLabel} ${operatorLabel}`;
  };

  const createSingleRuleFilter = (rule: ComplexFilterRule): ComplexFilter => {
    return {
      rootGroup: {
        id: 'temp-' + Date.now(),
        logic: 'AND',
        rules: [rule],
        groups: []
      }
    };
  };

  return (
    <div className="flex flex-wrap items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
        <Filter className="w-4 h-4" />
        <span>Active filters:</span>
      </div>
      
      {filter.rootGroup.logic === 'OR' && filter.rootGroup.rules.length > 1 && (
        <Badge variant="outline" className="text-xs font-normal border-orange-200 text-orange-700 bg-orange-50">
          Match ANY of:
        </Badge>
      )}
      
      {filter.rootGroup.logic === 'AND' && filter.rootGroup.rules.length > 1 && (
        <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-700 bg-blue-50">
          Match ALL of:
        </Badge>
      )}

      {filter.rootGroup.rules.map((rule) => (
        <Badge
          key={rule.id}
          variant="secondary"
          className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 px-3 py-1.5 text-sm max-w-none bg-blue-50 border-blue-200 text-blue-900"
          onClick={() => onEditFilter(createSingleRuleFilter(rule))}
        >
          <Edit className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium">
            {formatFilterLabel(rule)}
          </span>
          <X
            className="h-3 w-3 cursor-pointer hover:text-red-600 ml-1 flex-shrink-0 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFilter(rule.id);
            }}
          />
        </Badge>
      ))}

      {filter.rootGroup.rules.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 text-xs text-gray-500 hover:text-red-500"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}; 