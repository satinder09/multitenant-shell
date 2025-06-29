'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComplexFilter } from '@/shared/types/types';
import { generateId } from '@/shared/utils/utils';
import { createComplexFilterRule } from '@/shared/utils/filterUtils';
import { FilterPresetsConfig } from './FilterPresets';

interface UserInputFilterProps {
  filter: FilterPresetsConfig;
  onApply: (filter: ComplexFilter) => void;
  onClose: () => void;
}

export const UserInputFilter: React.FC<UserInputFilterProps> = ({ filter, onApply, onClose }) => {
  const [value, setValue] = useState('');

  const handleApply = () => {
    if (!value.trim()) return;
    
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    
    const newRule = createComplexFilterRule(
      filter.field,
      filter.operator,
      value,
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
      <div>
        <h3 className="font-medium mb-2">{filter.label}</h3>
        <Input
          placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}... (use | for OR: value1|value2)`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm" disabled={!value.trim()}>Apply Filter</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
}; 