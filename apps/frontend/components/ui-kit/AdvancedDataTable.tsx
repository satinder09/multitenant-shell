"use client"

import * as React from "react"
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  IconGripVertical,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconColumns3,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"

interface AdvancedDataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  allowDrag?: boolean
  persistenceKey?: string // Key for localStorage persistence
  defaultPageSize?: number
  enableColumnVisibility?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enableRowSelection?: boolean
}

interface TableState {
  columnVisibility: VisibilityState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  pagination: { pageIndex: number; pageSize: number }
  rowSelection: Record<string, boolean>
}

// Hook for managing table state with persistence
function useTableState(
  columns: ColumnDef<any>[],
  persistenceKey?: string,
  defaultPageSize = 10
): [TableState, {
  setColumnVisibility: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void
  setSorting: (updater: SortingState | ((old: SortingState) => SortingState)) => void
  setColumnFilters: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void
  setPagination: (updater: { pageIndex: number; pageSize: number } | ((old: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number })) => void
  setRowSelection: (updater: Record<string, boolean> | ((old: Record<string, boolean>) => Record<string, boolean>)) => void
}] {
  
  const getInitialState = (): TableState => {
    // Try to load from localStorage if persistenceKey is provided
    if (persistenceKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`tableState_${persistenceKey}`)
        if (saved) {
          const parsedState = JSON.parse(saved)
          // Ensure the saved state has all required properties
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

    // Initialize column visibility from config
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

  const [state, setState] = React.useState<TableState>(getInitialState)

  // Save to localStorage whenever state changes
  React.useEffect(() => {
    if (persistenceKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tableState_${persistenceKey}`, JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to save table state to localStorage:', error)
      }
    }
  }, [state, persistenceKey])

  const createUpdater = <T,>(key: keyof TableState) => (updater: T | ((old: T) => T)) => {
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
  ]
}

export function AdvancedDataTable<TData>({ 
  data: initialData, 
  columns, 
  allowDrag = false, 
  persistenceKey,
  defaultPageSize = 10,
  enableColumnVisibility = true,
  enableSorting = true,
  enableFiltering = true,
  enableRowSelection = true,
}: AdvancedDataTableProps<TData>) {
  const [data, setData] = React.useState(() => initialData)
  const [columnSearch, setColumnSearch] = React.useState("")

  // Use custom hook for table state management
  const [tableState, tableActions] = useTableState(columns, persistenceKey, defaultPageSize)

  // Sync internal data state with prop changes
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(() =>
    data.map((_, index) => index.toString()), [data]
  )

  const table = useReactTable({
    data,
    columns,
    state: { 
      sorting: enableSorting ? tableState.sorting : [],
      columnVisibility: enableColumnVisibility ? tableState.columnVisibility : {},
      rowSelection: enableRowSelection ? tableState.rowSelection : {},
      columnFilters: enableFiltering ? tableState.columnFilters : [],
      pagination: tableState.pagination
    },
    onSortingChange: enableSorting ? tableActions.setSorting : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? tableActions.setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection ? tableActions.setRowSelection : undefined,
    onColumnFiltersChange: enableFiltering ? tableActions.setColumnFilters : undefined,
    onPaginationChange: tableActions.setPagination,
    getRowId: (_row, index) => index.toString(),
    enableRowSelection: enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setData(d => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over!.id)
        return arrayMove(d, oldIndex, newIndex)
      })
    }
  }

  // DragHandle component for drag functionality (currently unused as allowDrag is false)
  // function DragHandle({ id }: { id: UniqueIdentifier }) {
  //   const { attributes, listeners, setNodeRef } = useSortable({ id })
  //   return (
  //     <Button ref={setNodeRef} {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent">
  //       <IconGripVertical />
  //       <span className="sr-only">Drag</span>
  //     </Button>
  //   )
  // }

  const TableContent = () => (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map(row => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search..."
          className="max-w-sm"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
        />
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
                    // Get the column header text for better display
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
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
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
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
    </div>
  )
}