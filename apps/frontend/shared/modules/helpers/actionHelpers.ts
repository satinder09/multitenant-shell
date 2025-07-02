// Action Generation Helpers
import { RowActionConfig, BulkActionConfig, HeaderActionConfig } from '../types';
import { Edit, Trash, Plus, Eye, RefreshCw, Download, Upload } from 'lucide-react';
import { confirm } from '@/shared/utils/ui/dialogUtils';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { browserApi } from '@/shared/services/api-client';

// Generate default row actions for CRUD operations
export function generateDefaultRowActions(
  entityName: string, 
  moduleName: string,
  customActions: RowActionConfig[] = []
): RowActionConfig[] {
  const baseActions: RowActionConfig[] = [
    {
      key: 'view',
      label: `View ${entityName}`,
      icon: Eye,
      onClick: (record: any) => {
        window.location.href = `/platform/${moduleName}/${record.id}`;
      },
      displayMode: 'menu',
      priority: 1
    },
    {
      key: 'edit',
      label: `Edit ${entityName}`,
      icon: Edit,
      onClick: (record: any) => {
        window.dispatchEvent(new CustomEvent(`open-edit-${moduleName}-modal`, {
          detail: { record }
        }));
      },
      displayMode: 'button',
      priority: 2
    },
    {
      key: 'delete',
      label: `Delete ${entityName}`,
      icon: Trash,
      variant: 'destructive',
      confirmMessage: `Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`,
      onClick: async (record: any) => {
        try {
          await browserApi.delete(`/api/${moduleName}/${record.id}`);
          toastNotify({ 
            variant: 'success', 
            title: `${entityName} deleted`,
            description: `${record.name || record.title || entityName} has been deleted successfully.`
          });
          window.dispatchEvent(new CustomEvent('refresh-module-data', {
            detail: { moduleName }
          }));
        } catch (error: any) {
          toastNotify({ 
            variant: 'error', 
            title: 'Delete failed',
            description: error?.message || `Failed to delete ${entityName.toLowerCase()}`
          });
        }
      },
      displayMode: 'menu',
      priority: 10
    }
  ];

  // If entity has an isActive field, add toggle status action
  const toggleAction: RowActionConfig = {
    key: 'toggleStatus',
    label: 'Toggle Status',
    icon: RefreshCw,
    onClick: async (record: any) => {
      try {
        const newStatus = !record.isActive;
        await browserApi.patch(`/api/${moduleName}/${record.id}`, {
          isActive: newStatus
        });
        toastNotify({ 
          variant: 'success', 
          title: 'Status updated',
          description: `${entityName} is now ${newStatus ? 'active' : 'inactive'}.`
        });
        window.dispatchEvent(new CustomEvent('refresh-module-data', {
          detail: { moduleName }
        }));
      } catch (error: any) {
        toastNotify({ 
          variant: 'error', 
          title: 'Update failed',
          description: error?.message || 'Failed to update status'
        });
      }
    },
    condition: (record: any) => record.hasOwnProperty('isActive'),
    displayMode: 'menu',
    priority: 5
  };

  return [...baseActions, toggleAction, ...customActions]
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

// Generate default bulk actions
export function generateDefaultBulkActions(
  entityName: string,
  moduleName: string,
  customActions: BulkActionConfig[] = []
): BulkActionConfig[] {
  const baseActions: BulkActionConfig[] = [
    {
      key: 'bulkDelete',
      label: `Delete Selected ${entityName}s`,
      icon: Trash,
      variant: 'destructive',
      confirmMessage: 'Are you sure you want to delete the selected items? This action cannot be undone.',
      onClick: async (records: any[]) => {
        try {
          const ids = records.map(r => r.id);
          await browserApi.delete(`/api/${moduleName}/bulk-delete`, { 
            data: { ids } 
          });
          toastNotify({ 
            variant: 'success', 
            title: `${entityName}s deleted`,
            description: `${ids.length} ${entityName.toLowerCase()}${ids.length > 1 ? 's' : ''} deleted successfully.`
          });
          window.dispatchEvent(new CustomEvent('refresh-module-data', {
            detail: { moduleName }
          }));
        } catch (error: any) {
          toastNotify({ 
            variant: 'error', 
            title: 'Bulk delete failed',
            description: error?.message || 'Failed to delete selected items'
          });
        }
      },
      displayMode: 'dropdown'
    },
    {
      key: 'bulkActivate',
      label: 'Activate Selected',
      icon: RefreshCw,
      onClick: async (records: any[]) => {
        try {
          const ids = records.map(r => r.id);
          await browserApi.patch(`/api/${moduleName}/bulk-update`, {
            ids,
            data: { isActive: true }
          });
          toastNotify({ 
            variant: 'success', 
            title: 'Items activated',
            description: `${ids.length} ${entityName.toLowerCase()}${ids.length > 1 ? 's' : ''} activated successfully.`
          });
          window.dispatchEvent(new CustomEvent('refresh-module-data', {
            detail: { moduleName }
          }));
        } catch (error: any) {
          toastNotify({ 
            variant: 'error', 
            title: 'Bulk activation failed',
            description: error?.message || 'Failed to activate selected items'
          });
        }
      },
      condition: (records: any[]) => records.some(r => r.hasOwnProperty('isActive')),
      displayMode: 'dropdown'
    },
    {
      key: 'bulkDeactivate',
      label: 'Deactivate Selected',
      icon: RefreshCw,
      onClick: async (records: any[]) => {
        try {
          const ids = records.map(r => r.id);
          await browserApi.patch(`/api/${moduleName}/bulk-update`, {
            ids,
            data: { isActive: false }
          });
          toastNotify({ 
            variant: 'success', 
            title: 'Items deactivated',
            description: `${ids.length} ${entityName.toLowerCase()}${ids.length > 1 ? 's' : ''} deactivated successfully.`
          });
          window.dispatchEvent(new CustomEvent('refresh-module-data', {
            detail: { moduleName }
          }));
        } catch (error: any) {
          toastNotify({ 
            variant: 'error', 
            title: 'Bulk deactivation failed',
            description: error?.message || 'Failed to deactivate selected items'
          });
        }
      },
      condition: (records: any[]) => records.some(r => r.hasOwnProperty('isActive')),
      displayMode: 'dropdown'
    }
  ];

  return [...baseActions, ...customActions];
}

// Generate default header actions
export function generateDefaultHeaderActions(
  entityName: string,
  moduleName: string,
  customActions: HeaderActionConfig[] = []
): HeaderActionConfig[] {
  const baseActions: HeaderActionConfig[] = [
    {
      key: 'create',
      label: `Create ${entityName}`,
      icon: Plus,
      onClick: () => {
        window.dispatchEvent(new CustomEvent(`open-create-${moduleName}-modal`));
      }
    },
    {
      key: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      variant: 'outline',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('refresh-module-data', {
          detail: { moduleName }
        }));
        toastNotify({ 
          variant: 'success', 
          title: 'Data refreshed' 
        });
      }
    },
    {
      key: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline',
      onClick: async () => {
        try {
          const response = await browserApi.get(`/api/${moduleName}/export`);
          // Handle export download
          const csvData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${moduleName}-export-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          toastNotify({ 
            variant: 'success', 
            title: 'Export completed' 
          });
        } catch (error: any) {
          toastNotify({ 
            variant: 'error', 
            title: 'Export failed',
            description: error?.message || 'Failed to export data'
          });
        }
      }
    },
    {
      key: 'import',
      label: 'Import',
      icon: Upload,
      variant: 'outline',
      onClick: () => {
        window.dispatchEvent(new CustomEvent(`open-import-${moduleName}-modal`));
      }
    }
  ];

  return [...baseActions, ...customActions];
}

// Utility function to merge actions while avoiding duplicates
export function mergeActions<T extends { key: string }>(baseActions: T[], customActions: T[] = []): T[] {
  const merged = [...baseActions];
  
  customActions.forEach(customAction => {
    const existingIndex = merged.findIndex(action => action.key === customAction.key);
    if (existingIndex >= 0) {
      // Replace existing action
      merged[existingIndex] = customAction;
    } else {
      // Add new action
      merged.push(customAction);
    }
  });
  
  return merged;
} 