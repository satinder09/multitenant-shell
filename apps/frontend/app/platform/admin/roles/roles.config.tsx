import React from 'react';
import { ModuleConfig } from '@/shared/modules/types';
import { Shield, Users, Edit, Trash, CheckCircle, XCircle, Download, Plus, Upload, RefreshCw, Key, Eye, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { confirm } from '@/shared/utils/ui/dialogUtils';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { browserApi } from '@/shared/services/api-client';

// Manual role actions (no external dependencies)
const roleActions = {
  // Row Actions
  viewRole: async (role: any) => {
    window.location.href = `/platform/admin/roles/${role.id}`;
  },

  editRole: async (role: any) => {
    // Dispatch custom event to open edit role modal
    window.dispatchEvent(new CustomEvent('open-edit-role-modal', {
      detail: { role }
    }));
  },

  managePermissions: async (role: any) => {
    // Open permissions management modal
    window.dispatchEvent(new CustomEvent('open-role-permissions-modal', {
      detail: { role }
    }));
  },

  deleteRole: async (role: any) => {
    // Confirm before deleting
    confirm({
      title: 'Delete Role',
      description: `Are you sure you want to delete role "${role.name}"? This will remove all permissions and user assignments for this role.`,
      variant: 'critical',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await fetch(`/api/platform-rbac/roles/${role.id}`, {
            method: 'DELETE',
          });
          // Refresh data after success
          window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'roles' } }));
          toastNotify({ variant: 'success', title: 'Role deleted successfully' });
        } catch (error) {
          console.error('Delete failed:', error);
          toastNotify({ variant: 'error', title: 'Failed to delete role' });
        }
      },
    });
  },

  // Bulk Actions
  bulkDelete: async (roles: any[]) => {
    const ids = roles.map(r => r.id);
    confirm({
      title: 'Delete Roles',
      description: `Are you sure you want to delete ${ids.length} role${ids.length > 1 ? 's' : ''}? This will remove all permissions and user assignments for these roles.`,
      variant: 'critical',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await Promise.all(ids.map(id => 
            fetch(`/api/platform-rbac/roles/${id}`, { method: 'DELETE' })
          ));
          toastNotify({ variant: 'success', title: 'Roles deleted successfully' });
          window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'roles' } }));
        } catch (error: any) {
          toastNotify({ variant: 'error', title: 'Bulk delete failed', description: error?.message || 'Unknown error' });
        }
      },
    });
  },

  bulkExport: async (roles: any[]) => {
    const csv = roles.map(r => 
      `${r.id},${r.name},${r.permissionCount || 0},${r.userCount || 0},${r.createdAt}`
    ).join('\n');
    const blob = new Blob([`ID,Name,Permissions,Users,Created At\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'platform-roles.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Header Actions
  createRole: () => {
    window.dispatchEvent(new CustomEvent('open-create-role-modal'));
  },

  importRoles: () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            // Basic CSV/JSON parsing would go here
            console.log('File content:', event.target?.result);
            toastNotify({ variant: 'info', title: 'Import feature in development', description: 'File selected but import logic needs implementation' });
          } catch (error) {
            toastNotify({ variant: 'error', title: 'Failed to parse file' });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  },

  refreshData: () => {
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'roles' }
    }));
  }
};

// Custom renderers for specific columns
const customRenderers = {
  name: (name: string, record: any) => (
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">Platform Role</div>
      </div>
    </div>
  ),

  permissions: (rolePermissions: any, record: any) => {
    // Ensure rolePermissions is an array
    const permissions = Array.isArray(rolePermissions) ? rolePermissions : [];
    const count = permissions.length;
    const firstFew = permissions.slice(0, 3).map(rp => rp?.permission?.name).filter(Boolean);
    
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Key className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{count} permissions</span>
        </div>
        {firstFew.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {firstFew.map((permission, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {permission}
              </Badge>
            ))}
            {count > 3 && (
              <Badge variant="outline" className="text-xs">
                +{count - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  },

  users: (userRoles: any, record: any) => {
    // Ensure userRoles is an array
    const users = Array.isArray(userRoles) ? userRoles : [];
    const count = users.length;
    const firstFew = users.slice(0, 2).map(ur => ur?.user?.email).filter(Boolean);
    
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{count} users</span>
        </div>
        {firstFew.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {firstFew.join(', ')}
            {count > 2 && ` +${count - 2} more`}
          </div>
        )}
      </div>
    );
  },

  createdAt: (date: string) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
  },

  updatedAt: (date: string) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
  },

  description: (description: string, record: any) => (
    <span className="text-sm text-muted-foreground">
      {description || 'No description'}
    </span>
  )
};

// Completely manual config - no schema dependency
export const RolesConfig: ModuleConfig = {
  // Source Configuration
  sourceTable: 'Role',
  primaryKey: 'id',

  // GENERIC BACKEND CONFIGURATION
  backendEndpoint: '/platform-rbac/roles/search',
  backendMethod: 'POST',
  
  // Manual Column Definitions - Complete control
  columns: [
    {
      field: 'id',
      display: 'ID',
      type: 'string',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: false
    },
    {
      field: 'name',
      display: 'Role Name',
      type: 'string',
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      filterPreset: {
        field: 'name',
        operator: 'contains',
        label: 'Search Roles'
      },
      render: customRenderers.name,
      required: true,
      width: 250
    },
    {
      field: 'rolePermissions',
      display: 'Permissions',
      type: 'json',
      visible: true,
      sortable: false,
      searchable: false,
      filterable: true,
      render: customRenderers.permissions,
      width: 300
    },
    {
      field: 'userRoles',
      display: 'Assigned Users',
      type: 'json',
      visible: true,
      sortable: false,
      searchable: false,
      filterable: true,
      render: customRenderers.users,
      width: 200
    },
    {
      field: 'description',
      display: 'Description',
      type: 'string',
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      render: customRenderers.description,
      width: 200
    }
  ],

  // Actions configuration with new display modes
  actions: {
    rowActions: [
      {
        key: 'view',
        label: 'View',
        icon: Eye,
        onClick: roleActions.viewRole,
        variant: 'ghost',
        displayMode: 'button',
        priority: 1
      },
      {
        key: 'manage-permissions',
        label: 'Manage Permissions',
        icon: Key,
        onClick: roleActions.managePermissions,
        variant: 'default',
        displayMode: 'button',
        priority: 2
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        onClick: roleActions.editRole,
        variant: 'ghost',
        displayMode: 'menu',
        priority: 3
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        onClick: roleActions.deleteRole,
        variant: 'destructive',
        confirmMessage: 'Are you sure you want to delete this role?',
        displayMode: 'menu',
        priority: 4
      }
    ],
    
    bulkActions: [
      {
        key: 'export',
        label: 'Export Selected',
        icon: Download,
        onClick: roleActions.bulkExport,
        variant: 'outline',
        displayMode: 'icon'
      },
      {
        key: 'delete',
        label: 'Delete Selected',
        icon: Trash,
        onClick: roleActions.bulkDelete,
        variant: 'destructive',
        displayMode: 'dropdown'
      }
    ],
    
    headerActions: [
      {
        key: 'create',
        label: 'Create Role',
        icon: Plus,
        onClick: roleActions.createRole,
        variant: 'default'
      },
      {
        key: 'import',
        label: 'Import',
        icon: Upload,
        onClick: roleActions.importRoles,
        variant: 'outline'
      },
      {
        key: 'refresh',
        label: 'Refresh',
        icon: RefreshCw,
        onClick: roleActions.refreshData,
        variant: 'outline'
      }
    ],

    // Action display configuration
    rowActionDisplay: {
      mode: 'mixed', // buttons + menu
      maxButtons: 2,
      showLabels: false
    }
  },

  // Module Metadata
  module: {
    name: 'roles',
    title: 'Platform Roles',
    description: 'Manage platform-level roles and permissions'
  },

  // Display Configuration
  display: {
    pageSize: 10,
    defaultColumns: ['name', 'description', 'rolePermissions', 'userRoles'], // Only show these by default
    selectable: true
  }
}; 