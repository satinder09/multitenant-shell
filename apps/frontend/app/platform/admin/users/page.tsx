'use client';

import React, { useState, useEffect, useTransition, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from 'lucide-react';
import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { registerModule } from '@/shared/modules/module-registry';
import { UsersConfig } from './users.config';
import { browserApi } from '@/shared/services/api-client';

// 🚀 EARLY REGISTRATION: Register BEFORE component definition
registerModule({
  name: 'admin-users',
  title: 'Platform Users',
  description: 'Manage platform admin users',
  config: UsersConfig
});

interface Role {
  id: string;
  name: string;
  description?: string;
}

const normalizeRoleName = (roleName: string) => {
  return roleName.toLowerCase().trim();
};

const getRoleIdByName = (roles: Role[], roleName: string) => {
  const normalized = normalizeRoleName(roleName);
  return roles.find(r => normalizeRoleName(r.name) === normalized)?.id || '';
};

const getRoleNameById = (roles: Role[], roleId: string) => {
  return roles.find(r => r.id === roleId)?.name || '';
};

async function createUserAction(formData: FormData, roles: Role[]) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const password = formData.get('password') as string;
  const role = getRoleNameById(roles, roleId);
  
  const res = await browserApi.post('/api/platform/admin/users', { 
    name, 
    email, 
    role, 
    password: password || undefined 
  });

  if (!res.success) {
    throw new Error(res.error || 'Failed to create user');
  }
}

async function updateUserAction(id: string, formData: FormData, roles: Role[]) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const role = getRoleNameById(roles, roleId);
  
  const res = await browserApi.patch(`/api/platform/admin/users/${id}`, { name, email, role });

  if (!res.success) {
    throw new Error(res.error || 'Failed to update user');
  }
  return res.data;
}

export default function PlatformUsersPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const rolesRes = await browserApi.get('/api/platform-rbac/roles');
        if (rolesRes.success) {
          setRoles(rolesRes.data as Role[]);
        } else {
          setRoles([
            { id: 'admin', name: 'Administrator', description: 'Full system access' },
            { id: 'user', name: 'User', description: 'Standard user access' },
            { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
          ]);
        }
      } catch (err) {
        setRoles([
          { id: 'admin', name: 'Administrator', description: 'Full system access' },
          { id: 'user', name: 'User', description: 'Standard user access' },
          { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
        ]);
      }
    }
    
    fetchRoles();
  }, []);

  useEffect(() => {
    const handleCreateUser = () => {
      setCreateError(null);
      setCreateDialogOpen(true);
    };

    const handleEditUser = (event: CustomEvent) => {
      setEditingUser(event.detail.user);
      setEditError(null);
      setEditDialogOpen(true);
    };

    window.addEventListener('open-create-user-modal', handleCreateUser);
    window.addEventListener('open-edit-user-modal', handleEditUser as EventListener);

    return () => {
      window.removeEventListener('open-create-user-modal', handleCreateUser);
      window.removeEventListener('open-edit-user-modal', handleEditUser as EventListener);
    };
  }, []);

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createUserAction(formData, roles);
        toastNotify({
          variant: 'success',
          title: 'User created successfully',
        });
        setCreateDialogOpen(false);
        window.dispatchEvent(new CustomEvent('refresh-module-data', {
          detail: { moduleName: 'users' }
        }));
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleEditSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await updateUserAction(editingUser.id, formData, roles);
        toastNotify({
          variant: 'success',
          title: 'User updated successfully',
        });
        setEditDialogOpen(false);
        window.dispatchEvent(new CustomEvent('refresh-module-data', {
          detail: { moduleName: 'users' }
        }));
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <ConfigDrivenModulePage
        moduleName="admin-users"
        config={UsersConfig}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Enter the details for the new user. A password will be auto-generated if not provided.
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
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" className="col-span-3" placeholder="Enter full name" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" name="email" type="email" className="col-span-3" placeholder="user@example.com" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select name="role" defaultValue={roles[0]?.id || ''}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input id="password" name="password" type="password" className="col-span-3" placeholder="Leave empty for auto-generated" />
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

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information.
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
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" name="name" className="col-span-3" defaultValue={editingUser?.name || ''} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                <Input id="edit-email" name="email" type="email" className="col-span-3" defaultValue={editingUser?.email || ''} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Role</Label>
                <Select name="role" defaultValue={editingUser ? getRoleIdByName(roles, editingUser.role) : (roles[0]?.id || '')}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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