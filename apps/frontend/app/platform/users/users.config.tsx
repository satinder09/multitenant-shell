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

  // GENERIC BACKEND CONFIGURATION
  backendEndpoint: '/platform/admin/users',
  backendMethod: 'GET',

  // PHASE 1 ENHANCEMENT: Enhanced module metadata for better filtering
  module: {
    name: 'users',
    title: 'User Management',
    description: 'Manage system users and their permissions'
  },

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
      popular: true,
      popularFilter: {
        field: 'email',
        operator: 'contains' as const,
        label: 'Search by Email'
      },
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
      field: 'department',
      display: 'Department',
      type: 'string',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'department',
        operator: 'equals' as const,
        label: 'Filter by Department'
      },
      options: [
        { value: 'engineering', label: 'Engineering', color: '#3b82f6' },
        { value: 'marketing', label: 'Marketing', color: '#ef4444' },
        { value: 'sales', label: 'Sales', color: '#10b981' },
        { value: 'hr', label: 'Human Resources', color: '#f59e0b' },
        { value: 'finance', label: 'Finance', color: '#8b5cf6' }
      ],
      width: 120
    },
    {
      field: 'role',
      display: 'Role',
      type: 'string',
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'role',
        operator: 'equals' as const,
        label: 'Filter by Role'
      },
      filterSource: {
        type: 'api' as const,
        api: {
          url: '/api/filters/dropdown-options',
          method: 'POST',
          params: {
            field: 'role',
            module: 'users'
          },
          mapping: {
            value: 'id',
            label: 'name',
            color: 'color',
            description: 'description'
          },
          dataPath: 'data.options',
          totalPath: 'data.total',
          cache: {
            enabled: true,
            ttl: 10 * 60 * 1000, // 10 minutes
            key: 'user-roles'
          },
          searchable: {
            enabled: true,
            param: 'search',
            minLength: 2,
            debounce: 300
          }
        },
        fallback: [
          { value: 'admin', label: 'Administrator', color: '#dc2626' },
          { value: 'user', label: 'User', color: '#6b7280' },
          { value: 'moderator', label: 'Moderator', color: '#059669' }
        ],
        errorMessage: 'Failed to load roles, showing defaults'
      },
      width: 120
    },
    {
      field: 'location',
      display: 'Location',
      type: 'string',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'location',
        operator: 'equals' as const,
        label: 'Filter by Location'
      },
      filterSource: {
        type: 'table' as const,
        table: {
          name: 'locations',
          valueColumn: 'code',
          labelColumn: 'name',
          colorColumn: 'color',
          descriptionColumn: 'country',
          where: { active: true },
          orderBy: 'name ASC',
          limit: 100,
          cache: {
            enabled: true,
            ttl: 30 * 60 * 1000, // 30 minutes
            key: 'active-locations'
          }
        },
        fallback: [
          { value: 'us', label: 'United States', description: 'North America' },
          { value: 'uk', label: 'United Kingdom', description: 'Europe' },
          { value: 'ca', label: 'Canada', description: 'North America' }
        ]
      },
      width: 120
    },
    {
      field: 'manager',
      display: 'Manager',
      type: 'reference',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'manager',
        operator: 'equals' as const,
        label: 'Filter by Manager'
      },
      filterSource: {
        type: 'query' as const,
        query: {
          sql: `
            SELECT u.id as value, 
                   CONCAT(u.first_name, ' ', u.last_name) as label,
                   CASE WHEN u.is_super_admin THEN '#dc2626' ELSE '#6b7280' END as color,
                   u.email as description
            FROM users u 
            WHERE u.is_manager = true 
              AND u.active = true 
            ORDER BY u.first_name, u.last_name
          `,
          params: {},
          mapping: {
            value: 'value',
            label: 'label',
            color: 'color',
            description: 'description'
          },
          cache: {
            enabled: true,
            ttl: 15 * 60 * 1000, // 15 minutes
            key: 'active-managers'
          }
        },
        transform: (data) => data.map(item => ({
          ...item,
          label: `${item.label} (${item.description})`
        })),
        fallback: [
          { value: 'system', label: 'System Manager', color: '#6b7280' }
        ]
      },
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
      popular: true,
      popularFilter: {
        field: 'createdAt',
        operator: 'preset' as const,
        label: 'Created At Range'
      },
      render: customRenderers.createdAt,
      width: 120
    },
    {
      field: 'lastLogin',
      display: 'Last Login',
      type: 'datetime',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'lastLogin',
        operator: 'equals' as const,
        label: 'Last Login Date'
      },
      width: 120
    },
    {
      field: 'activeRange',
      display: 'Active Period',
      type: 'datetime',
      visible: false,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'activeRange',
        operator: 'between' as const,
        label: 'Active Date Range'
      },
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


}; 