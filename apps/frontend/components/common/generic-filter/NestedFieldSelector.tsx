'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModuleConfig } from '@/shared/modules/types';

interface FieldNode {
  name: string;
  label: string;
  type: string;
  path: string[];
  hasChildren: boolean;
  children?: FieldNode[];
  operators?: string[];
  renderType?: string;
  options?: Array<{ value: any; label: string }>;
}

interface Breadcrumb {
  label: string;
  path: string[];
}

interface NestedFieldSelectorProps {
  moduleName: string;
  selectedPath?: string[];
  config?: ModuleConfig;
  onFieldSelect: (field: FieldNode) => void;
  onClose?: () => void;
}

export const NestedFieldSelector: React.FC<NestedFieldSelectorProps> = ({
  moduleName,
  selectedPath = [],
  config,
  onFieldSelect,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFields, setCurrentFields] = useState<FieldNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ label: 'Fields', path: [] }]);
  
  // Cache to prevent refetching the same data
  const [fieldCache, setFieldCache] = useState<Map<string, FieldNode[]>>(new Map());

  useEffect(() => {
    // Clear cache and fetch fresh fields when module changes
    setFieldCache(new Map());
    fetchFields([]);
  }, [moduleName]);

  const getCacheKey = (path: string[]) => path.join('.');

  // Enhance fields with display names from config
  const enhanceFieldsWithDisplayNames = (fields: FieldNode[]): FieldNode[] => {
    if (!config) return fields;
    
    return fields.map(field => {
      // For root level fields, try to find display name in config
      if (field.path.length === 1) {
        const configColumn = config.columns.find(col => col.field === field.name);
        if (configColumn) {
          return {
            ...field,
            label: configColumn.display || field.label || field.name
          };
        }
      }
      return field;
    });
  };

  const fetchFields = useCallback(async (parentPath: string[]) => {
    const cacheKey = getCacheKey(parentPath);
    
    // Check cache first
    if (fieldCache.has(cacheKey)) {
      const cachedFields = fieldCache.get(cacheKey)!;
      setCurrentFields(cachedFields);
      setNavigationPath(parentPath);
      updateBreadcrumbs(parentPath);
      setNavigating(false);
      return;
    }

    try {
      // Only show main loading for initial load, use navigating for subsequent loads
      if (parentPath.length === 0) {
        setLoading(true);
      } else {
        setNavigating(true);
      }
      
      let url = `/api/filters/${moduleName}/field-tree`;
      if (parentPath.length > 0) {
        url += `?parent=${parentPath.join('.')}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const rawFields = data.fields || [];
        
        // Enhance fields with display names from config
        const fields = enhanceFieldsWithDisplayNames(rawFields);
        
        // Cache the results
        setFieldCache(prev => new Map(prev).set(cacheKey, fields));
        
        setCurrentFields(fields);
        setNavigationPath(parentPath);
        updateBreadcrumbs(parentPath);
      } else {
        console.error('Failed to fetch fields');
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
      setNavigating(false);
    }
  }, [moduleName, fieldCache, config]);

  const updateBreadcrumbs = (parentPath: string[]) => {
    if (parentPath.length === 0) {
      setBreadcrumbs([{ label: 'Fields', path: [] }]);
    } else {
      // Build breadcrumbs from path
      const newBreadcrumbs: Breadcrumb[] = [{ label: 'Fields', path: [] }];
      for (let i = 0; i < parentPath.length; i++) {
        const pathSegment = parentPath.slice(0, i + 1);
        const label = getFieldLabelFromPath(pathSegment);
        newBreadcrumbs.push({ label, path: pathSegment });
      }
      setBreadcrumbs(newBreadcrumbs);
    }
  };

  const getFieldLabelFromPath = (path: string[]) => {
    const fieldName = path[path.length - 1];
    // Convert field names to readable labels
    switch (fieldName) {
      case 'permissions': return 'User Permissions';
      case 'user': return 'User';
      case 'impersonationSessions': return 'Impersonation Sessions';
      case 'accessLogs': return 'Access Logs';
      case 'userRoles': return 'User Roles';
      case 'role': return 'Role';
      case 'tenant': return 'Tenant';
      default: return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }
  };

  const navigateToField = (field: FieldNode) => {
    if (field.hasChildren) {
      fetchFields(field.path);
    } else {
      onFieldSelect(field);
      onClose?.();
    }
  };

  const navigateToBreadcrumb = (path: string[]) => {
    fetchFields(path);
  };

  const goBack = () => {
    if (navigationPath.length > 0) {
      const parentPath = navigationPath.slice(0, -1);
      fetchFields(parentPath);
    }
  };

  const filterFields = (fields: FieldNode[], search: string): FieldNode[] => {
    if (!search) return fields;
    
    return fields.filter(field => 
      field.label.toLowerCase().includes(search.toLowerCase()) ||
      field.name.toLowerCase().includes(search.toLowerCase())
    );
  };

  const filteredFields = filterFields(currentFields, searchTerm);

  if (loading) {
    return (
      <div className="w-80 border rounded-lg bg-popover shadow-lg">
        <div className="p-4 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading fields...
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border rounded-lg bg-popover shadow-lg">
      {/* Header with breadcrumbs */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          {navigationPath.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              disabled={navigating}
              className="h-6 w-6 p-0"
            >
              {navigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 overflow-hidden">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                <button
                  onClick={() => navigateToBreadcrumb(crumb.path)}
                  disabled={navigating}
                  className={`hover:text-primary truncate disabled:opacity-50 ${
                    index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
            disabled={navigating}
          />
        </div>
      </div>
      
      {/* Field List - More compact */}
      <div className="h-64 overflow-hidden relative">
        {/* Navigation overlay */}
        {navigating && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        )}
        
        <div className={`h-full overflow-y-auto transition-opacity duration-200 ${navigating ? 'opacity-30' : 'opacity-100'}`}>
          <div className="p-1">
            {filteredFields.length > 0 ? (
              filteredFields.map(field => (
                <div
                  key={field.path.join('.')}
                  className={`flex items-center gap-2 py-1.5 px-2 hover:bg-accent cursor-pointer rounded transition-colors ${
                    navigating ? 'pointer-events-none' : ''
                  }`}
                  onClick={() => navigateToField(field)}
                >
                  <span className="text-sm font-medium flex-1">{field.label || field.name}</span>
                  
                  {!field.hasChildren && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {field.type}
                    </span>
                  )}
                  
                  {field.hasChildren && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {searchTerm ? `No fields found matching "${searchTerm}"` : 'No fields found'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {onClose && (
        <div className="p-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full h-8 text-sm" disabled={navigating}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}; 