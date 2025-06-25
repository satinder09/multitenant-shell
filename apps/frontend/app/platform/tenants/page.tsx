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
import { toastNotify } from '@/utils/ui/toastNotify';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/ui/dialogUtils';
import { AlertTriangle, MoreHorizontal, Plus, Building2, Calendar, LogIn, UserCheck, Power } from 'lucide-react';
import { StatusBadge } from '@/components/ui-kit/StatusBadge';
import { SecureLoginModal } from '@/components/SecureLoginModal';
import { ImpersonationModal } from '@/components/ImpersonationModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { AdvancedDataTable } from '@/components/ui-kit/AdvancedDataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [, setUpdatingTenantId] = useState<string | null>(null);
  
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

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'write': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Define columns for AdvancedDataTable (TanStack Table format)
  const columns: ColumnDef<EnhancedTenant>[] = [
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
      header: 'Name',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{tenant.name}</div>
              <div className="text-sm text-muted-foreground">
                {tenant.lastAccessed ? `Last accessed ${tenant.lastAccessed.toLocaleDateString()}` : 'Never accessed'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'subdomain',
      header: 'Subdomain',
      cell: ({ getValue }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">{getValue() as string}</code>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <StatusBadge
            status={tenant.isActive ? 'done' : 'pending'}
            text={tenant.isActive ? 'Active' : 'Inactive'}
            size="sm"
          />
        );
      },
    },
    {
      accessorKey: 'accessLevel',
      header: 'Access Level',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <Badge variant="outline" className={getAccessLevelColor(tenant.accessLevel)}>
            {tenant.accessLevel}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(tenant.createdAt).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {tenant.canAccess && (
                <DropdownMenuItem onClick={() => handleSecureLogin(tenant)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Secure Login
                </DropdownMenuItem>
              )}
              {tenant.canImpersonate && (
                <DropdownMenuItem onClick={() => handleImpersonate(tenant)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Impersonate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDeactivate(tenant)} className="text-destructive">
                <Power className="mr-2 h-4 w-4" />
                {tenant.isActive ? 'Deactivate' : 'Activate'} Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
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
    <div className="space-y-8">
      {/* Enhanced Page Header */}
      <SectionHeader
        title="Tenants"
        description="Manage your organization's tenants and access controls"
        count={tenants.length}
        size="lg"
        variant="bordered"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpening}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Tenant</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new tenant. A subdomain will be automatically generated.
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
                      placeholder="Enter tenant name"
                      required
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

      {/* Advanced Data Table for Tenants */}
      <AdvancedDataTable
        data={tenants}
        columns={columns}
        allowDrag={false}
      />

      {/* Modals */}
      {selectedTenant && (
        <SecureLoginModal
          open={showSecureLogin}
          tenant={{
            tenantId: selectedTenant.id,
            tenantName: selectedTenant.name,
            subdomain: selectedTenant.subdomain,
            canAccess: selectedTenant.canAccess,
            canImpersonate: selectedTenant.canImpersonate,
            accessLevel: selectedTenant.accessLevel,
            lastAccessed: selectedTenant.lastAccessed,
          }}
          onOpenChange={setShowSecureLogin}
        />
      )}
      {selectedTenant && (
        <ImpersonationModal
          open={showImpersonation}
          tenant={{
            tenantId: selectedTenant.id,
            tenantName: selectedTenant.name,
            subdomain: selectedTenant.subdomain,
            canAccess: selectedTenant.canAccess,
            canImpersonate: selectedTenant.canImpersonate,
            accessLevel: selectedTenant.accessLevel,
            lastAccessed: selectedTenant.lastAccessed,
          }}
          onOpenChange={setShowImpersonation}
          onSuccess={() => {
            setShowImpersonation(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
} 