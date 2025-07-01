import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';
import { DataTable } from '@/components/composite/DataTable';
import { FilterDropdownMenu } from '@/components/common/generic-filter/FilterDropdownMenu';
import { FilterTags } from '@/components/common/generic-filter/FilterTags';
import { FilterDialog } from '@/components/common/generic-filter/FilterDialog';
import { useGenericFilter } from '@/shared/hooks/useGenericFilter';
import { getModuleConfig } from '@/shared/modules/module-registry';
import { ModuleConfig } from '@/shared/modules/types';
import { ComplexFilter } from '@/shared/types/types';
import { SectionHeader } from '@/components/composite/SectionHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Save, X, AlertCircle, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Checkbox } from '@/components/ui/checkbox';

interface ConfigDrivenModulePageProps {
  moduleName: string;
  config?: ModuleConfig; // Optional - will be loaded from registry if not provided
}

// Convert table name to module name for API compatibility
function getModuleNameFromTable(tableName: string): string {
  const TABLE_TO_MODULE_MAPPING: Record<string, string> = {
    'Tenant': 'tenants',
    'User': 'users',
    'TenantPermission': 'permissions',
    'Role': 'roles',
    'ImpersonationSession': 'impersonation',
    'AccessLog': 'access-logs'
  };
  return TABLE_TO_MODULE_MAPPING[tableName] || tableName.toLowerCase();
}

