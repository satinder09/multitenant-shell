'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DatePreset } from '@/lib/filter-registry';

// Date Picker Input Component
interface DatePickerInputProps {
  value: any;
  onChange: (value: any) => void;
  onApply: () => void;
  presets?: DatePreset[];
  placeholder?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  onApply,
  presets,
  placeholder = "Select date..."
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value instanceof Date ? value : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (presetValue: string) => {
    onChange(presetValue);
    onApply();
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onChange(date);
  };

  const handleApplyDate = () => {
    if (selectedDate) {
      onApply();
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Date Presets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map(preset => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Custom Date Picker */}
      <div className="flex gap-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-start text-left font-normal h-7 text-xs"
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {selectedDate ? format(selectedDate, "PPP") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="p-2 border-t">
              <Button
                size="sm"
                onClick={handleApplyDate}
                disabled={!selectedDate}
                className="w-full h-7 text-xs"
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

// Dropdown Input Component
interface DropdownInputProps {
  value: any;
  onChange: (value: any) => void;
  onApply: () => void;
  dataSource?: {
    table: string;
    valueField: string;
    displayField: string;
  };
  placeholder?: string;
}

export const DropdownInput: React.FC<DropdownInputProps> = ({
  value,
  onChange,
  onApply,
  dataSource,
  placeholder = "Select option..."
}) => {
  const [options, setOptions] = useState<Array<{value: any, label: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load dropdown options
  useEffect(() => {
    if (!dataSource) return;
    
    const loadOptions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/filters/dropdown-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dataSource,
            searchTerm: searchTerm || undefined,
            limit: 50
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setOptions(data.options || []);
        } else {
          console.error('Failed to load dropdown options');
          setOptions([]);
        }
      } catch (error) {
        console.error('Error loading dropdown options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadOptions();
  }, [dataSource, searchTerm]);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleApply = () => {
    if (value) {
      onApply();
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      {/* Search Input for filtering options */}
      {options.length > 5 && (
        <Input
          placeholder="Search options..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-7 text-xs"
        />
      )}
      
      {/* Dropdown and Apply Button */}
      <div className="flex gap-1">
        <Select
          value={value?.toString() || ''}
          onValueChange={handleValueChange}
          disabled={loading}
        >
          <SelectTrigger className="flex-1 h-7 text-xs">
            <SelectValue placeholder={loading ? "Loading..." : placeholder}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </div>
              ) : (
                selectedOption?.label || placeholder
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
            {options.length === 0 && !loading && (
              <SelectItem value="__no_options__" disabled>
                No options available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!value || loading}
          className="px-2 py-1 h-7 text-xs"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

// Multi-Select Input Component (for future use)
interface MultiSelectInputProps {
  value: any[];
  onChange: (value: any[]) => void;
  onApply: () => void;
  dataSource?: {
    table: string;
    valueField: string;
    displayField: string;
  };
  placeholder?: string;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  value = [],
  onChange,
  onApply,
  dataSource,
  placeholder = "Select options..."
}) => {
  const [options, setOptions] = useState<Array<{value: any, label: string}>>([]);
  const [loading, setLoading] = useState(false);

  // Load options (similar to DropdownInput)
  useEffect(() => {
    if (!dataSource) return;
    
    const loadOptions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/filters/dropdown-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dataSource,
            limit: 100
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setOptions(data.options || []);
        }
      } catch (error) {
        console.error('Error loading multi-select options:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOptions();
  }, [dataSource]);

  const toggleOption = (optionValue: any) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleApply = () => {
    if (value.length > 0) {
      onApply();
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected items display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(val => {
            const option = options.find(opt => opt.value === val);
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
              >
                {option?.label || val}
                <button
                  onClick={() => toggleOption(val)}
                  className="text-primary/60 hover:text-primary"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      
      {/* Options list */}
      <div className="max-h-32 overflow-y-auto border rounded p-1">
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm">Loading...</span>
          </div>
        ) : (
          options.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="rounded"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))
        )}
      </div>
      
      {/* Apply Button */}
      <Button
        size="sm"
        onClick={handleApply}
        disabled={value.length === 0 || loading}
        className="w-full h-7 text-xs"
      >
        Apply ({value.length} selected)
      </Button>
    </div>
  );
}; 