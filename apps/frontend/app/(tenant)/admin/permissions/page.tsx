'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Key, Shield, AlertTriangle } from 'lucide-react';
import { toastNotify } from '@/utils/ui/toastNotify';
import { confirm, DialogOverlay } from '@/utils/ui/dialogUtils';
import { usePlatform } from '@/context/PlatformContext';

interface Permission {
  id: string;
  name: string;
  description?: string;
  _count: {
    rolePermissions: number;
  };
}

export default function AdminPermissionsPage() {
  const { isPlatform } = usePlatform();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isRootDomain, setIsRootDomain] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    // Check if we're on the root domain
    const hostname = window.location.hostname;
    const isRoot = hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.');
    setIsRootDomain(isRoot);
    
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/rbac/permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      } else {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes('tenant context')) {
          toastNotify({
            variant: 'error',
            title: 'Tenant Context Required',
            description: 'Permission management is only available within a specific tenant. Please access this page from a tenant subdomain (e.g., tenant1.localhost:3000).'
          });
        } else {
          toastNotify({
            variant: 'error',
            title: 'Failed to fetch permissions',
            description: errorData.message || 'Please try again later.'
          });
        }
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error fetching permissions',
        description: 'Network error occurred.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    try {
      const response = await fetch('/api/rbac/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toastNotify({
          variant: 'success',
          title: 'Permission created successfully',
          description: `Permission "${formData.name}" has been created.`
        });
        setCreateDialogOpen(false);
        setFormData({ name: '', description: '' });
        fetchPermissions();
      } else {
        const error = await response.json();
        toastNotify({
          variant: 'error',
          title: 'Failed to create permission',
          description: error.error || 'An unexpected error occurred.'
        });
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error creating permission',
        description: 'Network error occurred.'
      });
    }
  };

  const handleUpdatePermission = async () => {
    if (!selectedPermission) return;

    try {
      const response = await fetch(`/api/rbac/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toastNotify({
          variant: 'success',
          title: 'Permission updated successfully',
          description: `Permission "${formData.name}" has been updated.`
        });
        setEditDialogOpen(false);
        setSelectedPermission(null);
        setFormData({ name: '', description: '' });
        fetchPermissions();
      } else {
        const error = await response.json();
        toastNotify({
          variant: 'error',
          title: 'Failed to update permission',
          description: error.error || 'An unexpected error occurred.'
        });
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error updating permission',
        description: 'Network error occurred.'
      });
    }
  };

  const handleDeletePermission = async (permissionId: string, permissionName: string, roleCount: number) => {
    const hasRoles = roleCount > 0;
    const message = hasRoles 
      ? `This permission is assigned to ${roleCount} role(s). Deleting it will remove it from all roles. This action cannot be undone.`
      : 'This action cannot be undone.';

    confirm({
      title: 'Delete Permission',
      message: `Are you sure you want to delete "${permissionName}"? ${message}`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/rbac/permissions/${permissionId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            toastNotify({
              variant: 'success',
              title: 'Permission deleted successfully',
              description: `Permission "${permissionName}" has been deleted.`
            });
            fetchPermissions();
          } else {
            const error = await response.json();
            toastNotify({
              variant: 'error',
              title: 'Failed to delete permission',
              description: error.error || 'An unexpected error occurred.'
            });
          }
        } catch {
          toastNotify({
            variant: 'error',
            title: 'Error deleting permission',
            description: 'Network error occurred.'
          });
        }
      },
    });
  };

  const openEditDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description || '',
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ name: '', description: '' });
    setCreateDialogOpen(true);
  };

  if (isPlatform) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Context Required</h3>
          <p className="text-muted-foreground max-w-md">
            This page is only available in a tenant context. Please access it from a tenant subdomain.
          </p>
        </div>
      </div>
    );
  }

  if (isRootDomain) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Access Required</h3>
          <p className="text-muted-foreground max-w-md">
            Permission management requires tenant context. Please access from a tenant subdomain (e.g., tenant1.localhost:3000).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Manage system permissions and their role assignments.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Permission
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      ) : permissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No permissions found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Get started by creating your first permission to control access to different parts of your application.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Permission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>System Permissions</CardTitle>
            <CardDescription>
              Manage permissions that control access to different features and resources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Permission</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role Usage</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission, index) => (
                    <tr 
                      key={permission.id} 
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-muted/20' : 'bg-background'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {permission.name}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {permission.description || 'No description provided'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {permission._count?.rolePermissions || 0} roles
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        Recently created
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(permission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePermission(
                              permission.id, 
                              permission.name,
                              permission._count?.rolePermissions || 0
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission</DialogTitle>
            <DialogDescription>
              Add a new permission to control access to features and resources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Permission Name</Label>
              <Input
                id="name"
                placeholder="e.g., users.create, reports.view"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this permission allows..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePermission}>Create Permission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update the permission details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Permission Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., users.create, reports.view"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this permission allows..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermission}>Update Permission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogOverlay />
    </div>
  );
} 