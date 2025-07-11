'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Users,
  Loader2
} from 'lucide-react';
import { ComplexFilter, ComplexFilterRule, SavedSearch } from '@/shared/types/types';
import { ModuleConfig, ColumnDefinition } from '@/shared/modules/types';
import { FilterDialog } from './FilterDialog';
import { FilterPresets, FilterPresetsConfig } from './FilterPresets';
import { createComplexFilterRule } from '@/shared/utils/filterUtils';
import { useKeyboardShortcut } from '@/shared/utils/keyboard-shortcuts';
import { debounce } from '@/shared/utils/utils';

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
  filterCount?: number;
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
  config,
  filterCount = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomFilterDialog, setShowCustomFilterDialog] = useState(false);
  const [showFilterPreset, setShowFilterPreset] = useState<FilterPresetsConfig | null>(null);
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local search value with prop when it changes externally
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onSearchChange(value);
    }, 300),
    [onSearchChange]
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value);
    debouncedSearch(value);
  };

  // Generate popular filters from config
  const filterPresets: FilterPreset[] = React.useMemo(() => {
    if (!config?.columns) {
      // console.log('FilterDropdownMenu: No config or columns found');
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
    
    // console.log('FilterDropdownMenu: Generated filter presets:', presets);
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
    // console.log('Group by:', option);
    setIsOpen(false);
  };

  const handleCustomFilterDialog = () => {
    setShowCustomFilterDialog(true);
    setIsOpen(false);
  };

  // Keyboard shortcuts for search functionality
  useKeyboardShortcut(
    { key: '/', preventDefault: true },
    () => {
      inputRef.current?.focus();
      setIsOpen(true);
    },
    { description: 'Focus search input', enabled: !isOpen }
  );

  // Escape to close dropdown
  useKeyboardShortcut(
    { key: 'Escape', preventDefault: true },
    () => setIsOpen(false),
    { description: 'Close filter dropdown', enabled: isOpen }
  );

  // Ctrl+F to focus search
  useKeyboardShortcut(
    { key: 'f', ctrlKey: true, preventDefault: true },
    () => {
      inputRef.current?.focus();
      setIsOpen(true);
    },
    { description: 'Focus search input' }
  );

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
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
          localSearchValue ? 'text-foreground/60' : 'text-muted-foreground'
        }`} />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={localSearchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={`pl-10 pr-16 h-9 sm:h-10 transition-all duration-200 ${
            localSearchValue 
              ? 'border-border focus:border-ring/50' 
              : 'focus:border-ring/30'
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {filterCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {filterCount}
            </Badge>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 hover:bg-accent rounded transition-colors"
          >
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden w-full sm:min-w-[700px]">
          <div className="flex flex-col sm:flex-row">
            {/* Filters Section */}
            <div className="flex-1 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[250px]">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Filter className="w-4 h-4" />
                  Popular Filters
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {filterPresets.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="w-6 h-6 text-muted-foreground/50" />
                      <span>No filter presets available</span>
                    </div>
                  </div>
                ) : (
                  filterPresets.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterClick(filter)}
                      className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground border border-transparent rounded-lg transition-all duration-200 flex items-center gap-3 group"
                    >
                      <div className="flex-shrink-0 text-primary group-hover:text-primary/80">
                        {filter.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground group-hover:text-accent-foreground text-sm">
                          {filter.label}
                        </span>
                        {filter.type !== 'predefined' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Click to configure
                          </div>
                        )}
                      </div>
                      {filter.type === 'predefined' && filter.value !== undefined && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0 hidden sm:inline-flex">
                          {typeof filter.value === 'boolean' 
                            ? (filter.value ? 'Yes' : 'No')
                            : String(filter.value)
                          }
                        </Badge>
                      )}
                    </button>
                  ))
                )}
                
                <div className="border-t border-border pt-3 mt-3">
                  <button
                    onClick={handleCustomFilterDialog}
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent border border-dashed border-border hover:border-border rounded-lg transition-all duration-200 flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Add Custom Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Group By Section */}
            <div className="flex-1 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[200px]">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BarChart3 className="w-4 h-4" />
                  Group By
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {groupByOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGroupByClick(option)}
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors font-medium"
                  >
                    {option.label}
                  </button>
                ))}
                
                <div className="border-t border-border pt-3 mt-3">
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Add Custom Group</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Searches Section */}
            <div className="flex-1 sm:min-w-[200px]">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Star className="w-4 h-4" />
                  Saved Searches
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {savedSearches.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Star className="w-6 h-6 text-muted-foreground/50" />
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
                        className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-3"
                      >
                        <Star className={`w-4 h-4 ${search.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        <span className="flex-1 truncate font-medium">{search.name}</span>
                      </button>
                    ))}
                    
                    <div className="border-t border-border pt-3 mt-3">
                      <button className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors font-medium">
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