'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { 
  DATE_PRESETS, 
  operatorRequiresValue, 
  operatorSupportsMultiValue,
  detectFieldType 
} from '@/lib/filter-field-types';
import { MultiValueSelector } from './MultiValueSelector';

interface EnhancedValueInputProps {
  fieldName: string;
  fieldPath: string[];
  fieldType: string;
  operator: string;
  value: any;
  onChange: (value: any) => void;
  moduleName: string;
  enumOptions?: Array<{ value: any; label: string }>;
}

export const EnhancedValueInput: React.FC<EnhancedValueInputProps> = ({
  fieldName,
  fieldPath,
  fieldType,
  operator,
  value,
  onChange,
  moduleName,
  enumOptions = []
}) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('');

  // Don't render anything if operator doesn't require a value
  if (!operatorRequiresValue(operator, fieldType)) {
    return <div className="text-sm text-gray-500 italic">No value required</div>;
  }

  // Date preset selector for date fields
  if ((fieldType === 'date' || fieldType === 'datetime') && operator === 'preset') {
    return (
      <Select 
        value={selectedDatePreset} 
        onValueChange={(presetValue) => {
          setSelectedDatePreset(presetValue);
          if (presetValue === 'custom') {
            setDatePickerOpen(true);
          } else {
            const preset = DATE_PRESETS.find(p => p.value === presetValue);
            if (preset) {
              const dateValue = preset.getValue();
              onChange(dateValue);
            }
          }
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select date..." />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date picker for date fields
  if (fieldType === 'date' || fieldType === 'datetime') {
    if (operatorSupportsMultiValue(operator, fieldType)) {
      // Date range picker
      const [startDate, endDate] = Array.isArray(value) ? value : [null, null];
      
      return (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-32 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(new Date(startDate), 'MMM dd, yyyy') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(date) => onChange([date, endDate])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-sm text-gray-500">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-32 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(new Date(endDate), 'MMM dd, yyyy') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate ? new Date(endDate) : undefined}
                onSelect={(date) => onChange([startDate, date])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    } else {
      // Single date picker
      return (
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), 'MMM dd, yyyy') : 'Select date...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => {
                onChange(date);
                setDatePickerOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }
  }

  // Boolean selector
  if (fieldType === 'boolean') {
    return (
      <Select 
        value={String(value)} 
        onValueChange={(val) => onChange(val === 'true')}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Enum selector (single or multi-value)
  if (fieldType === 'enum') {
    if (operatorSupportsMultiValue(operator, fieldType)) {
      return (
        <MultiValueSelector
          moduleName={moduleName}
          fieldPath={fieldPath}
          fieldConfig={{ 
            label: fieldName, 
            type: 'enum', 
            operators: [], 
            path: fieldPath
          }}
          selectedValues={Array.isArray(value) ? value : []}
          onValuesChange={onChange}
        />
      );
    } else {
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select value..." />
          </SelectTrigger>
          <SelectContent>
            {enumOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }

  // Number input (single or range)
  if (fieldType === 'number') {
    if (operatorSupportsMultiValue(operator, fieldType)) {
      // Number range input
      const [min, max] = Array.isArray(value) ? value : [null, null];
      
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={min || ''}
            onChange={(e) => onChange([parseFloat(e.target.value) || null, max])}
            placeholder="Min"
            className="w-24"
          />
          <span className="text-sm text-gray-500">to</span>
          <Input
            type="number"
            value={max || ''}
            onChange={(e) => onChange([min, parseFloat(e.target.value) || null])}
            placeholder="Max"
            className="w-24"
          />
        </div>
      );
    } else {
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || null)}
          placeholder="Enter number..."
          className="w-32"
        />
      );
    }
  }

  // Text area for long text fields
  if (fieldType === 'text') {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text..."
        className="min-h-[60px] resize-none"
        rows={2}
      />
    );
  }

  // Default string input
  return (
    <Input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="flex-1"
    />
  );
};

// Helper component for displaying selected date presets
export const DatePresetDisplay: React.FC<{ preset: string; onRemove: () => void }> = ({ 
  preset, 
  onRemove 
}) => {
  const presetConfig = DATE_PRESETS.find(p => p.value === preset);
  
  if (!presetConfig) return null;
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      {presetConfig.label}
      <X 
        className="h-3 w-3 cursor-pointer hover:text-red-500" 
        onClick={onRemove}
      />
    </Badge>
  );
}; 