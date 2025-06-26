'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Edit } from 'lucide-react';
import { ComplexFilter, ComplexFilterRule } from '@/lib/types';
import { DATE_PRESETS } from '@/lib/filter-field-types';
import { format } from 'date-fns';

interface ClickableFilterTagsProps {
  filter: ComplexFilter | null;
  onEditFilter: (filter: ComplexFilter) => void;
  onRemoveFilter: (ruleId: string) => void;
  onClearAll: () => void;
}

export const ClickableFilterTags: React.FC<ClickableFilterTagsProps> = ({
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

    // Handle array values (for multi-select)
    if (Array.isArray(rule.value)) {
      if (rule.value.length === 0) return '';
      if (rule.value.length === 1) return String(rule.value[0]);
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
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600 font-medium">Active filters:</span>
      
      {filter.rootGroup.logic === 'OR' && filter.rootGroup.rules.length > 1 && (
        <Badge variant="outline" className="text-xs">
          Match ANY of:
        </Badge>
      )}
      
      {filter.rootGroup.logic === 'AND' && filter.rootGroup.rules.length > 1 && (
        <Badge variant="outline" className="text-xs">
          Match ALL of:
        </Badge>
      )}

      {filter.rootGroup.rules.map((rule) => (
        <Badge
          key={rule.id}
          variant="secondary"
          className="flex items-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => onEditFilter(createSingleRuleFilter(rule))}
        >
          <Edit className="h-3 w-3" />
          <span className="max-w-48 truncate">
            {formatFilterLabel(rule)}
          </span>
          <X
            className="h-3 w-3 cursor-pointer hover:text-red-500 ml-1"
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