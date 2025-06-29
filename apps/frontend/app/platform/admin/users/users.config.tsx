import React from 'react';
import { ModuleConfig } from '@/shared/modules/types';
import { Users, Eye, Edit, Trash, CheckCircle, Plus, RefreshCw, Calendar, Mail, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// User actions
const userActions = {
  viewUser: async (user: any) => {
    console.log('View user:', user.id);
  },

  editUser: async (user: any) => {
    window.dispatchEvent(new CustomEvent('open-edit-user-modal', {
      detail: { user }
    }));
  },

  deleteUser: async (user: any) => {
    try {
      await fetch(`/api/platform/admin/users/${user.id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('refresh-module-data', {
        detail: { moduleName: 'users' }
      }));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  },

  createUser: () => {
    window.dispatchEvent(new CustomEvent('open-create-user-modal'));
  },

  refreshData: () => {
    window.dispatchEvent(new CustomEvent('refresh-module-data', {
      detail: { moduleName: 'users' }
    }));
  }
};

// Custom renderers
const customRenderers = {
  name: (name: string, record: any) => (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{record.email}</div>
      </div>
    </div>
  ),

  role: (role: string | undefined) => {
    if (!role) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          -
        </Badge>
      );
    }

    const getRoleColor = (role: string) => {
      const lowerRole = role.toLowerCase();
      switch (lowerRole) {
        case 'administrator': 
          return 'bg-red-100 text-red-800 border-red-200';
        case 'user':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        default: 
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <Badge className={getRoleColor(role)}>
        {role}
      </Badge>
    );
  },

  tenantCount: (tenantCount: number) => (
    <div className="flex items-center gap-1">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span>{tenantCount} tenants</span>
    </div>
  ),

  createdAt: (date: string) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4" />
      {new Date(date).toLocaleDateString()}
    </div>
  )
};

export const UsersConfig: ModuleConfig = {
  sourceTable: 'User',
  primaryKey: 'id',
  
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
      display: 'User',
      type: 'string',
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'name',
        operator: 'contains',
        label: 'Search Users'
      },
      render: customRenderers.name,
      required: true,
      width: 250
    },
    {
      field: 'email',
      display: 'Email',
      type: 'string',
      visible: true,
      sortable: true,
      searchable: true,
      filterable: true,
      width: 200
    },
    {
      field: 'role',
      display: 'Role',
      type: 'enum',
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      popular: true,
      popularFilter: {
        field: 'role',
        operator: 'equals',
        value: 'administrator',
        label: 'Administrators Only'
      },
      options: [
        { value: 'administrator', label: 'Administrator' },
        { value: 'user', label: 'User' }
      ],
      render: customRenderers.role,
      width: 150
    },
    {
      field: 'tenantCount',
      display: 'Tenants',
      type: 'number',
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      render: customRenderers.tenantCount,
      width: 100
    },
    {
      field: 'createdAt',
      display: 'Created At',
      type: 'datetime',
      visible: true,
      sortable: true,
      searchable: false,
      filterable: true,
      render: customRenderers.createdAt,
      width: 120
    }
  ],

  actions: {
    rowActions: [
      {
        key: 'view',
        label: 'View',
        icon: Eye,
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
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        onClick: userActions.deleteUser,
        variant: 'destructive',
        confirmMessage: 'Are you sure you want to delete this user?',
        displayMode: 'menu',
        priority: 3
      }
    ],

    rowActionDisplay: {
      mode: 'mixed',
      maxButtons: 2,
      showLabels: false
    },

    headerActions: [
      {
        key: 'create',
        label: 'Create User',
        icon: Plus,
        onClick: userActions.createUser,
        variant: 'default'
      },
      {
        key: 'refresh',
        label: 'Refresh',
        icon: RefreshCw,
        onClick: userActions.refreshData,
        variant: 'ghost'
      }
    ]
  },

  display: {
    defaultColumns: ['name', 'email', 'role', 'tenantCount', 'createdAt'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    pageSize: 25,
    selectable: true
  },

  module: {
    name: 'users',
    title: 'Platform Users',
    description: 'Manage platform-level user accounts and permissions',
    icon: Users
  }
}; 