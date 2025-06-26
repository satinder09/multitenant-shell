import { NextRequest, NextResponse } from 'next/server';

interface FieldNode {
  name: string;
  label: string;
  type: string;
  path: string[];
  hasChildren: boolean;
  children?: FieldNode[];
  operators?: string[];
  renderType?: string;
  options?: Array<{ value: any; label: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const { searchParams } = new URL(request.url);
    const parent = searchParams.get('parent');

    let fields: FieldNode[];

    if (parent) {
      // Return child fields for a specific parent
      fields = getChildFields(module, parent.split('.'));
    } else {
      // Return root level fields
      fields = getRootFields(module);
    }

    return NextResponse.json({
      fields,
      success: true
    });
  } catch (error) {
    console.error('Error in field-tree API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field tree' },
      { status: 500 }
    );
  }
}

function getRootFields(moduleName: string): FieldNode[] {
  switch (moduleName) {
    case 'tenants':
      return [
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          path: ['id'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'in', 'not_in'],
          renderType: 'input'
        },
        {
          name: 'name',
          label: 'Name',
          type: 'string',
          path: ['name'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
          renderType: 'input'
        },
        {
          name: 'subdomain',
          label: 'Subdomain',
          type: 'string',
          path: ['subdomain'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
          renderType: 'input'
        },
        {
          name: 'dbName',
          label: 'Database Name',
          type: 'string',
          path: ['dbName'],
          hasChildren: false,
          operators: ['equals', 'contains', 'starts_with'],
          renderType: 'input'
        },
        {
          name: 'isActive',
          label: 'Active Status',
          type: 'boolean',
          path: ['isActive'],
          hasChildren: false,
          operators: ['equals', 'not_equals'],
          renderType: 'select',
          options: [
            { value: true, label: 'Active' },
            { value: false, label: 'Inactive' }
          ]
        },
        {
          name: 'createdAt',
          label: 'Created Date',
          type: 'datetime',
          path: ['createdAt'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date'
        },
        {
          name: 'updatedAt',
          label: 'Updated Date',
          type: 'datetime',
          path: ['updatedAt'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date'
        },
        // Relationship fields (have children)
        {
          name: 'permissions',
          label: 'User Permissions',
          type: 'relation',
          path: ['permissions'],
          hasChildren: true,
          operators: [],
          renderType: 'relation'
        },
        {
          name: 'impersonationSessions',
          label: 'Impersonation Sessions',
          type: 'relation',
          path: ['impersonationSessions'],
          hasChildren: true,
          operators: [],
          renderType: 'relation'
        },
        {
          name: 'accessLogs',
          label: 'Access Logs',
          type: 'relation',
          path: ['accessLogs'],
          hasChildren: true,
          operators: [],
          renderType: 'relation'
        }
      ];

    case 'users':
      return [
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          path: ['id'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'in', 'not_in'],
          renderType: 'input'
        },
        {
          name: 'email',
          label: 'Email',
          type: 'string',
          path: ['email'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
          renderType: 'input'
        },
        {
          name: 'name',
          label: 'Name',
          type: 'string',
          path: ['name'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
          renderType: 'input'
        },
        {
          name: 'isSuperAdmin',
          label: 'Super Admin',
          type: 'boolean',
          path: ['isSuperAdmin'],
          hasChildren: false,
          operators: ['equals', 'not_equals'],
          renderType: 'select',
          options: [
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ]
        },
        {
          name: 'createdAt',
          label: 'Created Date',
          type: 'datetime',
          path: ['createdAt'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date'
        },
        {
          name: 'updatedAt',
          label: 'Updated Date',
          type: 'datetime',
          path: ['updatedAt'],
          hasChildren: false,
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date'
        },
        // Relationship fields
        {
          name: 'permissions',
          label: 'Tenant Permissions',
          type: 'relation',
          path: ['permissions'],
          hasChildren: true,
          operators: [],
          renderType: 'relation'
        },
        {
          name: 'userRoles',
          label: 'User Roles',
          type: 'relation',
          path: ['userRoles'],
          hasChildren: true,
          operators: [],
          renderType: 'relation'
        }
      ];

    default:
      return [];
  }
}

function getChildFields(moduleName: string, parentPath: string[]): FieldNode[] {
  const parentKey = parentPath.join('.');

  switch (moduleName) {
    case 'tenants':
      switch (parentKey) {
        case 'permissions':
          return [
            {
              name: 'user',
              label: 'User',
              type: 'relation',
              path: ['permissions', 'user'],
              hasChildren: true,
              operators: [],
              renderType: 'relation'
            }
          ];

        case 'permissions.user':
          return [
            {
              name: 'id',
              label: 'User ID',
              type: 'string',
              path: ['permissions', 'user', 'id'],
              hasChildren: false,
              operators: ['equals', 'not_equals'],
              renderType: 'input'
            },
            {
              name: 'email',
              label: 'User Email',
              type: 'string',
              path: ['permissions', 'user', 'email'],
              hasChildren: false,
              operators: ['equals', 'contains', 'starts_with', 'ends_with'],
              renderType: 'input'
            },
            {
              name: 'name',
              label: 'User Name',
              type: 'string',
              path: ['permissions', 'user', 'name'],
              hasChildren: false,
              operators: ['equals', 'contains', 'starts_with', 'ends_with'],
              renderType: 'input'
            }
          ];

        case 'impersonationSessions':
          return [
            {
              name: 'status',
              label: 'Status',
              type: 'enum',
              path: ['impersonationSessions', 'status'],
              hasChildren: false,
              operators: ['equals', 'not_equals', 'in', 'not_in'],
              renderType: 'select',
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ENDED', label: 'Ended' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'REVOKED', label: 'Revoked' }
              ]
            },
            {
              name: 'reason',
              label: 'Reason',
              type: 'string',
              path: ['impersonationSessions', 'reason'],
              hasChildren: false,
              operators: ['equals', 'contains'],
              renderType: 'input'
            },
            {
              name: 'startedAt',
              label: 'Started At',
              type: 'datetime',
              path: ['impersonationSessions', 'startedAt'],
              hasChildren: false,
              operators: ['equals', 'greater_than', 'less_than', 'between'],
              renderType: 'date'
            }
          ];

        case 'accessLogs':
          return [
            {
              name: 'accessType',
              label: 'Access Type',
              type: 'enum',
              path: ['accessLogs', 'accessType'],
              hasChildren: false,
              operators: ['equals', 'not_equals', 'in', 'not_in'],
              renderType: 'select',
              options: [
                { value: 'SECURE_LOGIN', label: 'Secure Login' },
                { value: 'IMPERSONATION', label: 'Impersonation' },
                { value: 'DIRECT_ACCESS', label: 'Direct Access' }
              ]
            },
            {
              name: 'reason',
              label: 'Reason',
              type: 'string',
              path: ['accessLogs', 'reason'],
              hasChildren: false,
              operators: ['equals', 'contains'],
              renderType: 'input'
            },
            {
              name: 'startedAt',
              label: 'Started At',
              type: 'datetime',
              path: ['accessLogs', 'startedAt'],
              hasChildren: false,
              operators: ['equals', 'greater_than', 'less_than', 'between'],
              renderType: 'date'
            }
          ];

        default:
          return [];
      }

    case 'users':
      switch (parentKey) {
        case 'permissions':
          return [
            {
              name: 'tenant',
              label: 'Tenant',
              type: 'relation',
              path: ['permissions', 'tenant'],
              hasChildren: true,
              operators: [],
              renderType: 'relation'
            }
          ];

        case 'permissions.tenant':
          return [
            {
              name: 'id',
              label: 'Tenant ID',
              type: 'string',
              path: ['permissions', 'tenant', 'id'],
              hasChildren: false,
              operators: ['equals', 'not_equals'],
              renderType: 'input'
            },
            {
              name: 'name',
              label: 'Tenant Name',
              type: 'string',
              path: ['permissions', 'tenant', 'name'],
              hasChildren: false,
              operators: ['equals', 'contains'],
              renderType: 'input'
            },
            {
              name: 'subdomain',
              label: 'Tenant Subdomain',
              type: 'string',
              path: ['permissions', 'tenant', 'subdomain'],
              hasChildren: false,
              operators: ['equals', 'contains'],
              renderType: 'input'
            }
          ];

        case 'userRoles':
          return [
            {
              name: 'role',
              label: 'Role',
              type: 'relation',
              path: ['userRoles', 'role'],
              hasChildren: true,
              operators: [],
              renderType: 'relation'
            }
          ];

        case 'userRoles.role':
          return [
            {
              name: 'name',
              label: 'Role Name',
              type: 'string',
              path: ['userRoles', 'role', 'name'],
              hasChildren: false,
              operators: ['equals', 'contains'],
              renderType: 'input'
            }
          ];

        default:
          return [];
      }

    default:
      return [];
  }
} 