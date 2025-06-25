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
import { AlertTriangle, Edit, Trash2, Plus, Shield, Users, Settings, Key } from 'lucide-react';
import ComboBoxTags from '@/components/ui-kit/ComboBoxTags';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage user roles and their associated permissions
          </p>
        </div>
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
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4">
        {roles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No roles found</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first role</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Roles ({roles.length})</CardTitle>
              <CardDescription>
                Manage roles and their permission assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Role</th>
                      <th className="text-left py-3 px-4 font-medium">Permissions</th>
                      <th className="text-left py-3 px-4 font-medium">Users</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role, index) => (
                      <tr
                        key={role.id}
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? 'bg-muted/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Shield className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Role ID: {role.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {role.rolePermissions.length > 0 ? (
                              role.rolePermissions.slice(0, 3).map((rp) => (
                                <Badge key={rp.permission.id} variant="outline" className="text-xs">
                                  {rp.permission.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No permissions</span>
                            )}
                            {role.rolePermissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.rolePermissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {role.userRoles.length}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {role.userRoles.length === 1 ? 'user' : 'users'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">
                            Recently created
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(role)}
                              className="h-8"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(role)}
                              disabled={deletingRoleId === role.id}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              {deletingRoleId === role.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
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