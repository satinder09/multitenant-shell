import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showSelection?: boolean;
  showActions?: boolean;
  columnConfig?: Array<{
    width?: number | string;
    type?: 'name' | 'status' | 'date' | 'number' | 'text' | 'code';
  }>;
}

// Default column configuration for generic tables
const DEFAULT_COLUMN_CONFIG = [
  { width: 250, type: 'name' as const },     // Name/Title column (wider)
  { width: 200, type: 'text' as const },     // Secondary info
  { width: 100, type: 'status' as const },   // Status badge
  { width: 100, type: 'number' as const },   // Numeric data
  { width: 120, type: 'date' as const },     // Date column
];

export function TableSkeleton({ 
  columns = 5, 
  rows = 6, 
  showSelection = false, 
  showActions = false,
  columnConfig = DEFAULT_COLUMN_CONFIG
}: TableSkeletonProps) {
  // Ensure we have enough column configs
  const finalColumnConfig = [...columnConfig];
  while (finalColumnConfig.length < columns) {
    finalColumnConfig.push({ width: 120, type: 'text' });
  }

  const renderSkeletonByType = (type: string, width: number | string) => {
    switch (type) {
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        );
      case 'status':
        return <Skeleton className="h-6 w-16 rounded-full" />;
      case 'code':
        return <Skeleton className="h-6 w-32 rounded font-mono" />;
      case 'date':
        return <Skeleton className="h-4 w-20" />;
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-8" />
          </div>
        );
      default:
        return <Skeleton className="h-4 w-full" />;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {showSelection && (
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4 rounded" />
            </TableHead>
          )}
          {finalColumnConfig.slice(0, columns).map((config, index) => (
            <TableHead 
              key={index} 
              className="font-medium text-muted-foreground"
              style={{ 
                width: typeof config.width === 'number' ? `${config.width}px` : config.width,
                minWidth: typeof config.width === 'number' ? `${config.width}px` : config.width,
                maxWidth: typeof config.width === 'number' ? `${config.width}px` : config.width
              }}
            >
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
          {showActions && (
            <TableHead className="w-32 text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="hover:bg-transparent">
            {showSelection && (
              <TableCell>
                <Skeleton className="h-4 w-4 rounded" />
              </TableCell>
            )}
            {finalColumnConfig.slice(0, columns).map((config, colIndex) => (
              <TableCell 
                key={colIndex}
                style={{ 
                  width: typeof config.width === 'number' ? `${config.width}px` : config.width,
                  minWidth: typeof config.width === 'number' ? `${config.width}px` : config.width,
                  maxWidth: typeof config.width === 'number' ? `${config.width}px` : config.width
                }}
              >
                {renderSkeletonByType(config.type || 'text', config.width || 120)}
              </TableCell>
            ))}
            {showActions && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Specialized skeleton for tables with selection
export function TableSkeletonWithSelection(props: Omit<TableSkeletonProps, 'showSelection'>) {
  return <TableSkeleton {...props} showSelection={true} />;
}

// Specialized skeleton for tables with actions
export function TableSkeletonWithActions(props: Omit<TableSkeletonProps, 'showActions'>) {
  return <TableSkeleton {...props} showActions={true} />;
}

// Specialized skeleton for tables with both selection and actions
export function TableSkeletonWithSelectionAndActions(props: Omit<TableSkeletonProps, 'showSelection' | 'showActions'>) {
  return <TableSkeleton {...props} showSelection={true} showActions={true} />;
} 