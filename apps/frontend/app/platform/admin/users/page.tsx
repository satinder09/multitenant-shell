'use client';

import { useState, useEffect, useTransition, FormEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toastNotify } from '@/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { confirm } from '@/utils/ui/dialogUtils';
import { AlertTriangle, MoreHorizontal, Power, Plus, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { AdvancedDataTable } from '@/components/ui-kit/AdvancedDataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string; // Changed to accept any string since we're using database roles
  isActive: boolean;
  createdAt: string;
  lastLogin?: Date;
  tenantCount: number;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

// Helper function to normalize role names for matching
const normalizeRoleName = (roleName: string) => {
  return roleName.toLowerCase().trim();
};

// Helper: get role ID from user role name
const getRoleIdByName = (roles: Role[], roleName: string) => {
  const normalized = normalizeRoleName(roleName);
  return roles.find(r => normalizeRoleName(r.name) === normalized)?.id || '';
};

// Helper: get role name from ID
const getRoleNameById = (roles: Role[], roleId: string) => {
  return roles.find(r => r.id === roleId)?.name || '';
};

// Server actions
async function createUserAction(formData: FormData, roles: Role[]) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const password = formData.get('password') as string;
  const role = getRoleNameById(roles, roleId);
  const res = await fetch('/api/platform/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role, password: password || undefined }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create user');
  }
}

async function updateUserAction(id: string, formData: FormData, roles: Role[]) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const roleId = formData.get('role') as string;
  const role = getRoleNameById(roles, roleId);
  
  const res = await fetch(`/api/platform/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update user');
  }
  return await res.json();
}

async function updateUserStatusAction(id: string, isActive: boolean) {
  const res = await fetch(`/api/platform/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update user');
  }
  return await res.json();
}

async function deleteUserAction(id: string) {
  const res = await fetch(`/api/platform/admin/users/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete user');
  }
}

export default function PlatformUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [, setUpdatingUserId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to find the display name for a role
  const getRoleDisplayName = (userRole: string) => {
    const normalizedUserRole = normalizeRoleName(userRole);
    const matchingRole = roles.find(role => 
      normalizeRoleName(role.name) === normalizedUserRole
    );
    return matchingRole?.name || userRole;
  };

  // Fetch initial data
  useEffect(() => {
    // Create a new AbortController for this fetch
    abortControllerRef.current = new AbortController();

    async function fetchData() {
      try {
        // Fetch both users and roles in parallel
        const [usersRes, rolesRes] = await Promise.all([
          fetch('/api/platform/admin/users', {
            signal: abortControllerRef.current?.signal
          }),
          fetch('/api/platform-rbac/roles', {
            signal: abortControllerRef.current?.signal
          })
        ]);
        
        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        // If users request fails with 401, it means user is not authenticated
        if (usersRes.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        
        if (!usersRes.ok) {
          const errorData = await usersRes.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to fetch users data');
        }
        
        const usersData = await usersRes.json();
        setUsers(usersData);

        // Roles are optional, don't fail if they can't be fetched
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        } else {
          // Fallback to default roles if API fails
          setRoles([
            { id: 'admin', name: 'Administrator', description: 'Full system access' },
            { id: 'user', name: 'User', description: 'Standard user access' },
            { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
          ]);
        }
      } catch (err: unknown) {
        // Don't set error if request was aborted (user logged out)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();

    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    setUpdatingUserId(id);
    try {
      const updatedUser = await updateUserStatusAction(id, !currentStatus);
      toastNotify({
        variant: 'success',
        title: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      setUsers(users.map(u => 
        u.id === id ? { ...u, isActive: updatedUser.isActive } : u
      ));
    } catch (err: unknown) {
      toastNotify({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };
  
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
        window.location.reload(); 
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDialogOpening = (open: boolean) => {
    if (open) {
      setCreateError(null);
    }
    setCreateDialogOpen(open);
  };

  const handleEdit = (user: PlatformUser) => {
    setEditingUser(user);
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleEditDialogOpening = (open: boolean) => {
    if (open) {
      setEditError(null);
    } else {
      setEditingUser(null);
    }
    setEditDialogOpen(open);
  };

  const handleEditSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        const updatedUser = await updateUserAction(editingUser.id, formData, roles);
        toastNotify({
          variant: 'success',
          title: 'User updated successfully',
        });
        setEditDialogOpen(false);
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDeactivate = (user: PlatformUser) => {
    confirm({
      title: `${user.isActive ? 'Deactivate' : 'Activate'} User?`,
      description: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.name}?`,
      confirmLabel: user.isActive ? 'Deactivate' : 'Activate',
      variant: user.isActive ? 'critical' : 'default',
      onConfirm: () => handleStatusToggle(user.id, user.isActive),
    });
  };

  const handleDelete = (user: PlatformUser) => {
    confirm({
      title: 'Delete User?',
      description: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'critical',
      onConfirm: async () => {
        try {
          await deleteUserAction(user.id);
          setUsers(users.filter(u => u.id !== user.id));
          toastNotify({
            variant: 'success',
            title: 'User deleted successfully',
          });
        } catch (err: unknown) {
          toastNotify({
            variant: 'error',
            title: 'Delete failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      },
    });
  };

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase();
    switch (lowerRole) {
      case 'super admin':
      case 'administrator': 
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      case 'support staff':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
      case 'billing manager':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'read-only auditor':
      case 'viewer':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  // Define columns for AdvancedDataTable (TanStack Table format)
  const columns: ColumnDef<PlatformUser>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge className={getRoleColor(user.role)}>
            {getRoleDisplayName(user.role)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <StatusBadge
            status={user.isActive ? 'done' : 'pending'}
            text={user.isActive ? 'Active' : 'Inactive'}
            size="sm"
          />
        );
      },
    },
    {
      accessorKey: 'tenantCount',
      header: 'Tenants',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <span className="font-mono text-sm">{user.tenantCount}</span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(user.createdAt).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeactivate(user)}>
                <Power className="mr-2 h-4 w-4" />
                {user.isActive ? 'Deactivate' : 'Activate'} User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }
  
  if (error) {
     return <div className="min-h-screen flex items-center justify-center text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Page Header */}
      <SectionHeader
        title="Platform Users"
        description="Manage platform-level user accounts and permissions"
        count={users.length}
        size="lg"
        variant="bordered"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpening}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
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
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      className="col-span-3"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="col-span-3"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
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
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      className="col-span-3"
                      placeholder="Leave empty for auto-generated"
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
        }
      />

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpening}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information. Leave password empty to keep current password.
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
                  placeholder="Enter full name"
                  defaultValue={editingUser?.name || ''}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  placeholder="user@example.com"
                  defaultValue={editingUser?.email || ''}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
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

    
      
      <AdvancedDataTable
        data={users}
        columns={columns}
        allowDrag={false}
      />
    </div>
  );
} 