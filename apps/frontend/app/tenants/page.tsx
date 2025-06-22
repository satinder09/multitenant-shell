'use client';

import { useState, useEffect, useTransition, FormEvent } from 'react';
import { Tenant } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/ui/dialogUtils';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';

// These server actions are defined in a separate file or could be here,
// but for clarity let's assume they are callable from the client.
// We will create client-side wrappers for them.

async function createTenantAction(formData: FormData) {
  const name = formData.get('name') as string;
  
  const res = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create tenant');
  }
}

async function updateTenantStatusAction(id: string, isActive: boolean) {
  const res = await fetch(`/api/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update tenant');
  }
  return await res.json();
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchTenants() {
      // Don't fetch if there's no user yet.
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/tenants');
        if (!res.ok) {
          throw new Error('Failed to fetch tenants data');
        }
        const data = await res.json();
        setTenants(data);
      } catch (err: any) {
        // NOTE: We don't show a toast here because the AuthProvider handles global errors.
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenants();
  }, [user]);

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    setUpdatingTenantId(id);
    try {
      const updatedTenant = await updateTenantStatusAction(id, !currentStatus);
      toastNotify({
        variant: 'success',
        title: `Tenant ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      setTenants(tenants.map(t => 
        t.id === id ? { ...t, isActive: updatedTenant.isActive } : t
      ));
    } catch (err: any) {
      toastNotify({
        variant: 'error',
        title: 'Update failed',
        description: err.message,
      });
    } finally {
      setUpdatingTenantId(null);
    }
  };
  
  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null); // Clear previous error
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createTenantAction(formData);
        toastNotify({
          variant: 'success',
          title: 'Tenant created successfully',
        });
        setCreateDialogOpen(false); // Close dialog on success
        // Ideally, we would re-fetch or optimistically update here
        window.location.reload(); 
      } catch (err: any) {
        setCreateError(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const handleDialogOpening = (open: boolean) => {
    if (open) {
      setCreateError(null); // Reset error when dialog opens
    }
    setCreateDialogOpen(open);
  }

  const handleDeactivate = (tenant: Tenant) => {
    confirm({
      title: 'Deactivate Tenant?',
      description: `Are you sure you want to deactivate ${tenant.name}? This will prevent all users from accessing the tenant, but will not delete any data.`,
      confirmLabel: 'Deactivate',
      variant: 'critical',
      onConfirm: () => handleStatusToggle(tenant.id, tenant.isActive),
    });
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'subdomain', header: 'Subdomain' },
    { 
      accessorKey: 'isActive', 
      header: 'Status',
      cell: ({ row }: any) => {
        const isActive = row.getValue('isActive');
        return <StatusBadge isActive={isActive} />;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }: any) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: any) => {
        const tenant = row.original;
        const isUpdating = updatingTenantId === tenant.id;

        return (
          <div className="text-right">
            {tenant.isActive ? (
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={isUpdating || isPending}
                onClick={() => handleDeactivate(tenant)}
              >
                {isUpdating ? <Spinner size="sm" /> : 'Deactivate'}
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                disabled={isUpdating || isPending}
                onClick={() => handleStatusToggle(tenant.id, tenant.isActive)}
              >
                {isUpdating ? <Spinner size="sm" /> : 'Activate'}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }
  
  if (error) {
     return <div className="min-h-screen flex items-center justify-center text-destructive">{error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpening}>
          <DialogTrigger asChild>
            <Button>Create Tenant</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>Enter the details for the new tenant.</DialogDescription>
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
                  <Input id="name" name="name" className="col-span-3" required />
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
      <DataTable columns={columns} data={tenants} />
    </div>
  );
} 