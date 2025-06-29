'use client';

import { useState, useEffect, useTransition, FormEvent } from 'react';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/shared/utils/ui/dialogUtils';
import { AlertTriangle, Edit, Trash2, Plus, Key, Shield, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Permission interface
interface Permission {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    rolePermissions: number;
  };
}

// Server actions
async function createPermissionAction(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  const res = await fetch('/api/platform-rbac/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create permission');
  }
  return await res.json();
}

async function updatePermissionAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  const res = await fetch(`/api/platform-rbac/permissions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update permission');
  }
  return await res.json();
}

async function deletePermissionAction(id: string) {
  const res = await fetch(`/api/platform-rbac/permissions/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete permission');
  }
}

export default function PlatformPermissionsPage() {
  const { isPlatform } = usePlatform();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  
  // Create dialog states
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Edit dialog states
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  
  const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/platform-rbac/permissions');
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }
        const data = await response.json();
        setPermissions(data);
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
    
    startTransition(async () => {
      try {
        const newPermission = await createPermissionAction(formData);
        toastNotify({
          variant: 'success',
          title: 'Permission created successfully',
        });
        setCreateDialogOpen(false);
        setPermissions([...permissions, newPermission]);
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPermission) return;
    
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        const updatedPermission = await updatePermissionAction(editingPermission.id, formData);
        toastNotify({
          variant: 'success',
          title: 'Permission updated successfully',
        });
        setEditDialogOpen(false);
        setEditingPermission(null);
        setPermissions(permissions.map(p => p.id === editingPermission.id ? updatedPermission : p));
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDelete = (permission: Permission) => {
    const roleCount = permission._count?.rolePermissions || 0;
    confirm({
      title: 'Delete Permission?',
      description: `Are you sure you want to delete "${permission.name}"? ${
        roleCount > 0 
          ? `This permission is currently assigned to ${roleCount} role${roleCount > 1 ? 's' : ''} and will be removed from them.` 
          : 'This action cannot be undone.'
      }`,
      confirmLabel: 'Delete',
      variant: 'critical',
      onConfirm: async () => {
        setDeletingPermissionId(permission.id);
        try {
          await deletePermissionAction(permission.id);
          toastNotify({
            variant: 'success',
            title: 'Permission deleted successfully',
          });
          setPermissions(permissions.filter(p => p.id !== permission.id));
        } catch (err: unknown) {
          toastNotify({
            variant: 'error',
            title: 'Delete failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
        } finally {
          setDeletingPermissionId(null);
        }
      },
    });
  };

  const handleCreateDialogOpening = (open: boolean) => {
    if (open) {
      setCreateError(null);
    }
    setCreateDialogOpen(open);
  };

  const handleEditDialogOpening = (open: boolean) => {
    if (!open) {
      setEditingPermission(null);
      setEditError(null);
    }
    setEditDialogOpen(open);
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Define and manage system permissions for role-based access control
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpening}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Permission</DialogTitle>
                <DialogDescription>
                  Define a new permission that can be assigned to roles.
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
                    placeholder="e.g., user.create"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right pt-2">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    className="col-span-3"
                    placeholder="Describe what this permission allows..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner size="sm" /> : 'Create Permission'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions Grid */}
      <div className="grid gap-4">
        {permissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No permissions found</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first permission</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Permission
              </Button>
            </CardContent>
          </Card>
        ) : (
      <Card>
        <CardHeader>
              <CardTitle>All Permissions ({permissions.length})</CardTitle>
              <CardDescription>
                System permissions available for role assignment
              </CardDescription>
        </CardHeader>
        <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Permission</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="text-left py-3 px-4 font-medium">Usage</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission, index) => (
                      <tr
                        key={permission.id}
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? 'bg-muted/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Key className="h-5 w-5 text-primary" />
                            </div>
                <div>
                              <div className="font-medium font-mono text-sm">{permission.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {permission.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-muted-foreground max-w-xs">
                            {permission.description}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {permission._count?.rolePermissions || 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {(permission._count?.rolePermissions || 0) === 1 ? 'role' : 'roles'}
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
                              onClick={() => handleEdit(permission)}
                              className="h-8"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(permission)}
                              disabled={deletingPermissionId === permission.id}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              {deletingPermissionId === permission.id ? (
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
              <DialogDescription>
                Update the permission name and description.
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
                  defaultValue={editingPermission?.name || ''}
                  placeholder="e.g., user.create"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  className="col-span-3"
                  defaultValue={editingPermission?.description || ''}
                  placeholder="Describe what this permission allows..."
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Update Permission'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 