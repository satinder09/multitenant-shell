'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    return <div className="text-red-500 p-4">This page is only available in a tenant context.</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading roles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {isRootDomain && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Tenant Context Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Role and permission management is only available within a specific tenant context. 
                  To manage roles and permissions, please access this page from a tenant subdomain 
                  (e.g., <code className="bg-yellow-100 px-1 rounded">tenant1.localhost:3000</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and their permissions</p>
        </div>
        <Button onClick={openCreateDialog} disabled={isRootDomain}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(Array.isArray(roles) ? roles : []).length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {isRootDomain ? 'No Roles Available' : 'No Roles Found'}
            </h3>
            <p className="text-muted-foreground">
              {isRootDomain 
                ? 'Roles are only available within a tenant context. Please access this page from a tenant subdomain.'
                : 'No roles have been created yet. Create your first role to get started.'
              }
            </p>
          </div>
        ) : (
          (Array.isArray(roles) ? roles : []).map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      {role.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {role.userRoles.length} users assigned
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                      disabled={isRootDomain}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id, role.name)}
                      disabled={isRootDomain}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {role.rolePermissions.map((rp) => (
                        <Badge key={rp.permission.id} variant="secondary">
                          {rp.permission.name}
                        </Badge>
                      ))}
                      {role.rolePermissions.length === 0 && (
                        <span className="text-sm text-muted-foreground">No permissions</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assigned Users</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {role.userRoles.slice(0, 3).map((ur) => (
                        <Badge key={ur.user.id} variant="outline">
                          {ur.user.name || ur.user.email}
                        </Badge>
                      ))}
                      {role.userRoles.length > 3 && (
                        <Badge variant="outline">
                          +{role.userRoles.length - 3} more
                        </Badge>
                      )}
                      {role.userRoles.length === 0 && (
                        <span className="text-sm text-muted-foreground">No users assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.permissionIds.includes(value)) {
                    setFormData({
                      ...formData,
                      permissionIds: [...formData.permissionIds, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  {safePermissions.map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      {permission.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.permissionIds.map((permissionId) => {
                  const permission = safePermissions.find(p => p.id === permissionId);
                  return (
                    <Badge
                      key={permissionId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          permissionIds: formData.permissionIds.filter(id => id !== permissionId),
                        });
                      }}
                    >
                      {permission?.name} ×
                    </Badge>
                  );
                })}
              </div>
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
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.permissionIds.includes(value)) {
                    setFormData({
                      ...formData,
                      permissionIds: [...formData.permissionIds, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  {safePermissions.map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      {permission.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.permissionIds.map((permissionId) => {
                  const permission = safePermissions.find(p => p.id === permissionId);
                  return (
                    <Badge
                      key={permissionId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          permissionIds: formData.permissionIds.filter(id => id !== permissionId),
                        });
                      }}
                    >
                      {permission?.name} ×
                    </Badge>
                  );
                })}
              </div>
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