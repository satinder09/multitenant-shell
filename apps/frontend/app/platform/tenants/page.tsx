'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Filter, X } from 'lucide-react';
import TenantList from './components/TenantList';
import TenantFilters from './components/TenantFilters';
import CreateTenantDialog from './components/CreateTenantDialog';
import { SecureLoginModal } from './components/SecureLoginModal';
import { ImpersonationModal } from './components/ImpersonationModal';
import useFetchTenants from './hooks/useFetchTenants';
import { updateTenantStatusAction, tenantToAccessOption } from './utils/tenantHelpers';
import type { TenantModel, TenantAccessOption } from './types';

export default function TenantsPage() {
  // Hook for fetching tenants with server-side pagination
  const {
    data: tenants,
    isLoading,
    error,
    pagination,
    queryParams,
    setPage,
    setLimit,
    setFilters,
    setSort,
    refetch,
    resetFilters,
  } = useFetchTenants();

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [secureLoginModalOpen, setSecureLoginModalOpen] = useState(false);
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantAccessOption | null>(null);

  // Handlers
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateTenantStatusAction(id, !currentStatus);
      refetch(); // Refresh the data
    } catch (error) {
      console.error('Failed to toggle tenant status:', error);
    }
  };

  const handleSecureLogin = (tenant: TenantModel) => {
    setSelectedTenant(tenantToAccessOption(tenant));
    setSecureLoginModalOpen(true);
  };

  const handleImpersonate = (tenant: TenantModel) => {
    setSelectedTenant(tenantToAccessOption(tenant));
    setImpersonationModalOpen(true);
  };

  const handleTenantCreated = () => {
    refetch(); // Refresh the data
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  const handleBulkActivate = async (tenantIds: string[]) => {
    try {
      await Promise.all(tenantIds.map(id => updateTenantStatusAction(id, true)));
      refetch(); // Refresh the data
    } catch (error) {
      console.error('Failed to activate tenants:', error);
    }
  };

  const handleBulkDeactivate = async (tenantIds: string[]) => {
    try {
      await Promise.all(tenantIds.map(id => updateTenantStatusAction(id, false)));
      refetch(); // Refresh the data
    } catch (error) {
      console.error('Failed to deactivate tenants:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          <p>Error loading tenants: {error}</p>
          <Button onClick={refetch} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SectionHeader
        title="Tenant Management"
        description="Manage tenants, access permissions, and platform settings"
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-muted' : ''}
            >
              {showFilters ? <X className="mr-2 h-4 w-4" /> : <Filter className="mr-2 h-4 w-4" />}
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Settings className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
              Add Tenant
              </Button>
                </div>
        }
      />

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 shrink-0">
            <TenantFilters
              filters={queryParams.filters || { search: '', status: 'all', accessLevel: 'all' }}
              onFiltersChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <TenantList
        data={tenants}
            isLoading={isLoading}
            pagination={pagination || undefined}
            onToggleStatus={handleToggleStatus}
            onImpersonate={handleImpersonate}
            onSecureLogin={handleSecureLogin}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onSortChange={setSort}
            onBulkActivate={handleBulkActivate}
            onBulkDeactivate={handleBulkDeactivate}
            searchPlaceholder="Search tenants..."
            emptyMessage="No tenants found. Create your first tenant to get started."
            allowExport={true}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTenantCreated={handleTenantCreated}
      />

      {selectedTenant && (
        <>
        <SecureLoginModal
            tenant={selectedTenant}
            open={secureLoginModalOpen}
            onOpenChange={setSecureLoginModalOpen}
          />
        <ImpersonationModal
            tenant={selectedTenant}
            open={impersonationModalOpen}
            onOpenChange={setImpersonationModalOpen}
          onSuccess={() => {
              setImpersonationModalOpen(false);
              // Could add success notification here
          }}
        />
        </>
      )}
    </div>
  );
} 