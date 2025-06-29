'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  Star, 
  Plus, 
  ChevronDown, 
  BarChart3, 
  Calendar,
  Shield,
  Users
} from 'lucide-react';
import { ComplexFilter, ComplexFilterRule, SavedSearch } from '@/shared/types/types';
import { ModuleConfig, ColumnDefinition } from '@/shared/modules/types';
import { FilterDialog } from './FilterDialog';
import { FilterPresets, FilterPresetsConfig } from './FilterPresets';
import { createComplexFilterRule } from '@/shared/utils/filterUtils';

interface FilterDropdownMenuProps {
  moduleName: string;
  savedSearches: SavedSearch[];
  complexFilter: ComplexFilter | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterApply: (filter: ComplexFilter | null) => void;
  onSavedSearchLoad: (searchId: string) => void;
  placeholder?: string;
  config?: ModuleConfig;
}

  interface FilterPreset {
    id: string;
    label: string;
    type: 'predefined' | 'user_input' | 'dropdown' | 'date_presets' | 'date_picker' | 'date_range';
    field: string;
    operator: string;
    value?: any;
    icon?: React.ReactNode;
    options?: { value: any; label: string; color?: string; description?: string }[];
    placeholder?: string;
    column?: ColumnDefinition;
  }

interface GroupByOption {
  id: string;
  label: string;
  field: string;
}

