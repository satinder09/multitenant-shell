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
import { DATE_PRESETS } from '@/shared/utils/filter-field-types';

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

export const FilterPresets: React.FC<FilterPresetsProps> = ({ filter, onApply, onClose }) => {
  const [inputValue, setInputValue] = useState<any>(filter.value || '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [loading, setLoading] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<FilterOption[]>([]);

  // Load dynamic options if needed
  useEffect(() => {
    const loadOptions = async () => {
      if (filter.type === 'dropdown' && filter.column?.filterSource && !filter.options?.length) {
        setLoading(true);
        try {
          const response = await filterSourceService.loadFilterOptions(filter.column.filterSource);
          setDynamicOptions(response.options);
        } catch (error) {
          console.error('Failed to load filter options:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadOptions();
  }, [filter.type, filter.column?.filterSource, filter.options?.length]);

  const handleApply = () => {
    let finalValue = inputValue;

    // Process value based on filter type
    switch (filter.type) {
      case 'date_picker':
        finalValue = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
        break;
      case 'date_range':
        if (dateRange.from && dateRange.to) {
          finalValue = {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd')
          };
        }
        break;
      case 'date_presets':
        // For date presets, process the preset value
        const preset = DATE_PRESETS.find(p => p.value === inputValue);
        if (preset) {
          const dateValue = preset.getValue();
          if (Array.isArray(dateValue)) {
            // It's a date range [start, end]
            finalValue = {
              from: format(dateValue[0], 'yyyy-MM-dd'),
              to: format(dateValue[1], 'yyyy-MM-dd')
            };
            console.log('FilterPresets date_presets processing:', {
              preset: preset.label,
              originalValue: dateValue,
              finalValue
            });
          } else {
            // It's a single date
            finalValue = format(dateValue, 'yyyy-MM-dd');
          }
        }
        break;
    }

    if (finalValue === '' || finalValue === null || finalValue === undefined) {
      return; // Don't apply empty filters
    }

    const fieldName = filter.column?.display || filter.label;
    
    const newRule = createComplexFilterRule(
      filter.field,
      filter.operator,
      finalValue,
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

  const renderInput = () => {
    switch (filter.type) {
      case 'user_input':
        return (
          <Input
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full"
          />
        );

      case 'dropdown':
        const options = filter.options || dynamicOptions;
        return (
          <Select value={inputValue} onValueChange={setInputValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'date_picker':
        return (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'date_range':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 'date_presets':
        return (
          <Select value={inputValue} onValueChange={setInputValue}>
            <SelectTrigger className="w-full">
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
        );

      case 'predefined':
      default:
        return (
          <div className="text-sm text-gray-600">
            This filter will be applied with the predefined value: {' '}
            <Badge variant="secondary">
              {typeof filter.value === 'boolean' 
                ? (filter.value ? 'Yes' : 'No')
                : String(filter.value)
              }
            </Badge>
          </div>
        );
    }
  };

  const isApplyDisabled = () => {
    switch (filter.type) {
      case 'user_input':
        return !inputValue || inputValue.trim() === '';
      case 'dropdown':
        return !inputValue;
      case 'date_picker':
        return !selectedDate;
      case 'date_range':
        return !dateRange.from || !dateRange.to;
      case 'date_presets':
        return !inputValue;
      case 'predefined':
      default:
        return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{filter.label}</h3>
          <Badge variant="outline" className="text-xs">
            {filter.operator}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {renderInput()}
        </div>
      </div>
      
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button 
          onClick={handleApply} 
          size="sm" 
          className="flex-1"
          disabled={isApplyDisabled() || loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Apply Filter
        </Button>
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
};
