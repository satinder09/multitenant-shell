'use client';

import React, { useState } from 'react';
import { ConfigDrivenModulePage } from '@/shared/modules/ConfigDrivenModulePage';
import { UsersConfig } from './users.config';

export default function UsersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Listen for custom events from actions
  React.useEffect(() => {
    const handleCreateUserModal = () => {
      setCreateDialogOpen(true);
    };

    const handleEditUserModal = (event: CustomEvent) => {
      const user = event.detail.user;
      setSelectedUser(user);
      setEditModalOpen(true);
    };

    const handleImportUsersModal = () => {
      setImportModalOpen(true);
    };

    window.addEventListener('open-create-user-modal', handleCreateUserModal);
    window.addEventListener('open-edit-user-modal', handleEditUserModal as EventListener);
    window.addEventListener('open-import-users-modal', handleImportUsersModal);

    return () => {
      window.removeEventListener('open-create-user-modal', handleCreateUserModal);
      window.removeEventListener('open-edit-user-modal', handleEditUserModal as EventListener);
      window.removeEventListener('open-import-users-modal', handleImportUsersModal);
    };
  }, []);

  return (
    <div>
      {/* PHASE 1 ENHANCEMENT: Enhanced Config-Driven Module Page with optimized filtering */}
      <ConfigDrivenModulePage 
        moduleName="users"
        config={UsersConfig} // Explicit config for better performance and caching
      />

      {/* Placeholder for future modals - Phase 2 will add these */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Create User (Coming Soon)</h3>
            <button 
              onClick={() => setCreateDialogOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Edit User: {selectedUser.name}</h3>
            <button 
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Import Users (Coming Soon)</h3>
            <button 
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 