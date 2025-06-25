'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ComboBoxTags from '@/components/ui-kit/ComboBoxTags';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { toastNotify } from '@/utils/ui/toastNotify';
import { confirm, DialogOverlay } from '@/utils/ui/dialogUtils';
import { usePlatform } from '@/context/PlatformContext';

interface Role {
  id: string;
  name: string;
  rolePermissions: Array<{
    permission: {
      id: string;
      name: string;
    };
  }>;
  userRoles: Array<{
    user: {
      id: string;
      email: string;
      name: string;
    };
  }>;
}

interface Permission {
  id: string;
  name: string;
}

export default function AdminRolesPage() {
  const { isPlatform } = usePlatform();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRootDomain, setIsRootDomain] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    permissionIds: [] as string[],
  });

  useEffect(() => {
    // Check if we're on the root domain
    const hostname = window.location.hostname;
    const isRoot = hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.');
    setIsRootDomain(isRoot);
    
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/rbac/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes('tenant context')) {
          toastNotify({
            variant: 'error',
            title: 'Tenant Context Required',
            description: 'Role management is only available within a specific tenant. Please access this page from a tenant subdomain (e.g., tenant1.localhost:3000).'
          });
        } else {
          toastNotify({
            variant: 'error',
            title: 'Failed to fetch roles',
            description: errorData.message || 'Please try again later.'
          });
        }
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error fetching roles',
        description: 'Network error occurred.'
      });
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toastNotify({
          variant: 'success',
          title: 'Role created successfully',
          description: `Role "${formData.name}" has been created.`
        });
        setCreateDialogOpen(false);
        setFormData({ name: '', permissionIds: [] });
        fetchRoles();
      } else {
        const error = await response.json();
        toastNotify({
          variant: 'error',
          title: 'Failed to create role',
          description: error.error || 'An unexpected error occurred.'
        });
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error creating role',
        description: 'Network error occurred.'
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toastNotify({
          variant: 'success',
          title: 'Role updated successfully',
          description: `Role "${formData.name}" has been updated.`
        });
        setEditDialogOpen(false);
        setSelectedRole(null);
        setFormData({ name: '', permissionIds: [] });
        fetchRoles();
      } else {
        const error = await response.json();
        toastNotify({
          variant: 'error',
          title: 'Failed to update role',
          description: error.error || 'An unexpected error occurred.'
        });
      }
    } catch {
      toastNotify({
        variant: 'error',
        title: 'Error updating role',
        description: 'Network error occurred.'
      });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    confirm({
      title: 'Delete Role',
      description: `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'critical',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/rbac/roles/${roleId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            toastNotify({
              variant: 'success',
              title: 'Role deleted successfully',
              description: `Role "${roleName}" has been deleted.`
            });
            fetchRoles();
          } else {
            const error = await response.json();
            toastNotify({
              variant: 'error',
              title: 'Failed to delete role',
              description: error.error || 'An unexpected error occurred.'
            });
          }
        } catch {
          toastNotify({
            variant: 'error',
            title: 'Error deleting role',
            description: 'Network error occurred.'
          });
        }
      }
    });
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      permissionIds: role.rolePermissions.map(rp => rp.permission.id),
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ name: '', permissionIds: [] });
    setCreateDialogOpen(true);
  };

  const safePermissions = Array.isArray(permissions) ? permissions : [];

  if (isPlatform) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
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
            Role management requires tenant context. Please access from a tenant subdomain (e.g., tenant1.localhost:3000).
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
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage roles and assign permissions to control user access.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading roles...</p>
          </div>
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No roles found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Get started by creating your first role to organize user permissions effectively.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              Manage roles and their permission assignments for your tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Permissions</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Users</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr 
                      key={role.id} 
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-muted/20' : 'bg-background'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {role.rolePermissions.slice(0, 3).map((rp) => (
                            <Badge key={rp.permission.id} variant="secondary" className="text-xs">
                              {rp.permission.name}
                            </Badge>
                          ))}
                          {role.rolePermissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.rolePermissions.length - 3} more
                            </Badge>
                          )}
                          {role.rolePermissions.length === 0 && (
                            <span className="text-sm text-muted-foreground">No permissions</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {role.userRoles.length} users
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
                            onClick={() => openEditDialog(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id, role.name)}
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



      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new role and assign permissions to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <ComboBoxTags
                placeholder="Select permissions..."
                options={safePermissions.map(permission => ({
                  value: permission.id,
                  label: permission.name,
                  description: `Permission: ${permission.name}`
                }))}
                selected={formData.permissionIds}
                onChange={(selectedIds) => {
                  setFormData({
                    ...formData,
                    permissionIds: selectedIds,
                  });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!formData.name.trim()}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <ComboBoxTags
                placeholder="Select permissions..."
                options={safePermissions.map(permission => ({
                  value: permission.id,
                  label: permission.name,
                  description: `Permission: ${permission.name}`
                }))}
                selected={formData.permissionIds}
                onChange={(selectedIds) => {
                  setFormData({
                    ...formData,
                    permissionIds: selectedIds,
                  });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={!formData.name.trim()}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogOverlay />
    </div>
  );
} 