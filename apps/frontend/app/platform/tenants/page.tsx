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
import { AlertTriangle, Shield, UserCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';
import { SecureLoginModal } from '@/components/SecureLoginModal';
import { ImpersonationModal } from '@/components/ImpersonationModal';

// Enhanced Tenant interface that combines both data structures
interface EnhancedTenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  // Access control properties
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

// Server actions
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

export default function PlatformTenantsPage() {
  const { isPlatform, tenantSubdomain } = usePlatform();
  const [tenants, setTenants] = useState<EnhancedTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);
  
  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<EnhancedTenant | null>(null);
  const [showSecureLogin, setShowSecureLogin] = useState(false);
  const [showImpersonation, setShowImpersonation] = useState(false);

  console.log('[PlatformTenantsPage] Rendering with state:', { isPlatform, tenantSubdomain });

  // Fetch initial data - combine both tenants and access options
  useEffect(() => {
    async function fetchTenantsData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        // Fetch both tenants list and access options in parallel
        const [tenantsRes, accessRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/tenant-access', { credentials: 'include' })
        ]);
        
        if (!tenantsRes.ok) {
          throw new Error('Failed to fetch tenants data');
        }
        
        const tenantsData = await tenantsRes.json();
        let accessData = [];
        
        if (accessRes.ok) {
          accessData = await accessRes.json();
        }
        
        // Merge the data
        const enhancedTenants: EnhancedTenant[] = tenantsData.map((tenant: Omit<EnhancedTenant, 'canAccess' | 'canImpersonate' | 'accessLevel' | 'lastAccessed'>) => {
          const accessInfo = accessData.find((access: { tenantId: string; canAccess: boolean; canImpersonate: boolean; accessLevel: string; lastAccessed?: string }) => access.tenantId === tenant.id);
          return {
            ...tenant,
            canAccess: accessInfo?.canAccess || false,
            canImpersonate: accessInfo?.canImpersonate || false,
            accessLevel: accessInfo?.accessLevel || 'read',
            lastAccessed: accessInfo?.lastAccessed ? new Date(accessInfo.lastAccessed) : undefined,
          };
        });
        
        setTenants(enhancedTenants);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenantsData();
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
    } catch (err: unknown) {
      toastNotify({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setUpdatingTenantId(null);
    }
  };
  
  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createTenantAction(formData);
        toastNotify({
          variant: 'success',
          title: 'Tenant created successfully',
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

  const handleDeactivate = (tenant: EnhancedTenant) => {
    confirm({
      title: 'Deactivate Tenant?',
      description: `Are you sure you want to deactivate ${tenant.name}? This will prevent all users from accessing the tenant, but will not delete any data.`,
      confirmLabel: 'Deactivate',
      variant: 'critical',
      onConfirm: () => handleStatusToggle(tenant.id, tenant.isActive),
    });
  };

  const handleSecureLogin = (tenant: EnhancedTenant) => {
    setSelectedTenant(tenant);
    setShowSecureLogin(true);
  };

  const handleImpersonate = (tenant: EnhancedTenant) => {
    setSelectedTenant(tenant);
    setShowImpersonation(true);
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'subdomain', header: 'Subdomain' },
    { 
      accessorKey: 'isActive', 
      header: 'Status',
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: EnhancedTenant } }) => {
        const isActive = row.getValue('isActive') as boolean;
        return <StatusBadge isActive={isActive} />;
      },
    },
    {
      accessorKey: 'accessLevel',
      header: 'Access Level',
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: EnhancedTenant } }) => {
        const level = row.getValue('accessLevel') as string;
        const getAccessLevelColor = (level: string) => {
          switch (level) {
            case 'admin':
              return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'write':
              return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'read':
              return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            default:
              return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
          }
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(level)}`}>
            {level}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: EnhancedTenant } }) => 
        new Date(row.getValue('createdAt') as string).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: { row: { getValue: (key: string) => unknown; original: EnhancedTenant } }) => {
        const tenant = row.original;
        const isUpdating = updatingTenantId === tenant.id;

        return (
          <div className="text-right space-x-2">
            {tenant.canAccess && (
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isUpdating || isPending}
                onClick={() => handleSecureLogin(tenant)}
              >
                <Shield className="w-4 h-4 mr-1" />
                Secure Login
              </Button>
            )}
            
            {tenant.canImpersonate && (
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={isUpdating || isPending}
                onClick={() => handleImpersonate(tenant)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Impersonate
              </Button>
            )}
            
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

  if (!isPlatform) {
    console.log('[PlatformTenantsPage] Not platform context, showing error');
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

      {/* Modals */}
      {selectedTenant && (
        <>
          <SecureLoginModal
            tenant={{
              tenantId: selectedTenant.id,
              tenantName: selectedTenant.name,
              subdomain: selectedTenant.subdomain,
              canAccess: selectedTenant.canAccess,
              canImpersonate: selectedTenant.canImpersonate,
              accessLevel: selectedTenant.accessLevel,
              lastAccessed: selectedTenant.lastAccessed,
            }}
            open={showSecureLogin}
            onOpenChange={setShowSecureLogin}
          />
          
          <ImpersonationModal
            tenant={{
              tenantId: selectedTenant.id,
              tenantName: selectedTenant.name,
              subdomain: selectedTenant.subdomain,
              canAccess: selectedTenant.canAccess,
              canImpersonate: selectedTenant.canImpersonate,
              accessLevel: selectedTenant.accessLevel,
              lastAccessed: selectedTenant.lastAccessed,
            }}
            open={showImpersonation}
            onOpenChange={setShowImpersonation}
            onSuccess={() => {
              setShowImpersonation(false);
              setSelectedTenant(null);
            }}
          />
        </>
      )}
    </div>
  );
} 