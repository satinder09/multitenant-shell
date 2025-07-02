import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/shared/services/api';

export async function POST(req: NextRequest) {
  const backendUrl = getBackendUrl(req);
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const searchBody = await req.json();
    
    // For now, we'll fetch all roles and do client-side filtering
    // In a real implementation, you'd want to implement server-side search in the backend
    const response = await fetch(`${backendUrl}/platform-rbac/roles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
        'Cache-Control': 'no-cache',
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch platform roles', details: text },
        { status: response.status }
      );
    }

    let roles = [];
    try {
      roles = text ? JSON.parse(text) : [];
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from backend', details: text },
        { status: 500 }
      );
    }

    // Apply client-side filtering based on search criteria
    let filteredRoles = roles;

    // Apply search filter if provided
    if (searchBody.search) {
      const searchTerm = searchBody.search.toLowerCase();
      filteredRoles = filteredRoles.filter((role: any) =>
        role.name?.toLowerCase().includes(searchTerm) ||
        role.rolePermissions?.some((rp: any) => 
          rp.permission?.name?.toLowerCase().includes(searchTerm)
        ) ||
        role.userRoles?.some((ur: any) => 
          ur.user?.email?.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Apply complex filters if provided
    if (searchBody.filters && searchBody.filters.length > 0) {
      filteredRoles = filteredRoles.filter((role: any) => {
        return searchBody.filters.every((filter: any) => {
          const { field, operator, value } = filter;
          const fieldValue = role[field];

          switch (operator) {
            case 'contains':
              return fieldValue?.toString().toLowerCase().includes(value?.toLowerCase());
            case 'equals':
              return fieldValue === value;
            case 'not_equals':
              return fieldValue !== value;
            case 'greater_than':
              return fieldValue > value;
            case 'less_than':
              return fieldValue < value;
            case 'between':
              return fieldValue >= value[0] && fieldValue <= value[1];
            default:
              return true;
          }
        });
      });
    }

    // Apply sorting if provided
    if (searchBody.sort) {
      const { field, direction } = searchBody.sort;
      filteredRoles.sort((a: any, b: any) => {
        let aValue = a[field];
        let bValue = b[field];

        // Handle special fields
        if (field === 'permissionCount') {
          aValue = a.rolePermissions?.length || 0;
          bValue = b.rolePermissions?.length || 0;
        } else if (field === 'userCount') {
          aValue = a.userRoles?.length || 0;
          bValue = b.userRoles?.length || 0;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination if provided
    const page = searchBody.page || 1;
    const limit = searchBody.limit || 10;
    const offset = (page - 1) * limit;
    const paginatedRoles = filteredRoles.slice(offset, offset + limit);

    // Add computed fields for better display
    const enrichedRoles = paginatedRoles.map((role: any) => ({
      ...role,
      permissionCount: role.rolePermissions?.length || 0,
      userCount: role.userRoles?.length || 0,
    }));

    return NextResponse.json({
      data: enrichedRoles,
      total: filteredRoles.length,
      page,
      limit,
      totalPages: Math.ceil(filteredRoles.length / limit)
    });

  } catch (error) {
    console.error('Error searching platform roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 