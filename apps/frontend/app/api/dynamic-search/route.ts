import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';
import { getModuleConfig } from '@/shared/modules/module-registry';

interface DynamicSearchRequest {
  moduleName: string;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: {
    rootGroup: {
      id: string;
      logic: 'AND' | 'OR';
      rules: Array<{
        id: string;
        field: string;
        operator: string;
        value: any;
        fieldPath: string[];
        label: string;
      }>;
      groups: any[];
    };
  };
  // NEW: Include config data directly to avoid server-side registry dependency
  moduleConfig?: {
    sourceTable: string;
    primaryKey?: string;
    columns: Array<{
      field: string;
      type?: string;
      operators?: string[];
      options?: any[];
    }>;
    relations?: Record<string, any>;
    virtualFields?: Record<string, any>;
    computedFields?: Record<string, string>;
  };
}

interface BackendSearchPayload {
  sourceTable: string;
  primaryKey: string;
  fields: string[];
  page: number;
  limit: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  complexFilter?: any;
  fieldMappings: Record<string, {
    type: string;
    operators: string[];
    options?: any[];
  }>;
  // NEW: Multi-table support
  relations?: Record<string, any>;
  virtualFields?: Record<string, any>;
  computedFields?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const requestData: DynamicSearchRequest = await req.json();
    const { moduleName, page = 1, limit = 10, sort, complexFilter, moduleConfig: passedConfig } = requestData;

    // Input validation
    if (!moduleName || typeof moduleName !== 'string') {
      return NextResponse.json(
        { error: 'moduleName is required and must be a string' },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    console.log(`🔍 Dynamic Search: Processing request for module "${moduleName}"`);

    // Get module configuration - prefer passed config, fallback to registry
    let moduleConfig: any;
    if (passedConfig) {
      moduleConfig = passedConfig;
      console.log(`✅ Using passed config for module: ${moduleName}`);
    } else {
      moduleConfig = await getModuleConfig(moduleName);
      if (!moduleConfig) {
        return NextResponse.json(
          { error: `Module configuration not found for: ${moduleName}` },
          { status: 404 }
        );
      }
    }

    // Validate module configuration
    if (!moduleConfig.sourceTable || !moduleConfig.columns || moduleConfig.columns.length === 0) {
      return NextResponse.json(
        { error: `Invalid module configuration for: ${moduleName}` },
        { status: 500 }
      );
    }

    // Extract field information from module config
    const fields = moduleConfig.columns.map((col: any) => col.field);
    const fieldMappings = moduleConfig.columns.reduce((acc: Record<string, any>, col: any) => {
      acc[col.field] = {
        type: col.type || 'string',
        operators: col.operators || [],
        options: col.options || []
      };
      return acc;
    }, {} as Record<string, any>);

    // Create backend search payload
    const backendPayload: BackendSearchPayload = {
      sourceTable: moduleConfig.sourceTable,
      primaryKey: moduleConfig.primaryKey || 'id',
      fields,
      page,
      limit,
      sort,
      complexFilter,
      fieldMappings,
      // NEW: Multi-table support
      relations: moduleConfig.relations,
      virtualFields: moduleConfig.virtualFields,
      computedFields: moduleConfig.computedFields
    };

    console.log(`🎯 Dynamic Search: Sending payload to backend for table "${moduleConfig.sourceTable}"`);

    // Send to universal backend search endpoint
    const serverApi = new ServerApiClient();
    const response = await serverApi.post('/search/universal', backendPayload, {}, req);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Backend universal search failed:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Dynamic search successful, returning data');
    return NextResponse.json(data);

  } catch (error) {
    console.error(`❌ Dynamic search error:`, error);
    return NextResponse.json({ message: 'Dynamic search error' }, { status: 500 });
  }
} 