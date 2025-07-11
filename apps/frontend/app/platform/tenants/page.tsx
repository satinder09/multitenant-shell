'use client';

import React, { useState } from 'react';
import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { registerModule } from '@/shared/modules/module-registry';
import { TenantsConfig } from './tenants.config';
import { TenantCreationForm } from '@/components/features/tenant-management/TenantCreationForm';
import { SecureLoginModal } from '@/components/features/tenant-management/SecureLoginModal';
import { ImpersonationModal } from '@/components/features/tenant-management/ImpersonationModal';
import EditTenantDialog from '@/components/features/tenant-management/EditTenantDialog';
import type { PlatformTenantAccessOption } from '@/shared/types/platform.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOperationToasts } from '@/hooks/useOperationToasts';
import { useTableRefresh } from '@/hooks/useTableRefresh';
import { useAuth } from '@/context/AuthContext';

// 🚀 EARLY REGISTRATION: Register BEFORE component definition to ensure it's available immediately
registerModule({
  name: 'tenants',
  title: 'Tenants',
  description: 'Manage tenant organizations',
  config: TenantsConfig
});

export default function TenantsPage() {
  const { user } = useAuth();

  // WebSocket integration for real-time updates
  const { isConnected } = useOperationToasts(user?.id || '');
  

  
  // Auto-refresh table when tenant operations complete
  useTableRefresh(user?.id || '', 'tenants', () => {
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'tenants' }
    }));
  });

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [secureLoginModalOpen, setSecureLoginModalOpen] = useState(false);
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantAccessOption | null>(null);
  const [tenantToEdit, setTenantToEdit] = useState<any>(null);

  // Helper function to convert tenant data to access option format
  const tenantToAccessOption = (tenant: any): PlatformTenantAccessOption => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    subdomain: tenant.subdomain,
    canAccess: tenant.isActive,
    canImpersonate: tenant.isActive,
    accessLevel: 'admin' as const,
    lastAccessed: tenant.lastAccessed ? new Date(tenant.lastAccessed) : undefined
  });

  // Listen for custom events from actions
  React.useEffect(() => {
    const handleCreateTenantModal = () => {
      setCreateDialogOpen(true);
    };

    const handleEditTenantDialog = (event: CustomEvent) => {
      const tenant = event.detail.tenant;
      setTenantToEdit(tenant);
      setEditDialogOpen(true);
    };

    const handleSecureLoginModal = (event: CustomEvent) => {
      const tenant = event.detail.tenant;
      setSelectedTenant(tenantToAccessOption(tenant));
      setSecureLoginModalOpen(true);
    };

    const handleImpersonationModal = (event: CustomEvent) => {
      const tenant = event.detail.tenant;
      setSelectedTenant(tenantToAccessOption(tenant));
      setImpersonationModalOpen(true);
    };

    // Table refresh handler for live operations
    const handleTableRefresh = (event: CustomEvent) => {
      console.log('Table refresh triggered:', event.detail);
      // Trigger refresh for the ConfigDrivenModulePage
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    };

    window.addEventListener('open-create-tenant-modal', handleCreateTenantModal);
    window.addEventListener('open-edit-tenant-dialog', handleEditTenantDialog as EventListener);
    window.addEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
    window.addEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);
    window.addEventListener('table-refresh:tenants', handleTableRefresh as EventListener);

    return () => {
      window.removeEventListener('open-create-tenant-modal', handleCreateTenantModal);
      window.removeEventListener('open-edit-tenant-dialog', handleEditTenantDialog as EventListener);
      window.removeEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
      window.removeEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);
      window.removeEventListener('table-refresh:tenants', handleTableRefresh as EventListener);
    };
  }, []);

  return (
    <div>
      {/* WebSocket Connection Status */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        Real-time updates: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Main Config-Driven Module Page */}
      <ConfigDrivenModulePage 
        moduleName="tenants"
        config={TenantsConfig}
      />

      {/* Modal Components */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
          </DialogHeader>
          <TenantCreationForm 
            onSuccess={() => {
              // Close dialog after successful tenant creation
              setTimeout(() => {
                setCreateDialogOpen(false);
              }, 3000); // Wait 3 seconds for user to see success message
            }}
          />
        </DialogContent>
      </Dialog>

      <EditTenantDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tenant={tenantToEdit}
        onTenantUpdated={() => {
          setEditDialogOpen(false);
          setTenantToEdit(null);
          // Trigger refresh after tenant update
          window.dispatchEvent(new CustomEvent('refresh-module-data', {
            detail: { moduleName: 'tenants' }
          }));
        }}
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
            }}
          />
        </>
      )}
    </div>
  );
} 