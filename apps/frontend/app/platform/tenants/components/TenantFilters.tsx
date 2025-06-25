import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { TenantFiltersProps } from '../types';

const TenantFilters: React.FC<TenantFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ status: status as 'all' | 'active' | 'inactive' });
  };

  const handleAccessLevelChange = (accessLevel: string) => {
    onFiltersChange({ accessLevel: accessLevel as 'all' | 'read' | 'write' | 'admin' });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ dateFrom: e.target.value || undefined });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ dateTo: e.target.value || undefined });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search && filters.search.trim()) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.accessLevel && filters.accessLevel !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants by name or subdomain..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Access Level Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Access Level</label>
          <Select value={filters.accessLevel || 'all'} onValueChange={handleAccessLevelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Access Levels</SelectItem>
              <SelectItem value="read">Read Only</SelectItem>
              <SelectItem value="write">Read & Write</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Created Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                placeholder="From date"
                value={filters.dateFrom || ''}
                onChange={handleDateFromChange}
                className="text-sm"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To date"
                value={filters.dateTo || ''}
                onChange={handleDateToChange}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Active Filters:</div>
            <div className="flex flex-wrap gap-1">
              {filters.search && filters.search.trim() && (
                <Badge variant="outline" className="text-xs">
                  Search: "{filters.search}"
                </Badge>
              )}
              {filters.status && filters.status !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  Status: {filters.status}
                </Badge>
              )}
              {filters.accessLevel && filters.accessLevel !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  Access: {filters.accessLevel}
                </Badge>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="outline" className="text-xs">
                  Date Range
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantFilters; 