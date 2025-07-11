'use client';

import React, { useState, useEffect } from 'react';
import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { registerModule } from '@/shared/modules/module-registry';
import { TenantsConfig } from './tenants.config';
import { TenantCreationForm } from '@/components/features/tenant-management/TenantCreationForm';
import { SecureLoginModal } from '@/components/features/tenant-management/SecureLoginModal';
import { ImpersonationModal } from '@/components/features/tenant-management/ImpersonationModal';
import EditTenantDialog from '@/components/features/tenant-management/EditTenantDialog';
import type { PlatformTenantAccessOption } from '@/shared/types/platform.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBrowserApi } from '@/hooks/useBrowserApi';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

// 🚀 EARLY REGISTRATION: Register BEFORE component definition to ensure it's available immediately
registerModule({
  name: 'tenants',
  title: 'Tenants',
  description: 'Manage tenant organizations',
  config: TenantsConfig
});

export default function TenantsPage() {
  const { user } = useAuth();
  const userId = user?.id || '';

  // WebSocket integration for real-time updates
  const { isConnected } = useBrowserApi({
    autoCleanup: true,
  });

  // WebSocket connection for automatic table refresh
  const { subscribe } = useWebSocket(userId);

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
  useEffect(() => {
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

    window.addEventListener('open-create-tenant-modal', handleCreateTenantModal);
    window.addEventListener('open-edit-tenant-dialog', handleEditTenantDialog as EventListener);
    window.addEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
    window.addEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);

    return () => {
      window.removeEventListener('open-create-tenant-modal', handleCreateTenantModal);
      window.removeEventListener('open-edit-tenant-dialog', handleEditTenantDialog as EventListener);
      window.removeEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
      window.removeEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);
    };
  }, []);

  // Auto-refresh table when operations complete
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribe('operation:complete', (event) => {
      // Refresh table when any operation completes
      if (event.data.operationType === 'tenant-creation' || event.data.operationType === 'tenant-update') {
        window.dispatchEvent(new CustomEvent('refresh-module-data', {
          detail: { moduleName: 'tenants' }
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, subscribe]);

  return (
    <div>
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
              // Just close the modal - table refresh happens automatically via WebSocket
              setCreateDialogOpen(false);
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