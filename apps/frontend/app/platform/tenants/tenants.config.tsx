import React from 'react';
import { ModuleConfig } from '@/shared/modules/types';
import { Building2, Shield, Eye, Edit, Trash, CheckCircle, XCircle, Download, Plus, Upload, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { confirm } from '@/shared/utils/ui/dialogUtils';

// Manual tenant actions (no external dependencies)
const tenantActions = {
  // Row Actions
  viewTenant: async (tenant: any) => {
    window.location.href = `/platform/tenants/${tenant.id}`;
  },

  secureLogin: async (tenant: any) => {
    // Dispatch custom event to open secure login modal
    window.dispatchEvent(new CustomEvent('open-secure-login-modal', {
      detail: { tenant }
    }));
  },

  impersonate: async (tenant: any) => {
    // Open impersonation modal
    window.dispatchEvent(new CustomEvent('open-impersonation-modal', {
      detail: { tenant }
    }));
  },

  editTenant: async (tenant: any) => {
    console.log('Edit tenant:', tenant.id);
  },

  toggleStatus: async (tenant: any) => {
    if (tenant.isActive) {
      // Confirm before deactivating
      confirm({
        title: 'Deactivate Tenant',
        description: `Are you sure you want to deactivate tenant "${tenant.name}"?`,
        variant: 'critical',
        confirmLabel: 'Deactivate',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          try {
            await fetch(`/api/tenants/${tenant.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            });
            // Refresh data after success
            window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
          } catch (error) {
            console.error('Deactivate failed:', error);
          }
        },
      });
    } else {
      // Activate without confirmation
      try {
        await fetch(`/api/tenants/${tenant.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
      } catch (error) {
        console.error('Activate failed:', error);
      }
    }
  },

  deleteTenant: async (tenant: any) => {
    try {
      await fetch(`/api/tenants/${tenant.id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  },

  // Bulk Actions
  bulkActivate: async (tenants: any[]) => {
    try {
      const ids = tenants.map(t => t.id);
      await fetch('/api/tenants/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { status: 'active' } })
      });
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    } catch (error) {
      console.error('Bulk activate failed:', error);
    }
  },

  bulkDeactivate: async (tenants: any[]) => {
    try {
      const ids = tenants.map(t => t.id);
      await fetch('/api/tenants/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { status: 'inactive' } })
      });
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    } catch (error) {
      console.error('Bulk deactivate failed:', error);
    }
  },

  bulkExport: async (tenants: any[]) => {
    const csv = tenants.map(t => `${t.id},${t.name},${t.subdomain},${t.isActive}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants.csv';
    a.click();
  },

  bulkDelete: async (tenants: any[]) => {
    try {
      const ids = tenants.map(t => t.id);
      await fetch('/api/tenants/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  },

  // Header Actions
  createTenant: () => {
    window.dispatchEvent(new CustomEvent('open-create-tenant-modal'));
  },

  importTenants: () => {
    console.log('Import tenants');
  },

  refreshData: () => {
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'tenants' }
    }));
  }
};

// Custom renderers for specific columns
const customRenderers = {
  name: (name: string, record: any) => (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{record.subdomain}.app.com</div>
      </div>
    </div>
  ),

  subdomain: (subdomain: string) => (
    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
      {subdomain}.app.com
    </code>
  ),

  isActive: (isActive: boolean, record: any) => (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isActive ? 'default' : 'secondary'}
        className="cursor-pointer"
        onClick={() => tenantActions.toggleStatus(record)}
      >
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  ),

  permissions: (permissions: any[], record: any) => (
    <div className="flex items-center gap-1">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span>{record.userCount || 0} users</span>
    </div>
  ),

  createdAt: (date: string) => {
    return new Date(date).toLocaleDateString();
  },

  updatedAt: (date: string) => {
    return new Date(date).toLocaleDateString();
  }
};

// Completely manual config - no schema dependency
export const TenantsConfig: ModuleConfig = {
  // Source Configuration
  sourceTable: 'Tenant',
  primaryKey: 'id',

  // GENERIC BACKEND CONFIGURATION
  backendEndpoint: '/tenants/search',
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
      display: 'Tenant Name',
      type: 'string', // Auto-derives: ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty']
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      filterPreset: {
        field: 'name',
        operator: 'contains',
        label: 'Search Tenants'
      },
      // Dynamic filter source for tenant name options in generic filter dialog
      filterSource: {
        type: 'api',
        api: {
          url: '/api/filters/dropdown-options',
          method: 'POST',
          body: {
            field: 'name',
            module: 'tenants'
          },
          mapping: {
            value: 'id',
            label: 'name',
            color: 'color',
            description: 'description'
          },
          dataPath: 'data.options',
          cache: {
            enabled: true,
            ttl: 300000, // 5 minutes
            key: 'tenant-names'
          },
          searchable: {
            enabled: true,
            param: 'search',
            minLength: 2,
            debounce: 300
          },
          pagination: {
            enabled: true,
            pageParam: 'page',
            sizeParam: 'limit',
            defaultSize: 50
          }
        }
      },
      render: customRenderers.name,
      required: true,
      width: 250
    },
    {
      field: 'subdomain',
      display: 'Subdomain',
      type: 'string', // Auto-derives: ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty']
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      render: customRenderers.subdomain,
      width: 200
    },
    {
      field: 'isActive',
      display: 'Status',
      type: 'boolean', // Auto-derives: ['equals', 'not_equals']
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      filterPreset: {
        field: 'isActive',
        operator: 'equals',
        value: true,
        label: 'Active Tenants Only'
      },
      options: [
        { value: true, label: 'Active', color: 'green' },
        { value: false, label: 'Inactive', color: 'gray' }
      ],
      render: customRenderers.isActive,
      width: 100
    },
    {
      field: 'userCount',
      display: 'Users',
      type: 'number', // Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between']
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      render: customRenderers.permissions,
      width: 100
    },
    {
      field: 'dbName',
      display: 'Database',
      type: 'string',
      visible: false, // Hidden sensitive field
      sortable: false,
      searchable: false,
      filterable: false
    },
    {
      field: 'createdAt',
      display: 'Created At',
      type: 'datetime', // Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset']
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      filterPreset: {
        field: 'createdAt',
        operator: 'between',
        label: 'Created Date Range'
      },
      render: customRenderers.createdAt,
      width: 120
    },
    {
      field: 'updatedAt',
      display: 'Updated',
      type: 'datetime', // Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset']
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      render: customRenderers.updatedAt,
      width: 120
    }
  ],

  // Actions configuration with new display modes
  actions: {
    rowActions: [
      {
        key: 'view',
        label: 'View',
        icon: Eye,
        onClick: tenantActions.viewTenant,
        variant: 'ghost',
        displayMode: 'button',
        priority: 1
      },
      {
        key: 'secure-login',
        label: 'Secure Login',
        icon: Shield,
        onClick: tenantActions.secureLogin,
        variant: 'default',
        condition: (tenant) => tenant.isActive,
        displayMode: 'button',
        priority: 2
      },
      {
        key: 'impersonate',
        label: 'Impersonate',
        icon: Users,
        onClick: tenantActions.impersonate,
        variant: 'outline',
        condition: (tenant) => tenant.isActive,
        displayMode: 'menu',
        priority: 3
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        onClick: tenantActions.editTenant,
        variant: 'ghost',
        displayMode: 'menu',
        priority: 4
      },
      {
        key: 'toggle-status',
        label: 'Toggle Status',
        icon: CheckCircle,
        onClick: tenantActions.toggleStatus,
        variant: 'secondary',
        displayMode: 'menu',
        priority: 5
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        onClick: tenantActions.deleteTenant,
        variant: 'destructive',
        condition: (tenant) => !tenant.isActive,
        confirmMessage: 'Are you sure you want to delete this tenant?',
        displayMode: 'menu',
        priority: 6
      }
    ],

    // Row action display configuration
    rowActionDisplay: {
      mode: 'mixed', // Show some as buttons, some in menu
      maxButtons: 2,  // Show max 2 buttons, rest in menu
      showLabels: false // Only show icons on buttons
    },

    bulkActions: [
      {
        key: 'activate',
        label: 'Activate Selected',
        icon: CheckCircle,
        onClick: tenantActions.bulkActivate,
        variant: 'default',
        condition: (tenants) => tenants.some(t => !t.isActive)
      },
      {
        key: 'deactivate',
        label: 'Deactivate Selected',
        icon: XCircle,
        onClick: tenantActions.bulkDeactivate,
        variant: 'secondary',
        condition: (tenants) => tenants.some(t => t.isActive)
      },
      {
        key: 'export',
        label: 'Export Selected',
        icon: Download,
        onClick: tenantActions.bulkExport,
        variant: 'outline'
      },
      {
        key: 'delete',
        label: 'Delete Selected',
        icon: Trash,
        onClick: tenantActions.bulkDelete,
        variant: 'destructive',
        confirmMessage: 'Are you sure you want to delete the selected tenants?'
      }
    ],

    headerActions: [
      {
        key: 'create',
        label: 'Create Tenant',
        icon: Plus,
        onClick: tenantActions.createTenant,
        variant: 'default'
      },
      {
        key: 'import',
        label: 'Import',
        icon: Upload,
        onClick: tenantActions.importTenants,
        variant: 'outline'
      },
      {
        key: 'refresh',
        label: 'Refresh',
        icon: RefreshCw,
        onClick: tenantActions.refreshData,
        variant: 'ghost'
      }
    ]
  },

  // Display settings
  display: {
    defaultColumns: ['name', 'subdomain', 'isActive', 'userCount', 'createdAt'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    pageSize: 25,
    selectable: true
  },

  // Module metadata
  module: {
    name: 'tenants',
    title: 'Tenants',
    description: 'Manage multi-tenant organizations and access',
    icon: Building2
  }
}; 