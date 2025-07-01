'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  DATE_PRESETS, 
  operatorRequiresValue, 
  operatorSupportsMultiValue,
  detectFieldType 
} from '@/shared/utils/filter-field-types';
import { MultiValueSelector } from './MultiValueSelector';
import { ColumnDefinition } from '@/shared/modules/types';
import { filterSourceService, FilterOption } from '@/shared/services/core/filter-source.service';

interface DynamicInputProps {
  fieldName: string;
  fieldPath: string[];
  fieldType: string;
  operator: string;
  value: any;
  onChange: (value: any) => void;
  moduleName: string;
  enumOptions?: Array<{ value: any; label: string; color?: string; description?: string }>;
  fieldConfig?: ColumnDefinition; // Add fieldConfig prop for filterSource support
}

export const DynamicInput: React.FC<DynamicInputProps> = ({
  fieldName,
  fieldPath,
  fieldType,
  operator,
  value,
  onChange,
  moduleName,
  enumOptions = [],
  fieldConfig
}) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('');
  const [dynamicOptions, setDynamicOptions] = useState<FilterOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Load dynamic options from filterSource
  useEffect(() => {
    const loadDynamicOptions = async () => {
      if (!fieldConfig?.filterSource || enumOptions.length > 0) {
        return; // Use provided enumOptions or no filterSource configured
      }

      setLoadingOptions(true);
      setOptionsError(null);

      try {
        const response = await filterSourceService.loadFilterOptions(fieldConfig.filterSource);
        
        if (response.error) {
          setOptionsError(response.error);
        }
        
        setDynamicOptions(response.options);
      } catch (error) {
        console.error('Failed to load field options:', error);
        setOptionsError('Failed to load options');
        setDynamicOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadDynamicOptions();
  }, [fieldConfig?.filterSource, enumOptions.length]);

  // Get effective options (prefer enumOptions, then dynamicOptions)
  const getEffectiveOptions = (): FilterOption[] => {
    if (enumOptions.length > 0) {
      return enumOptions;
    }
    return dynamicOptions;
  };

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
    const effectiveOptions = getEffectiveOptions();
    
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
        <div className="w-48">
          <Select value={value || ''} onValueChange={onChange} disabled={loadingOptions}>
            <SelectTrigger>
              <SelectValue placeholder={
                loadingOptions ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  'Select value...'
                )
              } />
            </SelectTrigger>
            <SelectContent>
              {effectiveOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">({option.description})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {effectiveOptions.length === 0 && !loadingOptions && (
                <SelectItem value="" disabled>
                  {optionsError || 'No options available'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
                     {optionsError && (
                             <p className="text-xs text-destructive mt-1">{optionsError}</p>
           )}
         </div>
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
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
        onClick={onRemove}
      />
    </Badge>
  );
}; 