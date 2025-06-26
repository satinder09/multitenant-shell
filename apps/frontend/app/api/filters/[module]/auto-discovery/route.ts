import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    
    // Get real field definitions based on actual database schema
    const fieldDefinitions = getRealFieldDefinitions(module);
    const relationships = getRealRelationships(module);
    
    // Transform to the format expected by the UI
    const nestedFields = transformToNestedFields(fieldDefinitions, relationships);
    
    return NextResponse.json({
      fields: fieldDefinitions,
      relationships: relationships,
      nestedFields: nestedFields,
      success: true
    });
  } catch (error) {
    console.error('Error in auto-discovery:', error);
    return NextResponse.json(
      { error: 'Failed to discover fields' },
      { status: 500 }
    );
  }
}

function transformToNestedFields(fields: any[], relationships: any[]): any[] {
  const nestedFields: any[] = [];
  
  // Add direct fields
  fields.forEach(field => {
    nestedFields.push({
      path: [field.name],
      label: field.label,
      type: field.type,
      operators: field.operators,
      renderType: field.renderType,
      options: field.options
    });
  });
  
  // Add relationship fields
  relationships.forEach(relationship => {
    if (relationship.fields) {
      relationship.fields.forEach((relField: any) => {
        const pathParts = relField.name.split('.');
        nestedFields.push({
          path: pathParts,
          label: relField.label,
          type: relField.type,
          operators: relField.operators,
          renderType: relField.renderType,
          options: relField.options
        });
      });
    }
  });
  
  return nestedFields;
}

function getRealFieldDefinitions(moduleName: string) {
  switch (moduleName) {
    case 'tenants':
      return [
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          operators: ['equals', 'not_equals', 'in', 'not_in'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'name',
          label: 'Name',
          type: 'string',
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'subdomain',
          label: 'Subdomain',
          type: 'string',
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'dbName',
          label: 'Database Name',
          type: 'string',
          operators: ['equals', 'contains', 'starts_with'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'isActive',
          label: 'Active Status',
          type: 'boolean',
          operators: ['equals', 'not_equals'],
          renderType: 'select',
          options: [
            { value: true, label: 'Active' },
            { value: false, label: 'Inactive' }
          ],
          isSearchable: false
        },
        {
          name: 'createdAt',
          label: 'Created Date',
          type: 'datetime',
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date',
          isSearchable: false
        },
        {
          name: 'updatedAt',
          label: 'Updated Date',
          type: 'datetime',
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date',
          isSearchable: false
        }
      ];

    case 'users':
      return [
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          operators: ['equals', 'not_equals', 'in', 'not_in'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'email',
          label: 'Email',
          type: 'string',
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'name',
          label: 'Name',
          type: 'string',
          operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
          renderType: 'input',
          isSearchable: true
        },
        {
          name: 'isSuperAdmin',
          label: 'Super Admin',
          type: 'boolean',
          operators: ['equals', 'not_equals'],
          renderType: 'select',
          options: [
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ],
          isSearchable: false
        },
        {
          name: 'createdAt',
          label: 'Created Date',
          type: 'datetime',
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date',
          isSearchable: false
        },
        {
          name: 'updatedAt',
          label: 'Updated Date',
          type: 'datetime',
          operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
          renderType: 'date',
          isSearchable: false
        }
      ];

    default:
      return [];
  }
}

function getRealRelationships(moduleName: string) {
  switch (moduleName) {
    case 'tenants':
      return [
        {
          name: 'permissions',
          label: 'User Permissions',
          type: 'one-to-many',
          relatedTable: 'TenantUserPermission',
          foreignKey: 'tenantId',
          fields: [
            {
              name: 'permissions.user.email',
              label: 'User > Email',
              type: 'string',
              operators: ['equals', 'contains'],
              renderType: 'input'
            },
            {
              name: 'permissions.user.name',
              label: 'User > Name',
              type: 'string',
              operators: ['equals', 'contains'],
              renderType: 'input'
            }
          ]
        },
        {
          name: 'impersonationSessions',
          label: 'Impersonation Sessions',
          type: 'one-to-many',
          relatedTable: 'ImpersonationSession',
          foreignKey: 'impersonatedTenantId',
          fields: [
            {
              name: 'impersonationSessions.status',
              label: 'Impersonation > Status',
              type: 'enum',
              operators: ['equals', 'not_equals', 'in'],
              renderType: 'select',
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ENDED', label: 'Ended' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'REVOKED', label: 'Revoked' }
              ]
            }
          ]
        },
        {
          name: 'accessLogs',
          label: 'Access Logs',
          type: 'one-to-many',
          relatedTable: 'TenantAccessLog',
          foreignKey: 'tenantId',
          fields: [
            {
              name: 'accessLogs.accessType',
              label: 'Access Log > Type',
              type: 'enum',
              operators: ['equals', 'not_equals', 'in'],
              renderType: 'select',
              options: [
                { value: 'SECURE_LOGIN', label: 'Secure Login' },
                { value: 'IMPERSONATION', label: 'Impersonation' },
                { value: 'DIRECT_ACCESS', label: 'Direct Access' }
              ]
            }
          ]
        }
      ];

    case 'users':
      return [
        {
          name: 'permissions',
          label: 'Tenant Permissions',
          type: 'one-to-many',
          relatedTable: 'TenantUserPermission',
          foreignKey: 'userId',
          fields: [
            {
              name: 'permissions.tenant.name',
              label: 'Tenant > Name',
              type: 'string',
              operators: ['equals', 'contains'],
              renderType: 'input'
            },
            {
              name: 'permissions.tenant.subdomain',
              label: 'Tenant > Subdomain',
              type: 'string',
              operators: ['equals', 'contains'],
              renderType: 'input'
            }
          ]
        },
        {
          name: 'userRoles',
          label: 'User Roles',
          type: 'one-to-many',
          relatedTable: 'UserRole',
          foreignKey: 'userId',
          fields: [
            {
              name: 'userRoles.role.name',
              label: 'Role > Name',
              type: 'string',
              operators: ['equals', 'contains'],
              renderType: 'input'
            }
          ]
        }
      ];

    default:
      return [];
  }
} 