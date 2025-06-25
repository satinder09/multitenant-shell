'use client';

import { useState, useEffect, useTransition, FormEvent } from 'react';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui-kit/DataTable';
import { toastNotify } from '@/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/ui/dialogUtils';
import { AlertTriangle, Edit, Trash2 } from 'lucide-react';
import ComboBoxTags from '@/components/ui-kit/ComboBoxTags';

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
        setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDelete = (role: PlatformRole) => {
    confirm({
      title: 'Delete Role?',
      description: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone and will remove the role from all users.`,
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

  const permissionOptions = permissions.map(p => ({
    value: p.id,
    label: p.name,
    description: p.description
  }));

  const columns = [
    { accessorKey: 'name', header: 'Role Name' },
    {
      accessorKey: 'rolePermissions',
      header: 'Permissions',
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: PlatformRole } }) => {
        const rolePermissions = row.getValue('rolePermissions') as PlatformRole['rolePermissions'];
        return (
          <div className="flex flex-wrap gap-1">
            {rolePermissions.map(rp => (
              <span key={rp.permission.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {rp.permission.name}
              </span>
            ))}
            {rolePermissions.length === 0 && (
              <span className="text-gray-500 text-sm">No permissions</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'userRoles',
      header: 'Users',
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: PlatformRole } }) => {
        const userRoles = row.getValue('userRoles') as PlatformRole['userRoles'];
        return (
          <span className="text-sm">
            {userRoles.length} user{userRoles.length !== 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: PlatformRole } }) => {
        const role = row.original;
        const isDeleting = deletingRoleId === role.id;

        return (
          <div className="text-right space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isDeleting || isPending}
              onClick={() => handleEdit(role)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm" 
              disabled={isDeleting || isPending}
              onClick={() => handleDelete(role)}
            >
              {isDeleting ? <Spinner size="sm" /> : <><Trash2 className="w-4 h-4 mr-1" />Delete</>}
            </Button>
          </div>
        );
      },
    },
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

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Roles</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpening}>
          <DialogTrigger asChild>
            <Button>Create Role</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>Create a new platform role with permissions.</DialogDescription>
              </DialogHeader>
              {createError && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{createError}</span>
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  <ComboBoxTags
                    options={permissionOptions}
                    selected={selectedPermissions}
                    onChange={setSelectedPermissions}
                    placeholder="Select permissions..."
                    searchPlaceholder="Search permissions..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner size="sm" /> : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DataTable columns={columns} data={roles} />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpening}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>Update the role name and permissions.</DialogDescription>
            </DialogHeader>
            {editError && (
              <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{editError}</span>
              </div>
            )}
                        <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingRole?.name}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <ComboBoxTags
                  options={permissionOptions}
                  selected={editSelectedPermissions}
                  onChange={setEditSelectedPermissions}
                  placeholder="Select permissions..."
                  searchPlaceholder="Search permissions..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 