export const FilterDropdownMenu: React.FC<FilterDropdownMenuProps> = ({
  moduleName,
  savedSearches,
  complexFilter,
  searchValue,
  onSearchChange,
  onFilterApply,
  onSavedSearchLoad,
  placeholder = "Search...",
  config
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomFilterDialog, setShowCustomFilterDialog] = useState(false);
  const [showFilterPreset, setShowFilterPreset] = useState<FilterPresetsConfig | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate popular filters from config
  const filterPresets: FilterPreset[] = React.useMemo(() => {
    if (!config?.columns) {
      console.log('FilterDropdownMenu: No config or columns found');
      return [];
    }
    
    const presets = config.columns
      .filter(col => col.filterPreset)  // Only check for filterPreset, not popular
      .map(col => {
        const filterPreset = col.filterPreset!;
        
        // Determine filter type based on configuration
        const filterType: 'predefined' | 'user_input' | 'dropdown' | 'date_presets' | 'date_picker' | 'date_range' = (() => {
          if (filterPreset.value !== undefined) return 'predefined';
          if (filterPreset.operator === 'preset') return 'date_presets';
          
          // For fields with options but no predefined value
          if (col.options && col.options.length > 0) return 'dropdown';
          
          // For datetime fields
          if (col.type === 'datetime') {
            if (filterPreset.operator === 'between') return 'date_range';
            if (filterPreset.operator === 'equals') return 'date_picker';
          }
          
          // Default to user input for fields without predefined values
          return 'user_input';
        })();

        return {
          id: `popular-${col.field}`,
          label: filterPreset.label || col.display,
          type: filterType,
          field: col.field,
          operator: filterPreset.operator,
          value: filterPreset.value,
          icon: getIconForColumn(col),
          options: col.options,
          placeholder: `Enter ${(filterPreset.label || col.display)?.toLowerCase() || 'value'}...`,
          // Store the column for consistent field naming
          column: col
        };
      });
    
    console.log('FilterDropdownMenu: Generated filter presets:', presets);
    return presets;
  }, [config]);

  // Generate group by options from config
  const groupByOptions: GroupByOption[] = React.useMemo(() => {
    if (!config?.columns) return [];
    
    return config.columns
      .filter(col => col.visible && col.field !== 'id')
      .slice(0, 3) // Limit to first 3 visible columns
      .map(col => ({
        id: `group-${col.field}`,
        label: col.display,
        field: col.field
      }));
  }, [config]);

  function getIconForColumn(col: ColumnDefinition): React.ReactNode {
    switch (col.type) {
      case 'string':
        if (col.field.includes('name')) return <Users className="w-4 h-4" />;
        return <Search className="w-4 h-4" />;
      case 'boolean':
        return <Shield className="w-4 h-4" />;
      case 'date':
      case 'datetime':
        return <Calendar className="w-4 h-4" />;
      default:
        return undefined;
    }
  }

  // Handle filter application
  const handleFilterClick = (filter: FilterPreset) => {
    if (filter.type === 'predefined') {
      // Apply preloaded filter directly with additive logic
      // Use the column display name for consistent field naming
      const fieldName = filter.column?.display || filter.field;
      
      const newRule = createComplexFilterRule(
        filter.field,
        filter.operator,
        filter.value,
        fieldName
      );
      
      // Check if this exact filter already exists to prevent duplicates
      const currentFilter = complexFilter;
      const existingRule = currentFilter?.rootGroup.rules.find(rule => 
        rule.field === newRule.field && 
        rule.operator === newRule.operator && 
        JSON.stringify(rule.value) === JSON.stringify(newRule.value)
      );
      
      if (existingRule) {
        // Filter already exists, don't add duplicate
        setIsOpen(false);
        return;
      }
      
      // Apply as additive filter (AND logic)
      if (!currentFilter) {
        // Create new filter
        const newComplexFilter: ComplexFilter = {
          rootGroup: {
            id: Date.now().toString(),
            logic: 'AND',
            rules: [newRule],
            groups: []
          }
        };
        onFilterApply(newComplexFilter);
      } else {
        // Add to existing filter
        const updatedFilter: ComplexFilter = {
          ...currentFilter,
          rootGroup: {
            ...currentFilter.rootGroup,
            rules: [...currentFilter.rootGroup.rules, newRule]
          }
        };
        onFilterApply(updatedFilter);
      }
      
      setIsOpen(false);
    } else {
      // For all other filter types, show the appropriate filter component
      const filterConfig: FilterPresetsConfig = {
        id: filter.id,
        label: filter.label,
        field: filter.field,
        column: filter.column, // Pass the full column config for unified field names
        type: filter.type,
        operator: filter.operator,
        options: filter.options,
        placeholder: filter.placeholder
      };
      setShowFilterPreset(filterConfig);
      setIsOpen(false);
    }
  };

  const handleGroupByClick = (option: GroupByOption) => {
    // Handle group by functionality
    console.log('Group by:', option);
    setIsOpen(false);
  };

  const handleCustomFilterDialog = () => {
    setShowCustomFilterDialog(true);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Main Search Input - this is the primary search interface */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex">
            {/* Filters Section */}
            <div className="flex-1 border-r border-gray-200">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="w-4 h-4" />
                  Popular Filters
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {filterPresets.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-6">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="w-6 h-6 text-gray-300" />
                      <span>No filter presets available</span>
                    </div>
                  </div>
                ) : (
                  filterPresets.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterClick(filter)}
                      className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-md transition-all duration-200 flex items-center gap-3 group"
                    >
                      <div className="flex-shrink-0 text-blue-600 group-hover:text-blue-700">
                        {filter.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 group-hover:text-blue-900">
                          {filter.label}
                        </span>
                        {filter.type !== 'predefined' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Click to configure
                          </div>
                        )}
                      </div>
                      {filter.type === 'predefined' && filter.value !== undefined && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0">
                          {typeof filter.value === 'boolean' 
                            ? (filter.value ? 'Yes' : 'No')
                            : String(filter.value)
                          }
                        </Badge>
                      )}
                    </button>
                  ))
                )}
                
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <button
                    onClick={handleCustomFilterDialog}
                    className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 rounded-md transition-all duration-200 flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                    <span>Add Custom Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Group By Section */}
            <div className="flex-1 border-r border-gray-200">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <BarChart3 className="w-4 h-4" />
                  Group By
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {groupByOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGroupByClick(option)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
                
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Group
                  </button>
                </div>
              </div>
            </div>

            {/* Favorites Section */}
            <div className="flex-1">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Star className="w-4 h-4" />
                  Saved Searches
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {savedSearches.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-6">
                    <div className="flex flex-col items-center gap-2">
                      <Star className="w-6 h-6 text-gray-300" />
                      <span>No saved searches yet</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {savedSearches.map((search) => (
                      <button
                        key={search.id}
                        onClick={() => {
                          onSavedSearchLoad(search.id);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                      >
                        <Star className={`w-4 h-4 ${search.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                        <span className="flex-1 truncate">{search.name}</span>
                      </button>
                    ))}
                    
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        Save current search
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Filter Dialog */}
      <FilterDialog
        key={showCustomFilterDialog ? 'open' : 'closed'} // Force reset when dialog opens
        open={showCustomFilterDialog}
        onOpenChange={setShowCustomFilterDialog}
        moduleName={moduleName}
        fieldDiscovery={null}
        initialFilter={complexFilter}
        config={config}
        onApply={(newFilter) => {
          // Apply the new filter - dialog handles proper merging/updating
          onFilterApply(newFilter);
        }}
      />

      {/* Popular Filter Component Dialog */}
      {showFilterPreset && (
        <Popover open={!!showFilterPreset} onOpenChange={() => setShowFilterPreset(null)}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <FilterPresets
              filter={showFilterPreset}
              onApply={(newFilter) => {
                // Apply as additive filter instead of replacing
                if (!complexFilter) {
                  onFilterApply(newFilter);
                } else {
                  // Check for duplicate rules
                  const newRule = newFilter.rootGroup.rules[0];
                  const existingRule = complexFilter.rootGroup.rules.find(rule => 
                    rule.field === newRule.field && 
                    rule.operator === newRule.operator && 
                    JSON.stringify(rule.value) === JSON.stringify(newRule.value)
                  );
                  
                  if (!existingRule) {
                    // Add to existing filter
                    const updatedFilter: ComplexFilter = {
                      ...complexFilter,
                      rootGroup: {
                        ...complexFilter.rootGroup,
                        rules: [...complexFilter.rootGroup.rules, ...newFilter.rootGroup.rules]
                      }
                    };
                    onFilterApply(updatedFilter);
                  }
                }
                setShowFilterPreset(null);
              }}
              onClose={() => setShowFilterPreset(null)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}; 