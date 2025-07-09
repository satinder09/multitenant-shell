'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, Key, Users, Edit, Trash, Settings } from 'lucide-react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { confirm } from '@/shared/utils/ui/dialogUtils';
import { RoleModalManager } from '@/components/features/role-management/RoleModalManager';
import { browserApi } from '@/shared/services/api-client';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  rolePermissions: Array<{ permission: Permission }>;
  userRoles: Array<{ user: User }>;
}

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadRole(params.id as string);
    }
  }, [params.id]);

  const loadRole = async (roleId: string) => {
    setIsLoading(true);
    try {
      const response = await browserApi.get(`/api/platform-rbac/roles/${roleId}`);
      if (response.success) {
        setRole(response.data as Role);
      } else {
        toastNotify({ variant: 'error', title: 'Failed to load role' });
        router.push('/platform/admin/roles');
      }
    } catch (error) {
      console.error('Error loading role:', error);
      toastNotify({ variant: 'error', title: 'Failed to load role' });
      router.push('/platform/admin/roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    window.dispatchEvent(new CustomEvent('open-edit-role-modal', {
      detail: { role }
    }));
  };

  const handleManagePermissions = () => {
    window.dispatchEvent(new CustomEvent('open-role-permissions-modal', {
      detail: { role }
    }));
  };

  const handleDelete = () => {
    if (!role) return;
    
    confirm({
      variant: 'critical',
      title: 'Delete Role',
      description: `Are you sure you want to delete role "${role.name}"? This action cannot be undone.`,
      onConfirm: deleteRole,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
  };

  const deleteRole = async () => {
    if (!role) return;

    try {
      const response = await browserApi.delete(`/api/platform-rbac/roles/${role.id}`);

      if (response.success) {
        toastNotify({ variant: 'success', title: 'Role deleted successfully' });
        router.push('/platform/admin/roles');
      } else {
        toastNotify({ variant: 'error', title: 'Failed to delete role' });
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toastNotify({ variant: 'error', title: 'Failed to delete role' });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading role details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Role Not Found</h1>
          <p className="text-muted-foreground mt-2">The requested role could not be found.</p>
          <Button onClick={() => router.push('/platform/admin/roles')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  const permissions = role.rolePermissions?.map(rp => rp.permission) || [];
  const users = role.userRoles?.map(ur => ur.user) || [];

  return (
    <>
      <RoleModalManager />
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/platform/admin/roles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {role.name}
            </h1>
            <p className="text-muted-foreground">Platform Role Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Role
          </Button>
          <Button variant="outline" onClick={handleManagePermissions}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Permissions
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash className="h-4 w-4 mr-2" />
            Delete Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-lg font-semibold">{role.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-lg">Platform Role</p>
              </div>
            </div>
            
            {role.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{role.description}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{new Date(role.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{new Date(role.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissions.length}</div>
              <p className="text-xs text-muted-foreground">
                {permissions.length === 1 ? 'permission' : 'permissions'} assigned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {users.length === 1 ? 'user has' : 'users have'} this role
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Permissions ({permissions.length})
            </CardTitle>
            <CardDescription>
              Permissions granted by this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissions.length > 0 ? (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{permission.name}</h4>
                      {permission.description && (
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No permissions assigned</p>
                <Button variant="outline" size="sm" onClick={handleManagePermissions} className="mt-2">
                  Add Permissions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Users ({users.length})
            </CardTitle>
            <CardDescription>
              Users who have been assigned this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{user.name || user.email}</h4>
                      {user.name && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users assigned</p>
                <p className="text-sm">Users can be assigned this role through user management</p>
              </div>
            )}
          </CardContent>
                 </Card>
       </div>
     </div>
    </>
   );
 } 