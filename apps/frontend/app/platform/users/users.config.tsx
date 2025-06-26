import React from 'react';
import { ModuleConfig } from '@/lib/modules/types';
import { Users, Shield, Edit, Trash, UserCheck, UserX, Download } from 'lucide-react';

// Custom renderers for user fields
const customRenderers = {
  name: (value: string, record: any) => (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-blue-600">
          {value?.charAt(0)?.toUpperCase()}
        </span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  ),

  email: (value: string) => (
    <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
      {value}
    </a>
  ),

  isSuperAdmin: (value: boolean) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      value 
        ? 'bg-purple-100 text-purple-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {value ? (
        <>
          <Shield className="w-3 h-3 mr-1" />
          Super Admin
        </>
      ) : (
        'Regular User'
      )}
    </span>
  ),

  createdAt: (value: string) => (
    <span className="text-sm text-gray-600">
      {new Date(value).toLocaleDateString()}
    </span>
  )
};

// User actions
const userActions = {
  viewUser: (user: any) => {
    console.log('View user:', user);
    // Implement view user logic
  },

  editUser: (user: any) => {
    console.log('Edit user:', user);
    // Dispatch custom event to open edit modal
    window.dispatchEvent(new CustomEvent('open-edit-user-modal', {
      detail: { user }
    }));
  },

  toggleSuperAdmin: (user: any) => {
    console.log('Toggle super admin for user:', user);
    // Implement toggle super admin logic
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  },

  deleteUser: (user: any) => {
    console.log('Delete user:', user);
    // Implement delete user logic
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  },

  bulkActivate: (users: any[]) => {
    console.log('Bulk activate users:', users);
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  },

  bulkDeactivate: (users: any[]) => {
    console.log('Bulk deactivate users:', users);
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  },

  bulkExport: (users: any[]) => {
    console.log('Bulk export users:', users);
    // Implement bulk export logic
  },

  bulkDelete: (users: any[]) => {
    console.log('Bulk delete users:', users);
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  },

  createUser: () => {
    window.dispatchEvent(new CustomEvent('open-create-user-modal'));
  },

  importUsers: () => {
    window.dispatchEvent(new CustomEvent('open-import-users-modal'));
  },

  refreshData: () => {
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  }
};

export const UsersConfig: ModuleConfig = {
  // Source configuration
  sourceTable: 'User',
  primaryKey: 'id',

  // Column definitions with auto-derived operators
  columns: [
    {
      field: 'id',
      display: 'User ID',
      type: 'string', // Auto-derives: ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals', 'not_equals', 'is_empty', 'is_not_empty']
      visible: false,
      sortable: false,
      searchable: false,
      filterable: true,
      width: 100
    },
    {
      field: 'name',
      display: 'Full Name',
      type: 'string', // Auto-derives string operators
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'name',
        operator: 'contains' as const,
        label: 'Search Users'
      },
      render: customRenderers.name,
      required: true,
      width: 250
    },
    {
      field: 'email',
      display: 'Email Address',
      type: 'string', // Auto-derives string operators
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      render: customRenderers.email,
      required: true,
      width: 200
    },
    {
      field: 'isSuperAdmin',
      display: 'Role',
      type: 'boolean', // Auto-derives: ['equals', 'not_equals']
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
             popularFilter: {
         field: 'isSuperAdmin',
         operator: 'equals' as const,
         value: true,
         label: 'Super Admins Only'
       },
      options: [
        { value: true, label: 'Super Admin', color: 'purple' },
        { value: false, label: 'Regular User', color: 'gray' }
      ],
      render: customRenderers.isSuperAdmin,
      width: 150
    },
    {
      field: 'createdAt',
      display: 'Created',
      type: 'datetime', // Auto-derives: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'not_between', 'preset']
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      render: customRenderers.createdAt,
      width: 120
    },
    {
      field: 'updatedAt',
      display: 'Updated',
      type: 'datetime', // Auto-derives datetime operators
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      width: 120
    }
  ],

  // Actions configuration
  actions: {
    rowActions: [
      {
        key: 'view',
        label: 'View',
        icon: Users,
        onClick: userActions.viewUser,
        variant: 'ghost',
        displayMode: 'button',
        priority: 1
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        onClick: userActions.editUser,
        variant: 'default',
        displayMode: 'button',
        priority: 2
      },
      {
        key: 'toggle-super-admin',
        label: 'Toggle Super Admin',
        icon: Shield,
        onClick: userActions.toggleSuperAdmin,
        variant: 'outline',
        displayMode: 'menu',
        priority: 3
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        onClick: userActions.deleteUser,
        variant: 'destructive',
        confirmMessage: 'Are you sure you want to delete this user?',
        displayMode: 'menu',
        priority: 4
      }
    ],

    rowActionDisplay: {
      mode: 'mixed',
      maxButtons: 2,
      showLabels: false
    },

    bulkActions: [
      {
        key: 'activate',
        label: 'Activate Selected',
        icon: UserCheck,
        onClick: userActions.bulkActivate,
        variant: 'default'
      },
      {
        key: 'deactivate',
        label: 'Deactivate Selected',
        icon: UserX,
        onClick: userActions.bulkDeactivate,
        variant: 'secondary'
      },
      {
        key: 'export',
        label: 'Export Selected',
        icon: Download,
        onClick: userActions.bulkExport,
        variant: 'outline'
      },
      {
        key: 'delete',
        label: 'Delete Selected',
        icon: Trash,
        onClick: userActions.bulkDelete,
        variant: 'destructive',
        confirmMessage: 'Are you sure you want to delete the selected users?'
      }
    ],

    headerActions: [
      {
        key: 'create',
        label: 'Create User',
        icon: Users,
        onClick: userActions.createUser,
        variant: 'default'
      }
    ]
  },

  // Display settings
  display: {
    defaultColumns: ['name', 'email', 'isSuperAdmin', 'createdAt'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    pageSize: 25,
    selectable: true
  },

  // Module metadata
  module: {
    name: 'users',
    title: 'Users',
    description: 'Manage system users and permissions',
    icon: Users
  }
}; 