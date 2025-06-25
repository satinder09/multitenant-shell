'use client';

import { useState, useEffect, useTransition, FormEvent } from 'react';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toastNotify } from '@/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/ui/dialogUtils';
import { AlertTriangle, Edit, Trash2, Plus, Shield, Users, Settings, Key, MoreHorizontal, Download, Filter } from 'lucide-react';
import ComboBoxTags from '@/components/ui-kit/ComboBoxTags';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Import our enhanced UI components
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';
import { TabsBlock } from '@/components/ui-kit/TabsBlock';
import { DataTable } from '@/components/ui-kit/DataTable';

// Role interface
interface PlatformRole {
  id: string;
  name: string;
  rolePermissions: Array<{
    permission: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  userRoles: Array<{
    user: {
      id: string;
      email: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Permission interface
interface Permission {
  id: string;
  name: string;
  description?: string;
}

// Server actions
async function createRoleAction(formData: FormData) {
  const name = formData.get('name') as string;
  const permissionIds = formData.get('permissionIds') as string;
  
  const res = await fetch('/api/platform-rbac/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name,
      permissionIds: permissionIds ? JSON.parse(permissionIds) : []
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create role');
  }
  return await res.json();
}

async function updateRoleAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const permissionIds = formData.get('permissionIds') as string;
  
  const res = await fetch(`/api/platform-rbac/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name,
      permissionIds: permissionIds ? JSON.parse(permissionIds) : []
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update role');
  }
  return await res.json();
}

async function deleteRoleAction(id: string) {
  const res = await fetch(`/api/platform-rbac/roles/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete role');
  }
}

export default function PlatformRolesPage() {
  const { isPlatform } = usePlatform();
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  
  // Create dialog states
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Edit dialog states
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSelectedPermissions, setEditSelectedPermissions] = useState<string[]>([]);
  
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        // Fetch both roles and permissions in parallel
        const [rolesRes, permissionsRes] = await Promise.all([
          fetch('/api/platform-rbac/roles'),
          fetch('/api/platform-rbac/permissions')
        ]);
        
        if (!rolesRes.ok) {
          throw new Error('Failed to fetch roles data');
        }
        
        const rolesData = await rolesRes.json();
        let permissionsData = [];
        
        if (permissionsRes.ok) {
          permissionsData = await permissionsRes.json();
        }
        
        setRoles(rolesData);
        setPermissions(permissionsData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('permissionIds', JSON.stringify(selectedPermissions));
    
    startTransition(async () => {
      try {
        const newRole = await createRoleAction(formData);
        toastNotify({
          variant: 'success',
          title: 'Role created successfully',
        });
        setCreateDialogOpen(false);
        setSelectedPermissions([]);
        setRoles([...roles, newRole]);
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleEdit = (role: PlatformRole) => {
    setEditingRole(role);
    setEditSelectedPermissions(role.rolePermissions.map(rp => rp.permission.id));
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRole) return;
    
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('permissionIds', JSON.stringify(editSelectedPermissions));
    
    startTransition(async () => {
      try {
        const updatedRole = await updateRoleAction(editingRole.id, formData);
        toastNotify({
          variant: 'success',
          title: 'Role updated successfully',
        });
        setEditDialogOpen(false);
        setEditingRole(null);
        setEditSelectedPermissions([]);
        setRoles(roles.map(r => r.id === editingRole.id ? updatedRole : r));
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDelete = (role: PlatformRole) => {
    confirm({
      title: 'Delete Role?',
      description: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone and will remove all associated permissions.`,
      confirmLabel: 'Delete',
      variant: 'critical',
      onConfirm: async () => {
        setDeletingRoleId(role.id);
        try {
          await deleteRoleAction(role.id);
          toastNotify({
            variant: 'success',
            title: 'Role deleted successfully',
          });
          setRoles(roles.filter(r => r.id !== role.id));
        } catch (err: unknown) {
          toastNotify({
            variant: 'error',
            title: 'Delete failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
        } finally {
          setDeletingRoleId(null);
        }
      },
    });
  };

  const handleCreateDialogOpening = (open: boolean) => {
    if (open) {
      setCreateError(null);
      setSelectedPermissions([]);
    }
    setCreateDialogOpen(open);
  };

  const handleEditDialogOpening = (open: boolean) => {
    if (!open) {
      setEditingRole(null);
      setEditSelectedPermissions([]);
      setEditError(null);
    }
    setEditDialogOpen(open);
  };

  // Transform permissions for ComboBoxTags
  const permissionOptions = permissions.map(p => ({
    value: p.id,
    label: p.name,
    description: p.description || '',
  }));

  // Prepare data for the enhanced DataTable
  const tableColumns = [
    {
      key: 'name',
      label: 'Role',
      sortable: true,
      render: (value: string, row: PlatformRole) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">
              Role ID: {row.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (_: any, row: PlatformRole) => (
        <div className="flex flex-wrap gap-1">
          {row.rolePermissions.length > 0 ? (
            row.rolePermissions.slice(0, 3).map((rp) => (
              <Badge key={rp.permission.id} variant="outline" className="text-xs">
                {rp.permission.name}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No permissions</span>
          )}
          {row.rolePermissions.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{row.rolePermissions.length - 3} more
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'users',
      label: 'Users',
      sortable: true,
      render: (_: any, row: PlatformRole) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{row.userRoles.length}</span>
          <span className="text-sm text-muted-foreground">
            {row.userRoles.length === 1 ? 'user' : 'users'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: PlatformRole) => (
        <StatusBadge 
          status={row.rolePermissions.length > 0 ? 'done' : 'pending'} 
          text={row.rolePermissions.length > 0 ? 'Active' : 'Inactive'}
          size="sm"
        />
      )
    },
    {
      key: 'created',
      label: 'Created',
      render: () => (
        <div className="text-sm text-muted-foreground">Recently created</div>
      )
    }
  ];

  if (!isPlatform) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">This page is only accessible from the platform domain.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }
  
  if (error) {
     return <div className="min-h-screen flex items-center justify-center text-destructive">{error}</div>;
  }

  // Prepare tabs for the enhanced TabsBlock
  const tabsData = [
    {
      value: 'all-roles',
      label: 'All Roles',
      count: roles.length,
      content: (
        <DataTable
          columns={tableColumns}
          data={roles}
          searchable={true}
          searchPlaceholder="Search roles..."
          filterable={true}
          exportable={true}
          addable={true}
          onAdd={() => setCreateDialogOpen(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No roles found. Create your first role to get started."
          loading={isLoading}
        />
      )
    },
    {
      value: 'active-roles',
      label: 'Active Roles',
      count: roles.filter(r => r.rolePermissions.length > 0).length,
      content: (
        <DataTable
          columns={tableColumns}
          data={roles.filter(r => r.rolePermissions.length > 0)}
          searchable={true}
          searchPlaceholder="Search active roles..."
          emptyMessage="No active roles found."
        />
      )
    },
    {
      value: 'inactive-roles',
      label: 'Inactive Roles',
      count: roles.filter(r => r.rolePermissions.length === 0).length,
      content: (
        <DataTable
          columns={tableColumns}
          data={roles.filter(r => r.rolePermissions.length === 0)}
          searchable={true}
          searchPlaceholder="Search inactive roles..."
          emptyMessage="No inactive roles found."
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Enhanced Page Header */}
      <SectionHeader
        title="Roles"
        description="Manage user roles and their associated permissions"
        count={roles.length}
        size="lg"
        variant="bordered"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpening}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Define a new role and assign permissions to control user access.
                  </DialogDescription>
                </DialogHeader>
                {createError && (
                  <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{createError}</span>
                  </div>
                )}
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      className="col-span-3"
                      placeholder="Enter role name"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">
                      Permissions
                    </Label>
                    <div className="col-span-3">
                    <ComboBoxTags
                      options={permissionOptions}
                      selected={selectedPermissions}
                      onChange={setSelectedPermissions}
                      placeholder="Select permissions..."
                      searchPlaceholder="Search permissions..."
                    />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Spinner size="sm" /> : 'Create Role'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      
      {/* Enhanced Tabbed Content */}
      <TabsBlock
        tabs={tabsData}
        defaultValue="all-roles"
        variant="underline"
        className="space-y-6"
      />

      {/* Edit Dialog - keeping existing implementation */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpening}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role name and modify permission assignments.
              </DialogDescription>
            </DialogHeader>
            {editError && (
              <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{editError}</span>
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  className="col-span-3"
                  defaultValue={editingRole?.name || ''}
                  placeholder="Enter role name"
                  required 
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Permissions
                </Label>
                <div className="col-span-3">
                <ComboBoxTags
                  options={permissionOptions}
                  selected={editSelectedPermissions}
                  onChange={setEditSelectedPermissions}
                  placeholder="Select permissions..."
                  searchPlaceholder="Search permissions..."
                />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Update Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 