'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Star, 
  ChevronRight, 
  Plus,
  BarChart3,
  Loader2
} from 'lucide-react';
import { 
  ComplexFilter, 
  SavedSearch
} from '@/lib/types';
import { 
  PopularFilterConfig, 
  formatDisplayValue, 
  convertPresetToDate 
} from '@/lib/filter-registry';
import { FilterDialog } from './FilterDialog';
import { DatePickerInput, DropdownInput } from './UserInputComponents';

interface FilterDropdownMenuProps {
  moduleName: string;
  savedSearches: SavedSearch[];
  complexFilter: ComplexFilter | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterApply: (filter: ComplexFilter | null) => void;
  onSavedSearchLoad: (searchId: string) => void;
  placeholder?: string;
}

interface AutoDiscoveredFields {
  sourceTable: string;
  fields: any[];
  relationships: any[];
  popularFilters: PopularFilterConfig[];
}

export const FilterDropdownMenu: React.FC<FilterDropdownMenuProps> = ({
  moduleName,
  savedSearches,
  complexFilter,
  searchValue,
  onSearchChange,
  onFilterApply,
  onSavedSearchLoad,
  placeholder = "Search..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'groupby' | 'favorites'>('filters');
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const [showCustomFilterDialog, setShowCustomFilterDialog] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [autoDiscovery, setAutoDiscovery] = useState<AutoDiscoveredFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInputStates, setUserInputStates] = useState<Record<string, any>>({});
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-discover fields on mount
  useEffect(() => {
    const loadAutoDiscovery = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/filters/${moduleName}/auto-discovery`);
        if (response.ok) {
          const discovery = await response.json();
          setAutoDiscovery(discovery);
        } else {
          console.error('Failed to load auto-discovery:', await response.text());
        }
      } catch (error) {
        console.error('Failed to load auto-discovery:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAutoDiscovery();
  }, [moduleName]);

  // Handle preloaded filter click
  const handlePreloadedFilter = (filter: PopularFilterConfig) => {
    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: Date.now().toString(),
        logic: 'AND',
        rules: [{
          id: Date.now().toString(),
          field: filter.field,
          operator: filter.operator,
          value: filter.preloadedValue,
          fieldPath: [filter.field],
          label: filter.label
        }],
        groups: []
      }
    };
    
    onFilterApply(complexFilter);
    setIsOpen(false);
  };
  
  // Handle user input filter value change
  const handleUserInputChange = (filterId: string, value: any) => {
    setUserInputStates(prev => ({
      ...prev,
      [filterId]: value
    }));
  };
  
  // Apply user input filter
  const applyUserInputFilter = (filter: PopularFilterConfig) => {
    const value = userInputStates[filter.id];
    if (!value) return;
    
    // Convert preset values to actual dates if needed
    let actualValue = value;
    if (filter.inputConfig?.renderType === 'datepicker' && typeof value === 'string') {
      const convertedDate = convertPresetToDate(value);
      if (convertedDate) {
        actualValue = convertedDate;
      }
    }
    
    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: Date.now().toString(),
        logic: 'AND',
        rules: [{
          id: Date.now().toString(),
          field: filter.field,
          operator: filter.operator,
          value: actualValue,
          fieldPath: [filter.field],
          label: `${filter.label}: ${formatDisplayValue(value, filter.inputConfig?.renderType)}`
        }],
        groups: []
      }
    };
    
    onFilterApply(complexFilter);
    setIsOpen(false);
  };

  const handleCustomFilterDialog = () => {
    setShowCustomFilterDialog(true);
    setIsOpen(false);
  };

  const toggleExpanded = (pathKey: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(pathKey)) {
      newExpanded.delete(pathKey);
    } else {
      newExpanded.add(pathKey);
    }
    setExpandedPaths(newExpanded);
  };

  const applyFieldFilter = (field: any) => {
    const complexFilter: ComplexFilter = {
      rootGroup: {
        id: Date.now().toString(),
        logic: 'AND',
        rules: [{
          id: Date.now().toString(),
          field: field.name,
          operator: 'contains',
          value: '',
          fieldPath: [field.name],
          label: field.label
        }],
        groups: []
      }
    };
    
    onFilterApply(complexFilter);
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

  const renderPopularFilters = () => {
    if (!autoDiscovery?.popularFilters || autoDiscovery.popularFilters.length === 0) {
      return null;
    }
    
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground px-2">Popular Filters</div>
        
        {autoDiscovery.popularFilters.map(filter => (
          <div key={filter.id}>
            {filter.type === 'preloaded' ? (
              // PRELOADED FILTER - One click
              <button
                onClick={() => handlePreloadedFilter(filter)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors"
              >
                {filter.icon}
                <span>{filter.label}</span>
              </button>
            ) : (
              // USER INPUT FILTER - Interactive
              <div className="px-2 py-1">
                <div className="flex items-center gap-2 mb-2">
                  {filter.icon}
                  <span className="text-sm font-medium">{filter.label}</span>
                </div>
                
                {filter.inputConfig?.renderType === 'datepicker' && (
                  <DatePickerInput
                    value={userInputStates[filter.id]}
                    onChange={(value) => handleUserInputChange(filter.id, value)}
                    onApply={() => applyUserInputFilter(filter)}
                    presets={filter.inputConfig.datePresets}
                    placeholder={filter.inputConfig.placeholder}
                  />
                )}
                
                {filter.inputConfig?.renderType === 'dropdown' && (
                  <DropdownInput
                    value={userInputStates[filter.id]}
                    onChange={(value) => handleUserInputChange(filter.id, value)}
                    onApply={() => applyUserInputFilter(filter)}
                    dataSource={filter.inputConfig.dataSource}
                    placeholder={filter.inputConfig.placeholder}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAvailableFields = () => {
    if (!autoDiscovery?.fields) return null;
    
    const filteredFields = autoDiscovery.fields.filter(field => 
      !fieldSearchTerm || 
      field.label.toLowerCase().includes(fieldSearchTerm.toLowerCase()) ||
      field.name.toLowerCase().includes(fieldSearchTerm.toLowerCase())
    );
    
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Fields</div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredFields.map((field: any) => (
            <button
              key={field.name}
              onClick={() => applyFieldFilter(field)}
              className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-muted rounded"
            >
              <span className="flex-1 text-left truncate">{field.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderRelationshipFields = () => {
    if (!autoDiscovery?.relationships) return null;
    
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Related Fields</div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {autoDiscovery.relationships.map((rel: any) => {
            const pathKey = rel.name;
            const isExpanded = expandedPaths.has(pathKey);
            
            return (
              <div key={rel.name}>
                <button
                  onClick={() => toggleExpanded(pathKey)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-muted rounded"
                >
                  <ChevronRight 
                    className={`w-3 h-3 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} 
                  />
                  <span className="flex-1 text-left truncate">{rel.label}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
                
                {isExpanded && rel.children && (
                  <div className="ml-4 space-y-1">
                    {rel.children.map((child: any) => (
                      <button
                        key={child.name}
                        onClick={() => applyFieldFilter(child)}
                        className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-muted rounded"
                        style={{ paddingLeft: '12px' }}
                      >
                        <span className="flex-1 text-left truncate">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFiltersTab = () => {
    return (
      <div className="space-y-4">
        {/* Popular Filters */}
        {renderPopularFilters()}

        {/* Separator */}
        {autoDiscovery?.popularFilters && autoDiscovery.popularFilters.length > 0 && (
          <div className="border-t" />
        )}

        {/* Field Search */}
        <div className="px-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={fieldSearchTerm}
              onChange={(e) => setFieldSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>

        {/* Available Fields */}
        {renderAvailableFields()}

        {/* Relationship Fields */}
        {renderRelationshipFields()}

        {/* Separator */}
        <div className="border-t" />

        {/* Add Custom Filter */}
        <div className="px-2">
          <button
            onClick={handleCustomFilterDialog}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Filter</span>
          </button>
        </div>
      </div>
    );
  };

  const renderGroupByTab = () => {
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground text-sm py-8">
          Group By functionality coming soon...
        </div>
      </div>
    );
  };

  const renderFavoritesTab = () => {
    return (
      <div className="space-y-4">
        {savedSearches.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No saved searches yet
          </div>
        ) : (
          <div className="space-y-1">
            {savedSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => {
                  onSavedSearchLoad(search.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
              >
                <Star className={`w-4 h-4 ${search.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                <span className="flex-1 text-left truncate">{search.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-8 h-9"
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 min-w-80">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'filters'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => setActiveTab('groupby')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'groupby'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Group By
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'favorites'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                {activeTab === 'filters' && renderFiltersTab()}
                {activeTab === 'groupby' && renderGroupByTab()}
                {activeTab === 'favorites' && renderFavoritesTab()}
              </>
            )}
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