import { NextRequest, NextResponse } from 'next/server';
import { getModuleConfig } from '@/lib/modules/module-registry';

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

/**
 * Build field tree from module configuration
 * Returns ALL fields regardless of visibility or filterability settings
 * to allow advanced search on any field
 */
async function buildFieldTreeFromConfig(
  moduleName: string, 
  parentPath: string[] = [], 
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FieldNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const config = await getModuleConfig(moduleName);
  if (!config) {
    return [];
  }

  const fields: FieldNode[] = [];

  // Build fields from column definitions
  for (const column of config.columns) {
    // Include ALL fields in the field selector for advanced search
    // Users should be able to filter on any field, including hidden ones
    // Make sure we only use the actual field name and display label

    // Skip any invalid or malformed field definitions
    if (!column.field || !column.display) {
      console.warn('Skipping invalid column definition:', column);
      continue;
    }

    const fieldNode: FieldNode = {
      name: column.field,
      label: column.display,
      type: column.type || 'string',
      path: [...parentPath, column.field],
      hasChildren: false
    };

    // Add options if available
    if (column.options) {
      fieldNode.options = column.options.map(opt => ({
        value: opt.value,
        label: opt.label
      }));
    }

    // Add reference fields as children (if not at max depth)
    if (column.reference && currentDepth < maxDepth - 1) {
      fieldNode.hasChildren = true;
      // Note: For now, we'll mark as having children but won't traverse
      // In a full implementation, we'd recursively load the referenced config
    }

    fields.push(fieldNode);
  }

  return fields;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const { searchParams } = new URL(request.url);
    const parentParam = searchParams.get('parent');
    const maxDepthParam = searchParams.get('maxDepth');
    
    // Parse parent path
    const parentPath = parentParam ? parentParam.split('.') : [];
    const maxDepth = maxDepthParam ? parseInt(maxDepthParam) : 3;
    
    // Get module config via registry
    const config = await getModuleConfig(module);
    if (!config) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Module configuration not found for: ${module}`,
          fields: []
        },
        { status: 404 }
      );
    }
    
    // Build field tree from module configuration
    const fields = await buildFieldTreeFromConfig(module, parentPath, maxDepth);
    
    return NextResponse.json({
      success: true,
      fields,
      parentPath,
      tableName: config.sourceTable,
      moduleName: config.module.name,
      moduleTitle: config.module.title
    });
    
  } catch (error) {
    console.error('Error in field-tree API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch field tree',
        fields: []
      },
      { status: 500 }
    );
  }
} 