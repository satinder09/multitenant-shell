'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Star, 
  ChevronDown,
  ChevronRight, 
  Plus,
  BarChart3,
  Loader2,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { 
  ComplexFilter, 
  SavedSearch
} from '@/lib/types';
import { ModuleConfig, ColumnDefinition } from '@/lib/modules/types';
import { FilterDialog } from './FilterDialog';

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

interface PopularFilter {
  id: string;
  label: string;
  type: 'preloaded' | 'user_input';
  field: string;
  operator: string;
  value?: any;
  icon?: React.ReactNode;
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate popular filters from config
  const popularFilters: PopularFilter[] = React.useMemo(() => {
    if (!config) {
      return []; // Return empty if no config
    }

    const filters: PopularFilter[] = [];

    // Get columns that have popular filters defined
    config.columns
      .filter(col => col.popular && col.popularFilter)
      .forEach(col => {
        const popularFilter = col.popularFilter!;
        
        filters.push({
          id: `${col.field}-popular`,
          label: popularFilter.label || col.display,
          type: popularFilter.value !== undefined ? 'preloaded' : 'user_input',
          field: popularFilter.field,
          operator: popularFilter.operator,
          value: popularFilter.value,
          icon: getIconForColumn(col)
        });
      });

    // Add common filters based on column types
    config.columns
      .filter(col => col.filterable && col.visible)
      .forEach(col => {
        // Add date range filters for date columns
        if (col.type === 'date' || col.type === 'datetime') {
          filters.push({
            id: `${col.field}-range`,
            label: `${col.display} Range`,
            type: 'user_input',
            field: col.field,
            operator: 'between',
            icon: <Calendar className="w-4 h-4" />
          });
        }

        // Add boolean filters
        if (col.type === 'boolean' && col.options) {
          col.options.forEach(option => {
            filters.push({
              id: `${col.field}-${option.value}`,
              label: `${col.display}: ${option.label}`,
              type: 'preloaded',
              field: col.field,
              operator: 'equals',
              value: option.value
            });
          });
        }
      });

    return filters.slice(0, 8); // Limit to 8 popular filters
  }, [config]);

  // Generate group by options from config
  const groupByOptions: GroupByOption[] = React.useMemo(() => {
    if (!config) {
      return [];
    }

    return config.columns
      .filter(col => col.visible && (col.type === 'string' || col.type === 'enum'))
      .slice(0, 5) // Limit to 5 group by options
      .map(col => ({
        id: col.field,
        label: col.display,
        field: col.field
      }));
  }, [config]);

  // Helper function to get appropriate icon for column type
  function getIconForColumn(col: ColumnDefinition): React.ReactNode {
    switch (col.type) {
      case 'date':
      case 'datetime':
        return <Calendar className="w-4 h-4" />;
      case 'boolean':
        return <RotateCcw className="w-4 h-4" />;
      default:
        return undefined;
    }
  }

  // Handle filter application
  const handleFilterClick = (filter: PopularFilter) => {
    if (filter.type === 'preloaded') {
      const complexFilter: ComplexFilter = {
        rootGroup: {
          id: Date.now().toString(),
          logic: 'AND',
          rules: [{
            id: Date.now().toString(),
            field: filter.field,
            operator: filter.operator as any,
            value: filter.value,
            fieldPath: [filter.field],
            label: filter.label
          }],
          groups: []
        }
      };
      
      onFilterApply(complexFilter);
      setIsOpen(false);
    } else {
      // For user input filters, open custom filter dialog
      setShowCustomFilterDialog(true);
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
      {/* Search Input */}
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
                  Filters
                </div>
              </div>
              <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
                {popularFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterClick(filter)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                  >
                    {filter.icon}
                    {filter.label}
                    {filter.type === 'user_input' && (
                      <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
                    )}
                  </button>
                ))}
                
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <button
                    onClick={handleCustomFilterDialog}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Filter
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
              <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
                {groupByOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGroupByClick(option)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    {option.label}
                    <ChevronDown className="w-3 h-3 ml-auto text-gray-400 inline-block" />
                  </button>
                ))}
                
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Group
                    <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Favorites Section */}
            <div className="flex-1">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Star className="w-4 h-4" />
                  Favorites
                </div>
              </div>
              <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
                {savedSearches.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Star className="w-8 h-8 text-gray-300" />
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
                        <ChevronDown className="w-3 h-3 ml-auto text-gray-400 inline-block" />
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
        open={showCustomFilterDialog}
        onOpenChange={setShowCustomFilterDialog}
        moduleName={moduleName}
        fieldDiscovery={null}
        initialFilter={null}
        onApply={onFilterApply}
      />
    </div>
  );
}; 