export const ConfigDrivenModulePage: React.FC<ConfigDrivenModulePageProps> = ({ 
  moduleName: propModuleName,
  config: propConfig 
}) => {
  const [config, setConfig] = useState<ModuleConfig | null>(propConfig || null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(!propConfig);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [originalComplexFilter, setOriginalComplexFilter] = useState<ComplexFilter | null>(null);
  const isMobile = useIsMobile();

  // Use provided config or loaded config
  const activeConfig = propConfig || config;
  
  // Always derive these values (even if config is null) to avoid conditional hook calls
  const { sourceTable, columns, actions, display, module } = activeConfig || {
    sourceTable: '',
    columns: [],
    actions: undefined,
    display: undefined,
    module: { name: propModuleName || '', title: '' }
  };
  
  // Convert table name to module name for API compatibility
  const moduleName = propModuleName || getModuleNameFromTable(sourceTable);

  // ALWAYS call useGenericFilter - never conditionally
  // Pass a stable configuration to avoid hook order issues
  const stableConfig = activeConfig || {
    module: { name: moduleName, title: moduleName },
    sourceTable: moduleName,
    columns: []
  };
  
  const {
    data,
    isLoading,
    error,
    pagination,
    fieldDiscovery,
    queryParams,
    complexFilter,
    savedSearches,
    setComplexFilter,
    setSearch,
    setPage,
    setLimit,
    setSort,
    refetch,
    clearFilters
  } = useGenericFilter(moduleName, stableConfig, { 
    defaultLimit: display?.pageSize || 10,
    defaultSort: display?.defaultSort || { field: 'createdAt', direction: 'desc' },
    enableSavedSearches: true 
  });

  // Load config from registry if not provided
  useEffect(() => {
    if (!propConfig && propModuleName) {
      const loadConfig = async () => {
        setIsLoadingConfig(true);
        try {
          const registryConfig = await getModuleConfig(propModuleName);
          setConfig(registryConfig);
        } catch (error) {
          console.error('Failed to load config from registry:', error);
        } finally {
          setIsLoadingConfig(false);
        }
      };
      loadConfig();
    }
  }, [propModuleName, propConfig]);

  // Custom event listener for external refresh triggers
  useEffect(() => {
    const handleExternalRefresh = (event: CustomEvent) => {
      if (event.detail.moduleName === moduleName) {
        refetch();
      }
    };

    window.addEventListener('refresh-module-data', handleExternalRefresh as EventListener);
    
    return () => {
      window.removeEventListener('refresh-module-data', handleExternalRefresh as EventListener);
    };
  }, [moduleName, refetch]);

  // Execute row actions with proper context
  const executeRowAction = async (actionKey: string, record: any) => {
    const action = actions?.rowActions?.find(a => a.key === actionKey);
    if (!action) return;

    // Check condition if exists
    if (action.condition && !action.condition(record)) return;

    // Show confirmation if required
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) return;
    }

    try {
      await action.onClick(record);
      // Actions should handle their own refresh logic
      // No automatic refresh here to avoid duplicates
    } catch (error) {
      console.error(`Failed to execute action ${actionKey}:`, error);
    }
  };

  // Execute bulk actions
  const executeBulkAction = async (actionKey: string, records: any[]) => {
    const action = actions?.bulkActions?.find(a => a.key === actionKey);
    if (!action) return;

    // Check condition if exists
    if (action.condition && !action.condition(records)) return;

    // Show confirmation if required
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) return;
    }

    try {
      await action.onClick(records);
      // Actions should handle their own refresh logic
      // No automatic refresh here to avoid duplicates
    } catch (error) {
      console.error(`Failed to execute bulk action ${actionKey}:`, error);
    }
  };

  // Execute header actions
  const executeHeaderAction = async (actionKey: string) => {
    const action = actions?.headerActions?.find(a => a.key === actionKey);
    if (!action) return;

    try {
      await action.onClick();
      // Actions should handle their own refresh logic
      // No automatic refresh here to avoid duplicates
    } catch (error) {
      console.error(`Failed to execute header action ${actionKey}:`, error);
    }
  };

  // Checkbox header component
  const CheckboxHeader = ({ table }: { table: any }) => {
    return (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: boolean) => {
          if (value) {
            const allRows = data || [];
            setSelectedRows(allRows);
            table.toggleAllPageRowsSelected(true);
          } else {
            setSelectedRows([]);
            table.toggleAllPageRowsSelected(false);
          }
        }}
      />
    );
  };

  // ALWAYS call useMemo - never conditionally
  // Generate table columns from config (TanStack Table format)
  const tableColumns = useMemo(() => {
    const dataColumns = [];

    // Add selection column if bulk actions are defined
    if (actions?.bulkActions && actions.bulkActions.length > 0) {
      dataColumns.push({
        id: 'select',
        accessorKey: 'select',
        header: CheckboxHeader,
        cell: ({ row }: { row: any }) => (
          <Checkbox
            checked={selectedRows.some(selected => selected.id === row.original.id)}
            onCheckedChange={(value: boolean) => {
              if (value) {
                setSelectedRows(prev => [...prev, row.original]);
                row.toggleSelected(true);
              } else {
                setSelectedRows(prev => prev.filter(selected => selected.id !== row.original.id));
                row.toggleSelected(false);
              }
            }}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        meta: {
          width: 50,
          searchable: false
        }
      });
    }

    // Add data columns - include ALL columns but set initial visibility
    const configColumns = columns
      .map(col => ({
        id: col.field,
        accessorKey: col.field,
        header: col.display,
        cell: ({ row }: { row: any }) => {
          const value = row.getValue(col.field);
          if (col.render) {
            return col.render(value, row.original);
          }
          return value?.toString() || '';
        },
        enableSorting: col.sortable !== false,
        enableHiding: true, // Allow all columns to be shown/hidden
        // Set initial visibility based on config
        meta: {
          width: col.width,
          searchable: col.searchable,
          // Determine if column should be visible by default
          defaultVisible: display?.defaultColumns?.includes(col.field) || 
                         (col.visible && !display?.defaultColumns)
        }
      }));

    dataColumns.push(...configColumns);

    // Add actions column if row actions are defined
    if (actions?.rowActions && actions.rowActions.length > 0) {
      const rowActionDisplay = actions.rowActionDisplay || { mode: 'buttons', showLabels: true };
      
      dataColumns.push({
        id: 'actions',
        accessorKey: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const availableActions = actions.rowActions
            ?.filter(action => !action.condition || action.condition(row.original))
            .sort((a, b) => (a.priority || 99) - (b.priority || 99));

          if (!availableActions || availableActions.length === 0) {
            return null;
          }

          // Determine which actions to show as buttons vs menu
          let buttonActions: typeof availableActions = [];
          let menuActions: typeof availableActions = [];

          if (rowActionDisplay.mode === 'buttons') {
            buttonActions = availableActions;
          } else if (rowActionDisplay.mode === 'menu') {
            menuActions = availableActions;
          } else if (rowActionDisplay.mode === 'mixed') {
            // Split based on displayMode property and maxButtons
            const explicitButtons = availableActions.filter(a => a.displayMode === 'button');
            const explicitMenu = availableActions.filter(a => a.displayMode === 'menu');
            const unspecified = availableActions.filter(a => !a.displayMode);
            
            buttonActions = explicitButtons;
            menuActions = explicitMenu;
            
            // Add unspecified actions to buttons up to maxButtons limit
            const maxButtons = rowActionDisplay.maxButtons || 3;
            const remainingSlots = Math.max(0, maxButtons - buttonActions.length);
            buttonActions.push(...unspecified.slice(0, remainingSlots));
            menuActions.push(...unspecified.slice(remainingSlots));
          }

          return (
            <div className="flex items-center gap-1">
              {/* Button Actions */}
              {buttonActions.map(action => (
                <Button
                  key={action.key}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => executeRowAction(action.key, row.original)}
                  className="h-8 px-2"
                  title={action.label}
                >
                  {action.icon && React.createElement(action.icon, { className: "w-4 h-4" })}
                  {rowActionDisplay.showLabels && action.label && (
                    <span className="ml-1 hidden sm:inline">{action.label}</span>
                  )}
                </Button>
              ))}

              {/* Menu Actions */}
              {menuActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {menuActions.map(action => (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={() => executeRowAction(action.key, row.original)}
                        className={action.variant === 'destructive' ? 'text-destructive' : ''}
                      >
                        {action.icon && React.createElement(action.icon, { className: "mr-2 h-4 w-4" })}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        meta: {
          width: 150,
          searchable: false
        }
      });
    }

    return dataColumns;
  }, [actions, columns, data, display, executeRowAction, selectedRows]);

  const hasActiveFilters = complexFilter && complexFilter.rootGroup.rules.length > 0;
  const isAdvancedMode = fieldDiscovery !== null;

  // Search handler
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  // NOW we can do conditional returns after all hooks are called
  if (isLoadingConfig) {
    return <div>Loading module configuration...</div>;
  }

  if (!activeConfig) {
    return <div>Module configuration not found for: {propModuleName}</div>;
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error loading {module.title.toLowerCase()}
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-4 min-w-0 sm:space-y-6">
      {/* Module Header */}
      <SectionHeader
        title={module.title}
        description={module.description}
        actions={
          actions?.headerActions && actions.headerActions.length > 0 ? (
            isMobile ? (
              // Mobile: Show primary action as button, rest in dropdown
              <div className="flex items-center gap-2 w-full justify-end">
                {/* Primary action (first one) as full button */}
                {actions.headerActions && actions.headerActions.length > 0 && (
                  <Button
                    key={actions.headerActions![0].key}
                    variant={actions.headerActions![0].variant || 'default'}
                    size="sm"
                    onClick={() => executeHeaderAction(actions.headerActions![0].key)}
                    className="px-4 py-2 h-9"
                  >
                    {actions.headerActions![0].icon && React.createElement(actions.headerActions![0].icon, { className: "mr-2 h-4 w-4" })}
                    {actions.headerActions![0].label}
                  </Button>
                )}
                
                {/* Secondary actions in dropdown */}
                {actions.headerActions && actions.headerActions.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-3 py-2 h-9">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-1">
                      {actions.headerActions.slice(1).map((action) => (
                        <DropdownMenuItem
                          key={action.key}
                          onClick={() => executeHeaderAction(action.key)}
                          className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer"
                        >
                          {action.icon && React.createElement(action.icon, { className: "h-4 w-4" })}
                          <span>{action.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              // Desktop: Show all actions as buttons
              <div className="flex items-center gap-2">
                {actions.headerActions && actions.headerActions.map((action) => (
                  <Button
                    key={action.key}
                    variant={action.variant || 'outline'} 
                    size="sm" 
                    onClick={() => executeHeaderAction(action.key)}
                    className="px-4 py-2 h-9"
                  >
                    {action.icon && React.createElement(action.icon, { className: "mr-2 h-4 w-4" })}
                    {action.label}
                  </Button>
                ))}
              </div>
            )
          ) : null
        }
      />

      {/* Advanced Filters */}
      <div className="space-y-2 sm:space-y-3">
        {/* Enhanced Search with Dropdown Menu */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FilterDropdownMenu
              moduleName={moduleName}
              savedSearches={savedSearches}
              complexFilter={complexFilter || null}
              searchValue={(queryParams.filters as any)?.search || ''}
              onSearchChange={handleSearchChange}
              onFilterApply={(filter) => setComplexFilter(filter)}
              onSavedSearchLoad={() => {}}
              placeholder={`Search ${module.title.toLowerCase()}...`}
              config={activeConfig}
              filterCount={complexFilter?.rootGroup.rules.length || 0}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <FilterTags
            filter={complexFilter || null}
            onEditFilter={(singleRuleFilter) => {
              // Store the original filter and the rule being edited
              const ruleToEdit = singleRuleFilter.rootGroup.rules[0];
              setEditingRuleId(ruleToEdit.id);
              setOriginalComplexFilter(complexFilter);
              setComplexFilter(singleRuleFilter);
              setShowFilterDialog(true);
            }}
            onRemoveFilter={(ruleId) => {
              if (!complexFilter) return;
              const updatedFilter = {
                ...complexFilter,
                rootGroup: {
                  ...complexFilter.rootGroup,
                  rules: complexFilter.rootGroup.rules.filter((r: any) => r.id !== ruleId)
                }
              };
              setComplexFilter(updatedFilter.rootGroup.rules.length > 0 ? updatedFilter : null);
            }}
            onClearAll={() => setComplexFilter(null)}
          />
        )}
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading {module.title.toLowerCase()}...</div>
        </div>
      ) : (
        <div className="relative">
          {/* Gmail-style Bulk Actions Bar */}
          {selectedRows.length > 0 && actions?.bulkActions && (
                        <>
              {/* Full-width background bar that extends beyond container - with pointer-events-none */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-screen bg-accent/80 backdrop-blur-sm border-b border-border/50 h-14 z-[1] pointer-events-none" />
              
              {/* Content bar - enhanced with proper ShadCN styling */}
              <div className="absolute top-0 left-0 z-10 px-6 py-3 h-14 pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Selection indicator with improved styling */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'} selected
                      </span>
                    </div>
                    
                    {/* Separator */}
                    <div className="h-6 w-px bg-border" />
                    
                    {/* Actions container with proper spacing */}
                    <div className="flex items-center gap-2">
                                      {(() => {
                      const availableActions = actions.bulkActions.filter(action => !action.condition || action.condition(selectedRows));
                      
                      // Separate actions based on displayMode, key, and variant
                      const iconActions = availableActions.filter(action => 
                        action.displayMode === 'icon' || ['export', 'download'].includes(action.key)
                      );
                      const dropdownActions = availableActions.filter(action => 
                        action.displayMode !== 'icon' && 
                        !['export', 'download'].includes(action.key)
                      );
                    
                    return (
                      <>
                        {/* Icon Actions - Enhanced with ShadCN styling */}
                        {iconActions.map(action => (
                          <Button
                            key={action.key}
                            variant="ghost"
                            size="sm"
                            onClick={() => executeBulkAction(action.key, selectedRows)}
                            className="h-8 w-8 p-0 bg-muted/50 hover:bg-muted text-foreground hover:text-foreground border border-border/30 hover:border-border/60 shadow-sm"
                            title={action.label}
                          >
                            {action.icon && React.createElement(action.icon, { className: "h-4 w-4" })}
                          </Button>
                        ))}
                        
                                                {/* Dropdown Actions - Enhanced with ShadCN styling */}
                        {dropdownActions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 bg-muted/50 hover:bg-muted text-foreground font-medium border border-border/30 hover:border-border/60 shadow-sm"
                              >
                                Actions
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 shadow-lg border-border/60">
                              {(() => {
                                const regularActions = dropdownActions.filter(action => action.variant !== 'destructive');
                                const destructiveActions = dropdownActions.filter(action => action.variant === 'destructive');
                                
                                return (
                                  <>
                                    {/* Regular actions */}
                                    {regularActions.map(action => (
                                      <DropdownMenuItem
                                        key={action.key}
                                        onClick={() => executeBulkAction(action.key, selectedRows)}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent/50 focus:bg-accent/50"
                                      >
                                        {action.icon && React.createElement(action.icon, { className: "h-4 w-4 text-muted-foreground" })}
                                        <span className="font-medium">{action.label}</span>
                                      </DropdownMenuItem>
                                    ))}
                                    
                                    {/* Separator if both regular and destructive actions exist */}
                                    {regularActions.length > 0 && destructiveActions.length > 0 && (
                                      <div className="h-px bg-border my-1" />
                                    )}
                                    
                                    {/* Destructive actions */}
                                    {destructiveActions.map(action => (
                                      <DropdownMenuItem
                                        key={action.key}
                                        onClick={() => executeBulkAction(action.key, selectedRows)}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                                      >
                                        {action.icon && React.createElement(action.icon, { className: "h-4 w-4 text-destructive" })}
                                        <span className="font-medium">{action.label}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                );
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    );
                  })()}
                  
                  {/* Clear selection button - close to actions */}
                  <div className="ml-2 pl-2 border-l border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clear all selections
                        setSelectedRows([]);
                      }}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1"
                      title="Clear selection"
                    >
                      <X className="h-3 w-3" />
                      <span className="text-xs">Clear</span>
                    </Button>
                  </div>
                </div>
              </div>
                </div>
              </div>
            </>
          )}
          
          {/* Table with conditional top margin for bulk actions */}
          <div className={selectedRows.length > 0 && actions?.bulkActions ? "mt-14" : ""}>
            <DataTable
              data={data || []}
              columns={tableColumns}
              allowDrag={false}
              persistenceKey={`${moduleName}-table`}
              defaultPageSize={display?.pageSize || 10}
              searchable={false}
              enableColumnVisibility={true}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={!!actions?.bulkActions?.length}
              enablePagination={true}
              onSortChange={setSort}
            />
          </div>
        </div>
      )}

      {/* Advanced Filter Dialog (only shown when advanced filters are available) */}
      {isAdvancedMode && (
        <FilterDialog
          open={showFilterDialog}
          onOpenChange={(open) => {
            setShowFilterDialog(open);
            if (!open) {
              // Reset editing state when dialog closes
              setEditingRuleId(null);
              setOriginalComplexFilter(null);
            }
          }}
          moduleName={moduleName}
          fieldDiscovery={fieldDiscovery}
          initialFilter={complexFilter || null}
          config={activeConfig}
          onApply={(filter: any) => {
            if (editingRuleId && originalComplexFilter) {
              // We're editing an existing rule - merge it back into the original filter
              const editedRule = filter?.rootGroup.rules[0];
              if (editedRule) {
                const updatedFilter = {
                  ...originalComplexFilter,
                  rootGroup: {
                    ...originalComplexFilter.rootGroup,
                    rules: originalComplexFilter.rootGroup.rules.map(rule => 
                      rule.id === editingRuleId ? { 
                        ...rule, // Keep original rule properties
                        ...editedRule, // Override with edited properties
                        id: editingRuleId // Ensure ID is preserved
                      } : rule
                    )
                  }
                };
                setComplexFilter(updatedFilter);
              }
            } else {
              // New filter or not editing
              setComplexFilter(filter);
            }
            setShowFilterDialog(false);
            setEditingRuleId(null);
            setOriginalComplexFilter(null);
          }}
        />
      )}
    </div>
  );
} 