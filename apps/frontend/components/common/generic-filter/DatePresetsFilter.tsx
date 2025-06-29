'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplexFilter } from '@/shared/types/types';
import { generateId } from '@/shared/utils/utils';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { FilterPresetsConfig } from './FilterPresets';

interface DatePresetsFilterProps {
  filter: FilterPresetsConfig;
  onApply: (filter: ComplexFilter) => void;
  onClose: () => void;
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today', getDates: () => [new Date(), new Date()] },
  { value: 'yesterday', label: 'Yesterday', getDates: () => [subDays(new Date(), 1), subDays(new Date(), 1)] },
  { value: 'last_7_days', label: 'Last 7 days', getDates: () => [subDays(new Date(), 7), new Date()] },
  { value: 'last_30_days', label: 'Last 30 days', getDates: () => [subDays(new Date(), 30), new Date()] },
  { value: 'this_week', label: 'This week', getDates: () => [startOfWeek(new Date()), endOfWeek(new Date())] },
  { value: 'last_week', label: 'Last week', getDates: () => [startOfWeek(subDays(new Date(), 7)), endOfWeek(subDays(new Date(), 7))] },
  { value: 'this_month', label: 'This month', getDates: () => [startOfMonth(new Date()), endOfMonth(new Date())] },
  { value: 'last_month', label: 'Last month', getDates: () => [startOfMonth(subDays(new Date(), 30)), endOfMonth(subDays(new Date(), 30))] },
  { value: 'this_year', label: 'This year', getDates: () => [startOfYear(new Date()), endOfYear(new Date())] },
  { value: 'last_year', label: 'Last year', getDates: () => [startOfYear(subDays(new Date(), 365)), endOfYear(subDays(new Date(), 365))] }
];

export const DatePresetsFilter: React.FC<DatePresetsFilterProps> = ({ filter, onApply, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleApply = () => {
    if (!selectedPreset) return;
    
    const preset = DATE_PRESETS.find(p => p.value === selectedPreset);
    if (!preset) return;
    
    const [from, to] = preset.getDates();
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: generateId(),
        logic: 'AND',
        rules: [{
          id: generateId(),
          field: filter.field,
          operator: 'between' as any,
          value: [from.toISOString(), to.toISOString()],
          fieldPath: [filter.field],
          label: `${fieldName} is ${preset.label.toLowerCase()}`
        }],
        groups: []
      }
    };
    onApply(complexFilter);
    onClose();
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <h3 className="font-medium mb-2">{filter.label}</h3>
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger>
            <SelectValue placeholder="Select date range..." />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm" disabled={!selectedPreset}>Apply Filter</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
}; 