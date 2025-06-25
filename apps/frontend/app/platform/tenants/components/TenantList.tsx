import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { MoreHorizontal, Building2, Calendar, LogIn, UserCheck, Power, ArrowUpDown } from 'lucide-react';
import { TenantModel, TenantListProps } from '../types';
import { getAccessLevelColor } from '../utils/tenantHelpers';
import ServerPagination from './ServerPagination';

const TenantList: React.FC<TenantListProps> = ({ 
  data, 
  isLoading,
  pagination,
  onToggleStatus, 
  onImpersonate, 
  onSecureLogin,
  onPageChange,
  onLimitChange,
  onSortChange,
  emptyMessage = "No tenants found.",
  onBulkActivate,
  onBulkDeactivate,
}) => {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<keyof TenantModel>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof TenantModel) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSortChange?.({ field, direction: newDirection });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map(tenant => tenant.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (tenantId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(tenantId);
    } else {
      newSelected.delete(tenantId);
    }
    setSelectedRows(newSelected);
  };

  const isAllSelected = data.length > 0 && selectedRows.size === data.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </div>
        {pagination && (
          <ServerPagination
            pagination={pagination}
            onPageChange={onPageChange!}
            onLimitChange={onLimitChange!}
            isLoading={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            {selectedRows.size} tenant{selectedRows.size > 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onBulkActivate?.(Array.from(selectedRows));
                setSelectedRows(new Set());
              }}
            >
              Activate Selected
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onBulkDeactivate?.(Array.from(selectedRows));
                setSelectedRows(new Set());
              }}
            >
              Deactivate Selected
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Tenant
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('isActive')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('accessLevel')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Access Level
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Created
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(tenant.id)}
                      onCheckedChange={(checked) => handleSelectRow(tenant.id, !!checked)}
                      aria-label={`Select ${tenant.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">{tenant.subdomain}.example.com</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={tenant.isActive ? 'done' : 'pending'}
                      text={tenant.isActive ? 'Active' : 'Inactive'}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getAccessLevelColor(tenant.accessLevel)}>
                      {tenant.accessLevel.charAt(0).toUpperCase() + tenant.accessLevel.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {tenant.canAccess && (
                          <DropdownMenuItem onClick={() => onSecureLogin(tenant)}>
                            <LogIn className="mr-2 h-4 w-4" />
                            Secure Login
                          </DropdownMenuItem>
                        )}
                        {tenant.canImpersonate && (
                          <DropdownMenuItem onClick={() => onImpersonate(tenant)}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Impersonate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => onToggleStatus(tenant.id, tenant.isActive)} 
                          className="text-destructive"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {tenant.isActive ? 'Deactivate' : 'Activate'} Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-Side Pagination */}
      {pagination && (
        <ServerPagination
          pagination={pagination}
          onPageChange={onPageChange!}
          onLimitChange={onLimitChange!}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default TenantList; 