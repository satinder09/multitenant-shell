'use client';

import React, { useState, useEffect } from 'react';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import { ManagePermissionsModal } from './ManagePermissionsModal';

interface Role {
  id: string;
  name: string;
  description?: string;
  rolePermissions?: Array<{ permission: { id: string; name: string } }>;
  userRoles?: Array<{ user: { email: string } }>;
}

export const RoleModalManager: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    // Listen for create role modal events
    const handleCreateRole = () => {
      setCreateModalOpen(true);
    };

    // Listen for edit role modal events
    const handleEditRole = (event: CustomEvent) => {
      setSelectedRole(event.detail.role);
      setEditModalOpen(true);
    };

    // Listen for manage permissions modal events
    const handleManagePermissions = (event: CustomEvent) => {
      setSelectedRole(event.detail.role);
      setPermissionsModalOpen(true);
    };

    // Add event listeners
    window.addEventListener('open-create-role-modal', handleCreateRole);
    window.addEventListener('open-edit-role-modal', handleEditRole as EventListener);
    window.addEventListener('open-role-permissions-modal', handleManagePermissions as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('open-create-role-modal', handleCreateRole);
      window.removeEventListener('open-edit-role-modal', handleEditRole as EventListener);
      window.removeEventListener('open-role-permissions-modal', handleManagePermissions as EventListener);
    };
  }, []);

  const handleModalSuccess = () => {
    // Trigger data refresh
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'roles' }
    }));
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedRole(null);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsModalOpen(false);
    setSelectedRole(null);
  };

  return (
    <>
      <CreateRoleModal
        isOpen={createModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleModalSuccess}
      />

      <EditRoleModal
        isOpen={editModalOpen}
        role={selectedRole}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
      />

      <ManagePermissionsModal
        isOpen={permissionsModalOpen}
        role={selectedRole}
        onClose={handleClosePermissionsModal}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}; 