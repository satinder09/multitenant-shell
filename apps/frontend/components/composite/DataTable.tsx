"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconColumns3,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search, 
  MoreHorizontal, 
  ArrowUpDown, 
  Filter,
  Download,
  Plus
} from "lucide-react"
import { cn } from "@/shared/utils/utils"

// Legacy simple column interface for backwards compatibility
interface SimpleColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

// Enhanced props interface that supports both simple and advanced usage
interface DataTableProps<TData = any> {
  // Core data props
  columns: SimpleColumn[] | ColumnDef<TData>[];
  data: TData[];
  
  // Simple interface props (for backwards compatibility)
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  exportable?: boolean;
  addable?: boolean;
  onAdd?: () => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  onExport?: () => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;

  // Advanced features props
  allowDrag?: boolean;
  persistenceKey?: string;
  defaultPageSize?: number;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableRowSelection?: boolean;
  enablePagination?: boolean;
}

// Table state management hook with persistence
function useTableState(
  columns: ColumnDef<any>[],
  persistenceKey?: string,
  defaultPageSize = 10
) {
  const getInitialState = () => {
    if (persistenceKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`tableState_${persistenceKey}`)
        if (saved) {
          const parsedState = JSON.parse(saved)
          return {
            columnVisibility: parsedState.columnVisibility || {},
            sorting: parsedState.sorting || [],
            columnFilters: parsedState.columnFilters || [],
            pagination: parsedState.pagination || { pageIndex: 0, pageSize: defaultPageSize },
            rowSelection: parsedState.rowSelection || {}
          }
        }
      } catch (error) {
        console.warn('Failed to load table state from localStorage:', error)
      }
    }

    const initialColumnVisibility: VisibilityState = {}
    columns.forEach((column) => {
      const meta = (column as any).meta
      if (meta && typeof meta.defaultVisible === 'boolean') {
        initialColumnVisibility[column.id || ''] = meta.defaultVisible
      }
    })

    return {
      columnVisibility: initialColumnVisibility,
      sorting: [],
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: defaultPageSize },
      rowSelection: {}
    }
  }

  const [state, setState] = React.useState(getInitialState)

  React.useEffect(() => {
    if (persistenceKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tableState_${persistenceKey}`, JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to save table state to localStorage:', error)
      }
    }
  }, [state, persistenceKey])

  const createUpdater = <T,>(key: keyof typeof state) => (updater: T | ((old: T) => T)) => {
    setState(prev => ({
      ...prev,
      [key]: typeof updater === 'function' ? (updater as (old: T) => T)(prev[key] as T) : updater
    }))
  }

  return [
    state,
    {
      setColumnVisibility: createUpdater<VisibilityState>('columnVisibility'),
      setSorting: createUpdater<SortingState>('sorting'),
      setColumnFilters: createUpdater<ColumnFiltersState>('columnFilters'),
      setPagination: createUpdater<{ pageIndex: number; pageSize: number }>('pagination'),
      setRowSelection: createUpdater<Record<string, boolean>>('rowSelection')
    }
  ] as const
}

// Utility to convert simple columns to ColumnDef
function convertSimpleColumnsToColumnDef<TData>(
  simpleColumns: SimpleColumn[],
  onEdit?: (row: TData) => void,
  onDelete?: (row: TData) => void
): ColumnDef<TData>[] {
  const columnDefs: ColumnDef<TData>[] = simpleColumns.map((col) => ({
    id: col.key,
    accessorKey: col.key,
    header: col.label,
    enableSorting: col.sortable,
    cell: ({ row, getValue }) => {
      const value = getValue()
      if (col.render) {
        return col.render(value, row.original)
      }
      return value
    },
    meta: {
      align: col.align,
      width: col.width,
    }
  }))

  // Add actions column if edit/delete handlers are provided
  if (onEdit || onDelete) {
    columnDefs.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(row.original)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        width: '80px',
        align: 'right' as const,
      }
    })
  }

  return columnDefs
}

export function DataTable<TData>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  filterable = false,
  exportable = false,
  addable = false,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  className,
  emptyMessage = "No data available",
  loading = false,
  allowDrag = false,
  persistenceKey,
  defaultPageSize = 10,
  enableColumnVisibility = false,
  enableSorting = true,
  enableFiltering = true,
  enableRowSelection = false,
  enablePagination = false,
}: DataTableProps<TData>) {
  const [internalData, setInternalData] = React.useState(() => data)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [columnSearch, setColumnSearch] = React.useState("")

  // Detect if columns are simple or advanced
  const isSimpleColumns = columns.length > 0 && 'key' in columns[0]
  
  // Convert simple columns to ColumnDef if needed
  const tableColumns: ColumnDef<TData>[] = React.useMemo(() => {
    if (isSimpleColumns) {
      return convertSimpleColumnsToColumnDef(
        columns as SimpleColumn[], 
        onEdit, 
        onDelete
      )
    }
    return columns as ColumnDef<TData>[]
  }, [columns, onEdit, onDelete, isSimpleColumns])

  // Sync internal data with prop changes
  React.useEffect(() => {
    setInternalData(data)
  }, [data])

  // Use advanced table state management if persistence is enabled
  const [tableState, tableActions] = useTableState(
    tableColumns, 
    persistenceKey, 
    defaultPageSize
  )

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(() =>
    internalData.map((_, index) => index.toString()), [internalData]
  )

  const table = useReactTable({
    data: internalData,
    columns: tableColumns,
    state: persistenceKey ? {
      sorting: enableSorting ? tableState.sorting : [],
      columnVisibility: enableColumnVisibility ? tableState.columnVisibility : {},
      rowSelection: enableRowSelection ? tableState.rowSelection : {},
      columnFilters: enableFiltering ? tableState.columnFilters : [],
      pagination: enablePagination ? tableState.pagination : { pageIndex: 0, pageSize: internalData.length },
    } : {
      sorting: [],
      columnVisibility: {},
      rowSelection: {},
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: enablePagination ? defaultPageSize : internalData.length },
    },
    onSortingChange: persistenceKey && enableSorting ? tableActions.setSorting : undefined,
    onColumnVisibilityChange: persistenceKey && enableColumnVisibility ? tableActions.setColumnVisibility : undefined,
    onRowSelectionChange: persistenceKey && enableRowSelection ? tableActions.setRowSelection : undefined,
    onColumnFiltersChange: persistenceKey && enableFiltering ? tableActions.setColumnFilters : undefined,
    onPaginationChange: persistenceKey && enablePagination ? tableActions.setPagination : undefined,
    getRowId: (_row, index) => index.toString(),
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
  })

  // Handle drag end for sortable rows
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setInternalData(d => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over!.id)
        return arrayMove(d, oldIndex, newIndex)
      })
    }
  }

  // Filter data for simple search (when not using advanced filtering)
  const filteredData = React.useMemo(() => {
    if (!searchable || !searchTerm || enableFiltering) {
      return internalData
    }
    
    return internalData.filter(row =>
      Object.values(row as Record<string, any>).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [internalData, searchTerm, searchable, enableFiltering])

  // Use filtered data for simple mode
  React.useEffect(() => {
    if (!enableFiltering && searchable) {
      // For simple mode, we handle search manually
      if (searchTerm) {
        table.setGlobalFilter(searchTerm)
      } else {
        table.setGlobalFilter('')
      }
    }
  }, [searchTerm, enableFiltering, searchable, table])

  const TableContent = () => (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map(header => {
              const meta = header.column.columnDef.meta as any
              return (
                <TableHead 
                  key={header.id}
                  className={cn(
                    'font-medium text-muted-foreground',
                    meta?.width && `w-[${meta.width}]`,
                    meta?.align === 'center' && 'text-center',
                    meta?.align === 'right' && 'text-right',
                    header.column.getCanSort() && 'cursor-pointer hover:text-foreground'
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell 
              colSpan={tableColumns.length} 
              className="h-24 text-center"
            >
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            </TableCell>
          </TableRow>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map(row => {
            const meta = row.original as any
            return (
              <TableRow 
                key={row.id} 
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-muted/50"
              >
                {row.getVisibleCells().map(cell => {
                  const columnMeta = cell.column.columnDef.meta as any
                  return (
                    <TableCell 
                      key={cell.id}
                      className={cn(
                        columnMeta?.align === 'center' && 'text-center',
                        columnMeta?.align === 'right' && 'text-right'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell 
              colSpan={tableColumns.length} 
              className="h-24 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Actions */}
      {(searchable || filterable || exportable || addable || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            {searchable && (
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={enableFiltering 
                    ? (table.getColumn("name")?.getFilterValue() as string) ?? ""
                    : searchTerm
                  }
                  onChange={(e) => {
                    if (enableFiltering) {
                      table.getColumn("name")?.setFilterValue(e.target.value)
                    } else {
                      setSearchTerm(e.target.value)
                    }
                  }}
                  className="pl-10 h-9"
                />
              </div>
            )}
            
            {filterable && (
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <IconColumns3 className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search columns..."
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      autoFocus={false}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .filter((column) => {
                        const headerText = typeof column.columnDef.header === 'string' 
                          ? column.columnDef.header 
                          : column.id;
                        const searchTerm = columnSearch.toLowerCase();
                        return column.id.toLowerCase().includes(searchTerm) ||
                               headerText.toLowerCase().includes(searchTerm);
                      })
                      .map((column) => {
                        const headerText = typeof column.columnDef.header === 'string' 
                          ? column.columnDef.header 
                          : column.id;
                        
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                            onSelect={(e) => e.preventDefault()}
                          >
                            {headerText}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {exportable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onExport}
                className="h-9"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            
            {addable && (
              <Button 
                size="sm" 
                onClick={onAdd}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-background">
        {allowDrag ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dataIds}
              strategy={verticalListSortingStrategy}
            >
              <TableContent />
            </SortableContext>
          </DndContext>
        ) : (
          <TableContent />
        )}
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {enableRowSelection && (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Footer */}
      {!enablePagination && !loading && table.getRowModel().rows.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {table.getRowModel().rows.length} of {internalData.length} entries
            {searchTerm && ` (filtered from ${internalData.length} total entries)`}
          </div>
        </div>
      )}
    </div>
  )
}
