'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Search, X } from 'lucide-react';
import { FieldValue, NestedFieldConfig } from '@/shared/types/types';
import { debounce } from '@/shared/utils/utils';
import { browserApi } from '@/shared/services/api-client';

interface MultiValueSelectorProps {
  fieldPath: string[];
  moduleName: string;
  selectedValues: FieldValue[];
  onValuesChange: (values: FieldValue[]) => void;
  fieldConfig: NestedFieldConfig;
}

export const MultiValueSelector: React.FC<MultiValueSelectorProps> = ({
  fieldPath,
  moduleName,
  selectedValues,
  onValuesChange,
  fieldConfig
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableValues, setAvailableValues] = useState<FieldValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      loadValues(term);
    }, 300),
    [fieldPath, moduleName]
  );

  useEffect(() => {
    if (isOpen) {
      loadValues();
    }
  }, [isOpen, fieldPath]);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else if (isOpen) {
      loadValues();
    }
  }, [searchTerm, debouncedSearch, isOpen]);

  const loadValues = async (search?: string) => {
    if (!fieldPath.length) return;
    
    setIsLoading(true);
    try {
      const response = await browserApi.post(`/api/filters/${moduleName}/field-values`, {
        fieldPath,
        search: search || '',
        limit: 50
      });
      
      if (response.success) {
        setAvailableValues(response.data as FieldValue[]);
      }
    } catch (error) {
      console.error('Failed to load field values:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleValue = (value: FieldValue) => {
    const isSelected = selectedValues.some(v => v.value === value.value);
    
    if (isSelected) {
      onValuesChange(selectedValues.filter(v => v.value !== value.value));
    } else {
      onValuesChange([...selectedValues, value]);
    }
  };

  const removeValue = (valueToRemove: FieldValue) => {
    onValuesChange(selectedValues.filter(v => v.value !== valueToRemove.value));
  };

  const clearAll = () => {
    onValuesChange([]);
  };

  return (
    <div className="space-y-2">
      {/* Selected Values as Tags */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((value) => (
            <Badge
              key={value.value}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="truncate max-w-24">{value.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeValue(value)}
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {selectedValues.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${fieldConfig.label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {/* Dropdown with Available Values */}
      {isOpen && (
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-50 max-h-48 overflow-y-auto border rounded-lg bg-background shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : availableValues.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchTerm ? `No values found for "${searchTerm}"` : 'No values available'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableValues.map((value) => {
                  const isSelected = selectedValues.some(v => v.value === value.value);
                  
                  return (
                    <div
                      key={value.value}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => toggleValue(value)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{value.label}</div>
                        {value.count !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {value.count} record{value.count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Close button */}
            <div className="sticky bottom-0 p-2 border-t bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
          
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}; 