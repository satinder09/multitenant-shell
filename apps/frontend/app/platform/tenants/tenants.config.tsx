import React from 'react';
import { ModuleConfig } from '@/shared/modules/types';
import { 
  Building2, Users, Eye, Edit, Trash, CheckCircle, XCircle, 
  Shield, Plus, Upload, RefreshCw, Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { confirm } from '@/shared/utils/ui/dialogUtils';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { browserApi } from '@/shared/services/api-client';

// Manual tenant actions (no external dependencies)
const tenantActions = {
  // Row Actions
  viewTenant: async (tenant: any) => {
    window.location.href = `/platform/tenants/${tenant.id}`;
  },



  editTenant: async (tenant: any) => {
    window.dispatchEvent(new CustomEvent('open-edit-tenant-dialog', {
      detail: { tenant }
    }));
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

  toggleStatus: async (tenant: any) => {
    if (tenant.isActive) {
      // Confirm before deactivating
      confirm({
        title: 'Deactivate Tenant',
        description: `Are you sure you want to deactivate tenant "${tenant.name}"?`,
        variant: 'warning',
        confirmLabel: 'Deactivate',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          try {
            await browserApi.patch(`/api/tenants/${tenant.id}`, { isActive: false });
            // Refresh data after success
            window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
          } catch (error) {
            console.error('Deactivate failed:', error);
            toastNotify({
              variant: 'error',
              title: 'Deactivation Failed',
              description: 'Unable to deactivate tenant. Please try again.'
            });
          }
        },
      });
    } else {
      // Activate without confirmation
      try {
        await browserApi.patch(`/api/tenants/${tenant.id}`, { isActive: true });
        window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
      } catch (error) {
        console.error('Activate failed:', error);
        toastNotify({
          variant: 'error',
          title: 'Activation Failed',
          description: 'Unable to activate tenant. Please try again.'
        });
      }
    }
  },

  deleteTenant: async (tenant: any) => {
    try {
      await browserApi.delete(`/api/tenants/${tenant.id}`);
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'tenants' }
      }));
    } catch (error) {
      console.error('Delete failed:', error);
      toastNotify({
        variant: 'error',
        title: 'Delete Failed',
        description: 'Unable to delete tenant. Please try again.'
      });
    }
  },

  // Bulk Actions
  bulkActivate: async (tenants: any[]) => {
    const ids = tenants.map(t => t.id);
    try {
      // Disable UI (optional: set a local state)
      await browserApi.patch('/api/tenants/bulk-update', { ids, data: { isActive: true } });
      toastNotify({ variant: 'success', title: 'Tenants activated' });
      window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
    } catch (error: any) {
      toastNotify({ variant: 'error', title: 'Bulk activate failed', description: error?.message || 'Unknown error' });
    }
  },

  bulkDeactivate: async (tenants: any[]) => {
    const ids = tenants.map(t => t.id);
    confirm({
      title: 'Deactivate Tenants',
      description: `Are you sure you want to deactivate ${ids.length} tenant${ids.length > 1 ? 's' : ''}? This will disable access for these tenants.`,
      variant: 'warning',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await browserApi.patch('/api/tenants/bulk-update', { ids, data: { isActive: false } });
          toastNotify({ variant: 'success', title: 'Tenants deactivated' });
          window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
        } catch (error: any) {
          toastNotify({ variant: 'error', title: 'Bulk deactivate failed', description: error?.message || 'Unknown error' });
        }
      },
    });
  },

  // Bulk Toggle Status: toggles activation state for selected tenants
  bulkToggleStatus: async (tenants: any[]) => {
    const toActivate = tenants.filter(t => !t.isActive).map(t => t.id);
    const toDeactivate = tenants.filter(t => t.isActive).map(t => t.id);
    try {
      if (toActivate.length > 0) {
        await browserApi.patch('/api/tenants/bulk-update', { ids: toActivate, data: { isActive: true } });
      }
      if (toDeactivate.length > 0) {
        await browserApi.patch('/api/tenants/bulk-update', { ids: toDeactivate, data: { isActive: false } });
      }
      toastNotify({ variant: 'success', title: 'Tenant statuses toggled' });
      window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
    } catch (error: any) {
      toastNotify({ variant: 'error', title: 'Bulk toggle status failed', description: error?.message || 'Unknown error' });
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
    const ids = tenants.map(t => t.id);
    confirm({
      title: 'Delete Tenants',
      description: `Are you sure you want to delete ${ids.length} tenants? This action cannot be undone.`,
      variant: 'critical',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await browserApi.delete('/api/tenants/bulk-delete', { data: { ids } });
          toastNotify({ variant: 'success', title: 'Tenants deleted' });
          window.dispatchEvent(new CustomEvent('refresh-module-data', { detail: { moduleName: 'tenants' } }));
        } catch (error: any) {
          toastNotify({ variant: 'error', title: 'Bulk delete failed', description: error?.message || 'Unknown error' });
        }
      },
    });
  },

  // Header Actions
  createTenant: () => {
    window.dispatchEvent(new CustomEvent('open-create-tenant-modal'));
  },

  importTenants: () => {
    toastNotify({
      variant: 'info',
      title: 'Import Feature',
      description: 'Tenant import functionality is not yet implemented.'
    });
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
      <span>{permissions?.length || 0} permissions</span>
    </div>
  ),

  createdAt: (date: string) => {
    return new Date(date).toLocaleDateString();
  },

  updatedAt: (date: string) => {
    return new Date(date).toLocaleDateString();
  },

  // NEW: Computed field renderers
  userCount: (userCount: number) => (
    <div className="flex items-center gap-1">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span>{userCount || 0} users</span>
    </div>
  ),

  lastActivity: (lastActivity: string) => {
    if (!lastActivity) return <span className="text-muted-foreground">Never</span>;
    return new Date(lastActivity).toLocaleDateString();
  },

  totalRevenue: (revenue: number) => (
    <span className="font-mono">${revenue?.toLocaleString() || '0'}</span>
  )
};

// Advanced multi-table config with relations and computed fields
export const TenantsConfig: ModuleConfig = {
  // Source Configuration
  sourceTable: 'Tenant',
  primaryKey: 'id',


  // Column Definitions - now includes computed fields
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
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        onClick: tenantActions.editTenant,
        variant: 'outline',
        displayMode: 'menu',
        priority: 3
      },
      {
        key: 'impersonate',
        label: 'Impersonate',
        icon: Users,
        onClick: tenantActions.impersonate,
        variant: 'outline',
        condition: (tenant) => tenant.isActive,
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
        label: 'Activate',
        icon: CheckCircle,
        onClick: tenantActions.bulkActivate,
        variant: 'default'
      },
      {
        key: 'deactivate',
        label: 'Deactivate',
        icon: XCircle,
        onClick: tenantActions.bulkDeactivate,
        variant: 'secondary'
      },
      {
        key: 'export',
        label: 'Export Selected',
        icon: Download,
        onClick: tenantActions.bulkExport,
        variant: 'outline',
        displayMode: 'icon'
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        onClick: tenantActions.bulkDelete,
        variant: 'destructive'
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
    description: 'Advanced tenant management with user counts and multi-table data',
    icon: Building2
  }
}; 