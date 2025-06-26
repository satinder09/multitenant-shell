'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Search, Filter, X, Save, Star, Settings } from 'lucide-react';
import { FilterDialog, FilterDropdownMenu } from '@/components/generic-filter';
import { 
  TenantFilters, 
  UseFetchTenantsReturn,
  TenantModel 
} from '../types';
import { 
  ComplexFilter, 
  SavedSearch, 
  StatusFilter, 
  AccessLevelFilter 
} from '@/lib/types';
import { debounce } from '@/lib/utils';

interface AdvancedTenantFiltersProps {
  tenantHook: UseFetchTenantsReturn;
}

export const AdvancedTenantFilters: React.FC<AdvancedTenantFiltersProps> = ({
  tenantHook
}) => {
  const {
    queryParams,
    fieldDiscovery,
    savedSearches,
    complexFilter,
    setComplexFilter,
    setSearch,
    clearFilters,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    toggleFavorite
  } = tenantHook;

  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Debounced search handler
  const debouncedSearch = React.useMemo(
    () => debounce((value: string) => setSearch(value), 300),
    [setSearch]
  );

  const handleSearchChange = (value: string) => {
    debouncedSearch(value);
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    
    setIsSaving(true);
    try {
      await saveCurrentSearch(saveSearchName.trim());
      setSaveSearchName('');
      setShowSavedSearches(true);
    } catch (error) {
      console.error('Failed to save search:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSearch = async (searchId: string) => {
    try {
      await loadSavedSearch(searchId);
      setShowSavedSearches(false);
    } catch (error) {
      console.error('Failed to load search:', error);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId);
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  const handleToggleFavorite = async (searchId: string) => {
    try {
      await toggleFavorite(searchId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const hasActiveFilters = complexFilter && 
    complexFilter.rootGroup.rules.length > 0 || 
    queryParams.filters?.search;

  // Check if we're in fallback mode (no field discovery)
  const isAdvancedMode = fieldDiscovery !== null;

  return (
    <div className="space-y-3">
      {/* Enhanced Search with Dropdown Menu */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <FilterDropdownMenu
            moduleName="tenants"
            savedSearches={savedSearches}
            complexFilter={complexFilter || null}
            searchValue={queryParams.filters?.search || ''}
            onSearchChange={handleSearchChange}
            onFilterApply={(filter) => setComplexFilter(filter)}
            onSavedSearchLoad={handleLoadSearch}
            placeholder="Search tenants..."
          />
        </div>
        
        {isAdvancedMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterDialog(true)}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Advanced
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {complexFilter?.rootGroup.rules.length || 0}
              </Badge>
            )}
          </Button>
        )}

        {isAdvancedMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            className="flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            Saved
            {savedSearches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {savedSearches.length}
              </Badge>
            )}
          </Button>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {complexFilter && complexFilter.rootGroup.rules.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {complexFilter.rootGroup.rules.map((rule) => (
            <Badge key={rule.id} variant="secondary" className="flex items-center gap-1 text-xs py-1 px-2">
              <span>
                {rule.label || rule.field}: {String(rule.value)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Remove this specific rule
                  const updatedFilter = {
                    ...complexFilter,
                    rootGroup: {
                      ...complexFilter.rootGroup,
                      rules: complexFilter.rootGroup.rules.filter(r => r.id !== rule.id)
                    }
                  };
                  setComplexFilter(updatedFilter.rootGroup.rules.length > 0 ? updatedFilter : null);
                }}
                className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-2 h-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Dialog */}
      {isAdvancedMode && (
        <FilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          moduleName="tenants"
          fieldDiscovery={fieldDiscovery}
          initialFilter={complexFilter}
          onApply={setComplexFilter}
        />
      )}

      {/* Saved Searches Panel */}
      {showSavedSearches && isAdvancedMode && (
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Saved Searches</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavedSearches(false)}
                className="h-7 w-7 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {savedSearches.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                <Save className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved searches yet</p>
                <p className="text-xs">Create advanced filters and save them for quick access</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(search.id)}
                        className="h-5 w-5 p-0"
                      >
                        <Star 
                          className={`w-3 h-3 ${
                            search.isFavorite 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                      
                      <div className="flex-1">
                        <div className="text-sm font-medium">{search.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {search.filters?.length || 0} filter{(search.filters?.length || 0) !== 1 ? 's' : ''} • 
                          {new Date(search.createdAt).toLocaleDateString()}
                          {search.isPublic && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadSearch(search.id)}
                        className="h-6 text-xs"
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                        className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 