import { NextRequest, NextResponse } from 'next/server';
import { serverGet, serverPost } from '@/lib/api/server-client';

interface SearchRequest {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const body: SearchRequest = await request.json();

    // Get real data from backend
    const result = await fetchRealModuleData(module, body, request);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

async function fetchRealModuleData(
  moduleName: string, 
  params: SearchRequest,
  request: NextRequest
) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  
  try {
    // Call the real backend API
    let apiUrl: string;
    let apiParams: any = {};

    switch (moduleName) {
      case 'tenants':
        // Always use the search endpoint for optimized queries
        apiUrl = `${backendUrl}/tenants/search`;
        break;
      case 'users':
        apiUrl = `${backendUrl}/platform/users`;
        break;
      default:
        throw new Error(`Module ${moduleName} not supported`);
    }

    // Make the API call to backend - always POST for tenants to ensure optimization
    const response = moduleName === 'tenants' 
      ? await serverPost('/tenants/search', params, {}, request)
      : await serverGet(apiUrl.replace(backendUrl, ''), {}, request);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    
    // For tenants, the backend always handles filtering and pagination optimally
    if (moduleName === 'tenants') {
      return rawData;
    }
    
    // Transform the raw data into the expected format for other modules (legacy support)
    return transformRealData(moduleName, rawData, params);

  } catch (error) {
    console.error(`Error fetching real ${moduleName} data:`, error);
    throw error;
  }
}

function transformRealData(moduleName: string, rawData: any[], params: SearchRequest) {
  let filteredData = [...rawData];

  // Apply search filter
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredData = filteredData.filter(item => {
      switch (moduleName) {
        case 'tenants':
          return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.subdomain?.toLowerCase().includes(searchLower) ||
            item.dbName?.toLowerCase().includes(searchLower)
          );
        case 'users':
          return (
            item.email?.toLowerCase().includes(searchLower) ||
            item.name?.toLowerCase().includes(searchLower)
          );
        default:
          return true;
      }
    });
  }

  // Apply complex filters
  if (params.complexFilter?.rootGroup?.rules) {
    filteredData = filteredData.filter(item => {
      return evaluateFilterGroup(item, params.complexFilter.rootGroup);
    });
  }

  // Apply sorting
  if (params.sortBy) {
    filteredData.sort((a, b) => {
      const aValue = getNestedValue(a, params.sortBy!.field);
      const bValue = getNestedValue(b, params.sortBy!.field);
      const multiplier = params.sortBy!.direction === 'desc' ? -1 : 1;
      
      if (aValue < bValue) return -1 * multiplier;
      if (aValue > bValue) return 1 * multiplier;
      return 0;
    });
  }

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const total = filteredData.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    metadata: {
      totalFiltered: total,
      totalUnfiltered: rawData.length
    }
  };
}

function evaluateFilterGroup(item: any, group: any): boolean {
  if (!group.rules || group.rules.length === 0) return true;

  const results = group.rules.map((rule: any) => {
    if (rule.rules) {
      // Nested group
      return evaluateFilterGroup(item, rule);
    } else {
      // Individual rule
      return evaluateFilterRule(item, rule);
    }
  });

  // Apply the group's logic (AND/OR)
  if (group.logic === 'OR') {
    return results.some((result: boolean) => result);
  } else {
    return results.every((result: boolean) => result);
  }
}

function evaluateFilterRule(item: any, rule: any): boolean {
  // Use fieldPath if available, otherwise fall back to field
  const fieldPath = rule.fieldPath ? rule.fieldPath.join('.') : rule.field;
  const value = getNestedValue(item, fieldPath);
  const filterValue = rule.value;
  


  // Handle array values (from nested relationships)
  const checkValue = (val: any, operator: string, filterVal: any): boolean => {
    switch (operator) {
      case 'equals':
        return val === filterVal;
      case 'not_equals':
        return val !== filterVal;
      case 'contains':
        return String(val).toLowerCase().includes(String(filterVal).toLowerCase());
      case 'not_contains':
        return !String(val).toLowerCase().includes(String(filterVal).toLowerCase());
      case 'starts_with':
        return String(val).toLowerCase().startsWith(String(filterVal).toLowerCase());
      case 'ends_with':
        return String(val).toLowerCase().endsWith(String(filterVal).toLowerCase());
      case 'greater_than':
        return Number(val) > Number(filterVal);
      case 'less_than':
        return Number(val) < Number(filterVal);
      case 'greater_equal':
        return Number(val) >= Number(filterVal);
      case 'less_equal':
        return Number(val) <= Number(filterVal);
      case 'is_empty':
        return !val || val === '';
      case 'is_not_empty':
        return val && val !== '';
      case 'in':
        return Array.isArray(filterVal) && filterVal.includes(val);
      case 'not_in':
        return Array.isArray(filterVal) && !filterVal.includes(val);
      default:
        return true;
    }
  };

  // If value is an array (from nested relationships), check if any item matches
  if (Array.isArray(value)) {
    return value.some(val => checkValue(val, rule.operator, filterValue));
  }

  // Single value check
  return checkValue(value, rule.operator, filterValue);
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (!current) return null;
    
    // Handle arrays - check if any item in the array has the property
    if (Array.isArray(current)) {
      return current.map(item => item && item[key] !== undefined ? item[key] : null)
                   .filter(val => val !== null);
    }
    
    return current[key] !== undefined ? current[key] : null;
  }, obj);
} 