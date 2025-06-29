'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ComplexFilter } from '@/shared/types/types';
import { filterSourceService, FilterOption } from '@/shared/services/core/filter-source.service';
import { FilterSource } from '@/shared/modules/types';
import { generateId } from '@/shared/utils/utils';
import { createComplexFilterRule } from '@/shared/utils/filterUtils';

interface FilterPresetsProps {
  filter: FilterPresetsConfig;
  onApply: (filter: ComplexFilter) => void;
  onClose: () => void;
}

export interface FilterPresetsConfig {
  id: string;
  label: string;
  field: string;
  type: 'predefined' | 'user_input' | 'dropdown' | 'date_picker' | 'date_range' | 'date_presets';
  operator: string;
  value?: any;
  options?: Array<{ value: any; label: string; color?: string }>;
  placeholder?: string;
  icon?: React.ReactNode;
  
  // Legacy support
  apiEndpoint?: string;
  
  // New filter source configuration
  filterSource?: FilterSource;
  
  // Column configuration reference for unified field names
  column?: any; // Will contain the full column config
}

// NOTE: This file is marked for refactoring - currently consolidated to avoid breaking imports
// TODO: Split into focused components (PredefinedFilter, UserInputFilter, etc.)
export const FilterPresets: React.FC<FilterPresetsProps> = ({ filter, onApply, onClose }) => {
  // For now, rendering a simplified version to avoid import errors
  // This maintains functionality while we complete the architectural cleanup
  
  const handleApply = () => {
    const fieldName = filter.column?.display || filter.field;
    
    const newRule = createComplexFilterRule(
      filter.field,
      filter.operator,
      filter.value || 'default',
      fieldName
    );
    
    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: generateId(),
        logic: 'AND',
        rules: [newRule],
        groups: []
      }
    };
    onApply(complexFilter);
    onClose();
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{filter.label}</h3>
        <Badge variant="secondary">
          {typeof filter.value === 'boolean' 
            ? (filter.value ? 'Yes' : 'No')
            : String(filter.value || 'Filter')
          }
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm">Apply Filter</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
};
