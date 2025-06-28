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
import { ComplexFilter } from '@/lib/types';
import { filterSourceService, FilterOption } from '@/lib/services/filter-source.service';
import { FilterSource } from '@/lib/modules/types';
import { generateId } from '@/lib/utils';
import { createComplexFilterRule } from '@/lib/utils/filterUtils';

interface PopularFilterComponentProps {
  filter: PopularFilterConfig;
  onApply: (filter: ComplexFilter) => void;
  onClose: () => void;
}

export interface PopularFilterConfig {
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

// Date preset options
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

// Predefined Filter Component
export const PredefinedFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
  const handleApply = () => {
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    
    const newRule = createComplexFilterRule(
      filter.field,
      filter.operator,
      filter.value,
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
            : String(filter.value)
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

// User Input Filter Component
export const UserInputFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
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

// Dropdown Filter Component
export const DropdownFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [options, setOptions] = useState<FilterOption[]>(filter.options || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load options from various sources
  useEffect(() => {
    const loadOptions = async () => {
      // If static options are provided, use them
      if (filter.options && filter.options.length > 0) {
        setOptions(filter.options);
        return;
      }

      // If filter source is configured, use it
      if (filter.filterSource) {
        setLoading(true);
        setError(null);
        
        try {
          const response = await filterSourceService.loadFilterOptions(
            filter.filterSource,
            searchTerm || undefined
          );
          
          if (response.error) {
            setError(response.error);
          }
          
          setOptions(response.options);
        } catch (err) {
          console.error('Failed to load filter options:', err);
          setError('Failed to load options');
          setOptions([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Legacy API endpoint support
      if (filter.apiEndpoint) {
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(filter.apiEndpoint);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          const optionsData = data.options || data;
          
          if (Array.isArray(optionsData)) {
            setOptions(optionsData);
          } else {
            throw new Error('Invalid response format');
          }
        } catch (err) {
          console.error('Failed to load options from API:', err);
          setError('Failed to load options');
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }
    };

    loadOptions();
  }, [filter.options, filter.filterSource, filter.apiEndpoint, searchTerm]);

  const handleApply = () => {
    if (!selectedValue) return;
    
    const selectedOption = options.find(opt => opt.value === selectedValue);
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    // Use the actual value for the filter, not the display label
    const filterValue = selectedValue;
    
    const newRule = createComplexFilterRule(
      filter.field,
      filter.operator,
      filterValue,
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
        
        {/* Search input for searchable filter sources */}
        {filter.filterSource?.api?.searchable?.enabled && (
          <div className="mb-2">
            <Input
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
        
        <Select value={selectedValue} onValueChange={setSelectedValue} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={
              loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                `Select ${filter.label.toLowerCase()}...`
              )
            } />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
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
            {options.length === 0 && !loading && (
              <SelectItem value="" disabled>
                {error || 'No options available'}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm" disabled={!selectedValue || loading}>
          Apply Filter
        </Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
};

// Date Picker Filter Component
export const DatePickerFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    if (!selectedDate) return;
    
    // Use column display name for proper labeling, fallback to field name
    const fieldName = filter.column?.display || filter.field;
    
    // Create a user-friendly label based on the operator
    const createDateFilterLabel = (field: string, operator: string, date: Date) => {
      const formattedDate = format(date, 'PPP');
      switch (operator) {
        case 'equals':
          return `${field} is ${formattedDate}`;
        case 'greater_than':
          return `${field} is after ${formattedDate}`;
        case 'less_than':
          return `${field} is before ${formattedDate}`;
        case 'greater_equal':
          return `${field} is on or after ${formattedDate}`;
        case 'less_equal':
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

// Date Range Filter Component
export const DateRangeFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    if (!dateRange.from || !dateRange.to) return;
    
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
          value: [dateRange.from.toISOString(), dateRange.to.toISOString()],
          fieldPath: [filter.field],
          label: `${fieldName} is between ${format(dateRange.from, 'PPP')} and ${format(dateRange.to, 'PPP')}`
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
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                'Pick a date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to
                });
                if (range?.from && range?.to) {
                  setIsOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleApply} size="sm" disabled={!dateRange.from || !dateRange.to}>Apply Filter</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
      </div>
    </div>
  );
};

// Date Presets Filter Component
export const DatePresetsFilter: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
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

// Main Popular Filter Component
export const PopularFilterComponent: React.FC<PopularFilterComponentProps> = ({ filter, onApply, onClose }) => {
  switch (filter.type) {
    case 'predefined':
      return <PredefinedFilter filter={filter} onApply={onApply} onClose={onClose} />;
    case 'date_presets':
      return <DatePresetsFilter filter={filter} onApply={onApply} onClose={onClose} />;
    case 'user_input':
      return <UserInputFilter filter={filter} onApply={onApply} onClose={onClose} />;
    case 'dropdown':
      return <DropdownFilter filter={filter} onApply={onApply} onClose={onClose} />;
    case 'date_picker':
      return <DatePickerFilter filter={filter} onApply={onApply} onClose={onClose} />;
    case 'date_range':
      return <DateRangeFilter filter={filter} onApply={onApply} onClose={onClose} />;
    default:
      return <PredefinedFilter filter={filter} onApply={onApply} onClose={onClose} />;
  }
};
