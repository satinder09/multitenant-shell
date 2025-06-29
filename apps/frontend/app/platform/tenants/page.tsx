'use client';

import React, { useState } from 'react';
import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import CreateTenantDialog from './components/CreateTenantDialog';
import { SecureLoginModal } from './components/SecureLoginModal';
import { ImpersonationModal } from './components/ImpersonationModal';
import type { TenantAccessOption } from './types';

export default function TenantsPage() {
  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [secureLoginModalOpen, setSecureLoginModalOpen] = useState(false);
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantAccessOption | null>(null);

  // Helper function to convert tenant data to access option format
  const tenantToAccessOption = (tenant: any): TenantAccessOption => ({
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
    window.addEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
    window.addEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);

    return () => {
      window.removeEventListener('open-create-tenant-modal', handleCreateTenantModal);
      window.removeEventListener('open-secure-login-modal', handleSecureLoginModal as EventListener);
      window.removeEventListener('open-impersonation-modal', handleImpersonationModal as EventListener);
    };
  }, []);

  return (
    <div>
      {/* Main Config-Driven Module Page */}
      <ConfigDrivenModulePage 
        moduleName="tenants"
      />

      {/* Modal Components */}
      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTenantCreated={() => {
          setCreateDialogOpen(false);
          // Trigger refresh after tenant creation
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