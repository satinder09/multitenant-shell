'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ComplexFilter } from '@/shared/types/types';
import { generateId } from '@/shared/utils/utils';
import { FilterPresetsConfig } from './FilterPresets';

interface DatePickerFilterProps {
  filter: FilterPresetsConfig;
  onApply: (filter: ComplexFilter) => void;
  onClose: () => void;
}

export const DatePickerFilter: React.FC<DatePickerFilterProps> = ({ filter, onApply, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    if (!selectedDate) return;
    
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    
    const createDateFilterLabel = (field: string, operator: string, date: Date) => {
      const formattedDate = format(date, 'PPP');
      switch (operator) {
        case 'equals':
        case '=':
          return `${field} is ${formattedDate}`;
        case 'greater_than':
        case '>':
          return `${field} is after ${formattedDate}`;
        case 'less_than':
        case '<':
          return `${field} is before ${formattedDate}`;
        case 'greater_than_or_equal':
        case '>=':
          return `${field} is on or after ${formattedDate}`;
        case 'less_than_or_equal':
        case '<=':
          return `${field} is on or before ${formattedDate}`;
        default:
          return `${field} ${operator} ${formattedDate}`;
      }
    };

    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: generateId(),
        logic: 'AND',
        rules: [{
          id: generateId(),
          field: filter.field,
          operator: filter.operator as any,
          value: selectedDate.toISOString(),
          fieldPath: [filter.field],
          label: createDateFilterLabel(fieldName, filter.operator, selectedDate)
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
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setIsOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm" disabled={!selectedDate}>Apply Filter</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
}; 