import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const field = searchParams.get('field');
    const search = searchParams.get('search') || '';

    if (!module || !field) {
      return NextResponse.json(
        { error: 'Module and field parameters are required' },
        { status: 400 }
      );
    }

    // Get real dropdown options based on the field type
    const options = await getRealDropdownOptions(module, field, search, request);

    return NextResponse.json({
      options,
      success: true
    });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dropdown options' },
      { status: 500 }
    );
  }
}

async function getRealDropdownOptions(
  module: string, 
  field: string, 
  search: string,
  request: NextRequest
): Promise<Array<{ value: any; label: string }>> {
  
  // Handle enum fields with predefined values
  if (field === 'isActive') {
    return [
      { value: true, label: 'Active' },
      { value: false, label: 'Inactive' }
    ];
  }

  if (field === 'isSuperAdmin') {
    return [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' }
    ];
  }

  if (field === 'impersonationSessions.status') {
    return [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'ENDED', label: 'Ended' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'REVOKED', label: 'Revoked' }
    ];
  }

  if (field === 'accessLogs.accessType') {
    return [
      { value: 'SECURE_LOGIN', label: 'Secure Login' },
      { value: 'IMPERSONATION', label: 'Impersonation' },
      { value: 'DIRECT_ACCESS', label: 'Direct Access' }
    ];
  }

  // For dynamic fields, fetch unique values from the backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    let apiUrl: string;

    switch (module) {
      case 'tenants':
        apiUrl = `${backendUrl}/tenants`;
        break;
      case 'users':
        apiUrl = `${backendUrl}/platform/users`;
        break;
      default:
        return [];
    }

    // Fetch all data from backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      console.error(`Backend API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Extract unique values for the specified field
    const uniqueValues = new Set<string>();
    
    data.forEach((item: any) => {
      const value = getNestedValue(item, field);
      if (value !== null && value !== undefined && value !== '') {
        uniqueValues.add(String(value));
      }
    });

    // Convert to dropdown options and filter by search
    let options = Array.from(uniqueValues).map(value => ({
      value: value,
      label: value
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      options = options.filter(option => 
        option.label.toLowerCase().includes(searchLower)
      );
    }

    // Sort options alphabetically
    options.sort((a, b) => a.label.localeCompare(b.label));

    // Limit to 50 options for performance
    return options.slice(0, 50);

  } catch (error) {
    console.error(`Error fetching dropdown options for ${module}.${field}:`, error);
    return [];
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
} 