import { NextRequest, NextResponse } from 'next/server';
import { generateConfigFromSchema } from '@/lib/modules/schema-config-generator';

interface ModuleDataRequest {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: any;
  fields?: string[]; // Specific fields to return
}

interface ModuleDataResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    moduleName: string;
    sourceTable: string;
    totalFiltered: number;
    totalUnfiltered: number;
    availableFields: string[];
  };
  config?: any; // Include module config if requested
}

// Module to backend endpoint mapping
const MODULE_BACKEND_MAPPING: Record<string, { endpoint: string; method: 'GET' | 'POST' }> = {
  'tenants': { endpoint: '/tenants/search', method: 'POST' },
  'users': { endpoint: '/platform/users', method: 'GET' },
  'permissions': { endpoint: '/platform-rbac/permissions', method: 'GET' },
  'roles': { endpoint: '/platform-rbac/roles', method: 'GET' },
  'impersonation': { endpoint: '/tenant-access/sessions', method: 'GET' },
  'access-logs': { endpoint: '/platform/access-logs', method: 'GET' }
};

// GET endpoint for simple data retrieval
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const requestData: ModuleDataRequest = {
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '25'),
      sortBy: searchParams.get('sortBy') ? {
        field: searchParams.get('sortField') || 'createdAt',
        direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc'
      } : undefined,
      fields: searchParams.get('fields')?.split(','),
    };

    const includeConfig = searchParams.get('includeConfig') === 'true';

    return await handleModuleDataRequest(module, requestData, request, includeConfig);
  } catch (error) {
    console.error('Error in module GET API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint for complex filtering and search
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const body: ModuleDataRequest & { includeConfig?: boolean } = await request.json();
    
    const { includeConfig, ...requestData } = body;

    return await handleModuleDataRequest(module, requestData, request, includeConfig);
  } catch (error) {
    console.error('Error in module POST API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleModuleDataRequest(
  moduleName: string,
  requestData: ModuleDataRequest,
  request: NextRequest,
  includeConfig: boolean = false
): Promise<NextResponse> {
  // Generate module config to get table source and field information
  let moduleConfig;
  try {
    moduleConfig = generateConfigFromSchema(getTableNameFromModule(moduleName));
  } catch (error) {
    return NextResponse.json(
      { error: `Module '${moduleName}' not found or not configured` },
      { status: 404 }
    );
  }

  const sourceTable = moduleConfig.sourceTable;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  try {
    // Get backend endpoint configuration
    const backendConfig = MODULE_BACKEND_MAPPING[moduleName];
    if (!backendConfig) {
      // Fallback to generic endpoint construction
      const endpoint = `/api/${moduleName}`;
      return await fetchFromGenericEndpoint(backendUrl, endpoint, requestData, request, moduleConfig, includeConfig);
    }

    // Use specific backend endpoint
    const apiUrl = `${backendUrl}${backendConfig.endpoint}`;
    const method = backendConfig.method;

    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'cookie': request.headers.get('cookie') || '',
      },
      ...(method === 'POST' && { body: JSON.stringify(requestData) }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform and format the response
    const result = await formatModuleResponse(
      moduleName,
      sourceTable,
      rawData,
      requestData,
      moduleConfig,
      includeConfig
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error fetching data for module ${moduleName}:`, error);
    
    // Fallback to mock/transformed data if backend is unavailable
    try {
      const fallbackResult = await generateFallbackData(moduleName, sourceTable, requestData, moduleConfig, includeConfig);
      return NextResponse.json(fallbackResult);
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          error: 'Backend unavailable and fallback failed', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 503 }
      );
    }
  }
}

async function fetchFromGenericEndpoint(
  backendUrl: string,
  endpoint: string,
  requestData: ModuleDataRequest,
  request: NextRequest,
  moduleConfig: any,
  includeConfig: boolean
) {
  const apiUrl = `${backendUrl}${endpoint}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'cookie': request.headers.get('cookie') || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Generic endpoint error: ${response.status} ${response.statusText}`);
  }

  const rawData = await response.json();
  
  return NextResponse.json(
    await formatModuleResponse(
      endpoint.split('/').pop() || 'unknown',
      moduleConfig.sourceTable,
      rawData,
      requestData,
      moduleConfig,
      includeConfig
    )
  );
}

async function formatModuleResponse(
  moduleName: string,
  sourceTable: string,
  rawData: any,
  requestData: ModuleDataRequest,
  moduleConfig: any,
  includeConfig: boolean
): Promise<ModuleDataResponse> {
  // Handle different response formats from backend
  let dataArray: any[];
  let totalUnfiltered: number;
  let pagination: any = null;

  if (Array.isArray(rawData)) {
    dataArray = rawData;
    totalUnfiltered = rawData.length;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
    totalUnfiltered = rawData.pagination?.total || rawData.totalUnfiltered || rawData.data.length;
    pagination = rawData.pagination;
  } else {
    dataArray = [];
    totalUnfiltered = 0;
  }

  // Apply client-side filtering if backend doesn't handle it
  let filteredData = [...dataArray];

  // Apply search filter if not handled by backend
  if (requestData.search && !pagination) {
    const searchLower = requestData.search.toLowerCase();
    filteredData = filteredData.filter(item => {
      // Search across all visible string fields
      return moduleConfig.columns
        .filter((col: any) => col.visible && ['string', 'text'].includes(col.type))
        .some((col: any) => {
          const value = getNestedValue(item, col.field);
          return value && String(value).toLowerCase().includes(searchLower);
        });
    });
  }

  // Apply complex filters if not handled by backend
  if (requestData.complexFilter && !pagination) {
    filteredData = filteredData.filter(item => {
      return evaluateFilterGroup(item, requestData.complexFilter.rootGroup);
    });
  }

  // Apply sorting if not handled by backend
  if (requestData.sortBy && !pagination) {
    filteredData.sort((a, b) => {
      const aValue = getNestedValue(a, requestData.sortBy!.field);
      const bValue = getNestedValue(b, requestData.sortBy!.field);
      const multiplier = requestData.sortBy!.direction === 'desc' ? -1 : 1;
      
      if (aValue < bValue) return -1 * multiplier;
      if (aValue > bValue) return 1 * multiplier;
      return 0;
    });
  }

  // Apply pagination if not handled by backend
  let paginatedData = filteredData;
  let finalPagination;

  if (!pagination) {
    const page = requestData.page || 1;
    const limit = requestData.limit || 25;
    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    paginatedData = filteredData.slice(startIndex, endIndex);
    
    finalPagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  } else {
    finalPagination = pagination;
  }

  // Filter fields if requested
  if (requestData.fields && requestData.fields.length > 0) {
    paginatedData = paginatedData.map(item => {
      const filteredItem: any = {};
      requestData.fields!.forEach(field => {
        filteredItem[field] = getNestedValue(item, field);
      });
      return filteredItem;
    });
  }

  // Get available fields from config
  const availableFields = moduleConfig.columns
    .filter((col: any) => col.visible)
    .map((col: any) => col.field);

  const result: ModuleDataResponse = {
    data: paginatedData,
    pagination: finalPagination,
    metadata: {
      moduleName,
      sourceTable,
      totalFiltered: filteredData.length,
      totalUnfiltered,
      availableFields
    }
  };

  if (includeConfig) {
    result.config = {
      columns: moduleConfig.columns,
      actions: moduleConfig.actions,
      display: moduleConfig.display,
      module: moduleConfig.module
    };
  }

  return result;
}

async function generateFallbackData(
  moduleName: string,
  sourceTable: string,
  requestData: ModuleDataRequest,
  moduleConfig: any,
  includeConfig: boolean
): Promise<ModuleDataResponse> {
  // Generate mock data based on module config
  const mockData: any[] = [];
  const limit = requestData.limit || 25;
  
  for (let i = 1; i <= limit; i++) {
    const item: any = { id: `mock-${i}` };
    
    moduleConfig.columns.forEach((col: any) => {
      if (col.visible) {
        switch (col.type) {
          case 'string':
            item[col.field] = `Sample ${col.display} ${i}`;
            break;
          case 'number':
            item[col.field] = Math.floor(Math.random() * 100) + 1;
            break;
          case 'boolean':
            item[col.field] = Math.random() > 0.5;
            break;
          case 'datetime':
            item[col.field] = new Date(Date.now() - Math.random() * 10000000000).toISOString();
            break;
          default:
            item[col.field] = `Mock ${col.field} ${i}`;
        }
      }
    });
    
    mockData.push(item);
  }

  return formatModuleResponse(moduleName, sourceTable, mockData, requestData, moduleConfig, includeConfig);
}

function getTableNameFromModule(moduleName: string): string {
  const MODULE_TABLE_MAPPING: Record<string, string> = {
    'tenants': 'Tenant',
    'users': 'User', 
    'permissions': 'TenantPermission',
    'roles': 'Role',
    'impersonation': 'ImpersonationSession',
    'access-logs': 'AccessLog'
  };

  const tableName = MODULE_TABLE_MAPPING[moduleName];
  if (!tableName) {
    throw new Error(`Module '${moduleName}' not found in mapping`);
  }
  
  return tableName;
}

function evaluateFilterGroup(item: any, group: any): boolean {
  if (!group.rules || group.rules.length === 0) return true;

  const results = group.rules.map((rule: any) => {
    if (rule.rules) {
      return evaluateFilterGroup(item, rule);
    } else {
      return evaluateFilterRule(item, rule);
    }
  });

  if (group.logic === 'OR') {
    return results.some((result: boolean) => result);
  } else {
    return results.every((result: boolean) => result);
  }
}

function evaluateFilterRule(item: any, rule: any): boolean {
  const fieldPath = rule.fieldPath ? rule.fieldPath.join('.') : rule.field;
  const value = getNestedValue(item, fieldPath);
  const filterValue = rule.value;

  switch (rule.operator) {
    case 'equals':
      return value === filterValue;
    case 'not_equals':
      return value !== filterValue;
    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'not_contains':
      return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'starts_with':
      return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
    case 'ends_with':
      return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
    case 'greater_than':
      return Number(value) > Number(filterValue);
    case 'less_than':
      return Number(value) < Number(filterValue);
    case 'greater_equal':
      return Number(value) >= Number(filterValue);
    case 'less_equal':
      return Number(value) <= Number(filterValue);
    case 'is_empty':
      return !value || value === '';
    case 'is_not_empty':
      return value && value !== '';
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(value);
    case 'not_in':
      return Array.isArray(filterValue) && !filterValue.includes(value);
    default:
      return true;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
} 