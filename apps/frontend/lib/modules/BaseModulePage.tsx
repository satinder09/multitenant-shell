import React, { useMemo } from 'react';
import { ModuleConfig } from './types';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Button } from '@/components/ui/button';

interface BaseModulePageProps {
  config: ModuleConfig;
}

export function BaseModulePage({ config }: BaseModulePageProps) {
  const {
    sourceTable,
    columns,
    actions,
    display,
    module
  } = config;

  // Generate table columns from config
  const visibleColumns = useMemo(() => 
    columns.filter(col => 
      display?.defaultColumns?.includes(col.field) || (col.visible && !display?.defaultColumns)
    ),
    [columns, display?.defaultColumns]
  );

  // Generate popular filters from config
  const popularFilters = useMemo(() => 
    columns.filter(col => col.popular && col.popularFilter),
    [columns]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Module Header */}
      <SectionHeader
        title={module.title}
        description={module.description}
        actions={
          <div className="flex items-center gap-2">
            {actions?.headerActions?.map((action) => (
              <Button
                key={action.key}
                variant={action.variant || 'outline'} 
                size="sm" 
                onClick={action.onClick}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Configuration Display */}
      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Auto-Generated Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Info */}
          <div>
            <h4 className="font-medium mb-2">Data Source</h4>
            <div className="text-sm space-y-1">
              <div><strong>Table:</strong> {sourceTable}</div>
              <div><strong>Primary Key:</strong> {config.primaryKey || 'id'}</div>
              <div><strong>Total Columns:</strong> {columns.length}</div>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h4 className="font-medium mb-2">Display Settings</h4>
            <div className="text-sm space-y-1">
              <div><strong>Default Sort:</strong> {display?.defaultSort?.field} ({display?.defaultSort?.direction})</div>
              <div><strong>Page Size:</strong> {display?.pageSize}</div>
              <div><strong>Selectable:</strong> {display?.selectable ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Visible Columns */}
        <div>
          <h4 className="font-medium mb-2">Visible Columns ({visibleColumns.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {visibleColumns.map(col => (
              <div key={col.field} className="bg-background rounded p-2 text-sm">
                <div className="font-medium">{col.display}</div>
                <div className="text-muted-foreground text-xs">
                  {col.field} ({col.type})
                </div>
                {col.popular && (
                  <div className="text-xs text-blue-600 mt-1">Popular Filter</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Popular Filters */}
        {popularFilters.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Popular Filters ({popularFilters.length})</h4>
            <div className="space-y-2">
              {popularFilters.map(col => (
                <div key={col.field} className="bg-background rounded p-3 text-sm">
                  <div className="font-medium">{col.display}</div>
                  <div className="text-muted-foreground">
                    {col.popularFilter?.operator} 
                    {col.popularFilter?.value && `: ${col.popularFilter.value}`}
                  </div>
                  <div className="text-xs text-blue-600">
                    "{col.popularFilter?.label}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row Actions */}
          {actions?.rowActions && actions.rowActions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Row Actions ({actions.rowActions.length})</h4>
              <div className="space-y-1">
                {actions.rowActions.map(action => (
                  <div key={action.key} className="text-sm bg-background rounded p-2">
                    {action.icon && <action.icon className="inline mr-2 h-3 w-3" />}
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {actions?.bulkActions && actions.bulkActions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Bulk Actions ({actions.bulkActions.length})</h4>
              <div className="space-y-1">
                {actions.bulkActions.map(action => (
                  <div key={action.key} className="text-sm bg-background rounded p-2">
                    {action.icon && <action.icon className="inline mr-2 h-3 w-3" />}
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Header Actions */}
          {actions?.headerActions && actions.headerActions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Header Actions ({actions.headerActions.length})</h4>
              <div className="space-y-1">
                {actions.headerActions.map(action => (
                  <div key={action.key} className="text-sm bg-background rounded p-2">
                    {action.icon && <action.icon className="inline mr-2 h-3 w-3" />}
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operators by Type */}
        <div>
          <h4 className="font-medium mb-2">Auto-Generated Operators</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns
              .filter(col => col.operators && col.operators.length > 0)
              .map(col => (
                <div key={col.field} className="bg-background rounded p-3 text-sm">
                  <div className="font-medium">{col.display}</div>
                  <div className="text-muted-foreground text-xs mb-1">
                    Type: {col.type}
                  </div>
                  <div className="text-xs">
                    {col.operators?.join(', ')}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Demo Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-900 font-medium mb-2">🎉 Config-Driven Module Demo</h3>
        <p className="text-blue-800 text-sm">
          This entire page was generated from a single configuration object! 
          The configuration automatically derived from your Prisma schema includes:
        </p>
        <ul className="text-blue-800 text-sm mt-2 ml-4 list-disc">
          <li><strong>Auto-detected field types</strong> with appropriate operators</li>
          <li><strong>Popular filters</strong> based on field patterns</li>
          <li><strong>Custom renderers</strong> for better display</li>
          <li><strong>Complete actions</strong> (row, bulk, header)</li>
          <li><strong>Responsive layout</strong> and proper styling</li>
        </ul>
        <p className="text-blue-800 text-sm mt-2">
          To create a new module, just define a config and you get all this functionality automatically!
        </p>
      </div>
    </div>
  );
} 