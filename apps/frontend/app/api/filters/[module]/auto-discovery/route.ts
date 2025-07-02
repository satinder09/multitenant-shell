import { NextRequest, NextResponse } from 'next/server';
import { getModuleConfig } from '@/shared/modules/module-registry';
import { getEffectiveOperators } from '@/shared/modules/types';

// Convert operators from config format to API format
function convertOperators(operators: any[]): string[] {
  return operators.map(op => {
    // Convert modules/types operators to API format
    switch (op) {
      case 'greater_than_or_equal': return 'greater_equal';
      case 'less_than_or_equal': return 'less_equal';
      default: return op;
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    
    // Get module config via registry
    const config = await getModuleConfig(module);
    if (!config) {
      console.warn(`⚠️ Auto-discovery: No config found for module ${module}`);
      // Return empty structure instead of error for better UX
      return NextResponse.json({
        fields: [],
        relationships: [],
        nestedFields: [],
        success: true,
        note: `Module ${module} not yet registered - this is normal during initial page load`
      });
    }
    
    // Generate field definitions from config
    const fieldDefinitions = config.columns
      .filter(col => col.filterable !== false)
      .map(col => {
        const effectiveOperators = getEffectiveOperators(col);
        
        return {
          name: col.field,
          label: col.display,
          type: col.type || 'string',
          operators: convertOperators(effectiveOperators),
          renderType: getRenderType(col.type, col.options),
          isSearchable: col.searchable || false,
          options: col.options?.map(opt => ({
            value: opt.value,
            label: opt.label
          }))
        };
      });
    
    // Generate relationships from config (basic implementation)
    const relationships = config.columns
      .filter(col => col.reference)
      .map(col => ({
        name: col.field,
        label: col.display,
        type: 'relation',
        targetTable: typeof col.reference === 'function' ? 'Unknown' : col.reference?.sourceTable || 'Unknown'
      }));
    
    // Transform to nested fields format
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

function getRenderType(type?: string, options?: any[]): string {
  if (options && options.length > 0) {
    return 'select';
  }
  
  switch (type) {
    case 'boolean':
      return 'select';
    case 'date':
    case 'datetime':
      return 'date';
    case 'number':
      return 'number';
    default:
      return 'input';
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
  
  // Add relationship fields (basic implementation)
  relationships.forEach(relationship => {
    nestedFields.push({
      path: [relationship.name],
      label: relationship.label,
      type: relationship.type,
      operators: ['equals', 'not_equals'],
      renderType: 'select'
    });
  });
  
  return nestedFields;
} 