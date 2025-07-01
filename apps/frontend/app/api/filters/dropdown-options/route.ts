import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field, module, search, page = 1, limit = 50 } = body;

    // Mock data for different fields and modules
    const mockData: Record<string, Record<string, any[]>> = {
      users: {
        role: [
          { id: 'admin', name: 'Administrator', color: '#dc2626', description: 'Full system access' },
          { id: 'manager', name: 'Manager', color: '#059669', description: 'Team management access' },
          { id: 'user', name: 'Regular User', color: '#6b7280', description: 'Standard user access' },
          { id: 'guest', name: 'Guest', color: '#9ca3af', description: 'Limited read-only access' },
          { id: 'moderator', name: 'Moderator', color: '#7c3aed', description: 'Content moderation access' },
          { id: 'analyst', name: 'Data Analyst', color: '#0891b2', description: 'Analytics and reporting access' },
          { id: 'support', name: 'Support Agent', color: '#ea580c', description: 'Customer support access' }
        ],
        department: [
          { id: 'engineering', name: 'Engineering', color: '#3b82f6', description: 'Software development and infrastructure' },
          { id: 'marketing', name: 'Marketing', color: '#ef4444', description: 'Brand and customer acquisition' },
          { id: 'sales', name: 'Sales', color: '#10b981', description: 'Revenue generation and client relations' },
          { id: 'hr', name: 'Human Resources', color: '#f59e0b', description: 'People operations and talent management' },
          { id: 'finance', name: 'Finance', color: '#8b5cf6', description: 'Financial planning and accounting' },
          { id: 'operations', name: 'Operations', color: '#06b6d4', description: 'Business operations and logistics' },
          { id: 'legal', name: 'Legal', color: '#84cc16', description: 'Legal compliance and contracts' }
        ],
        location: [
          { id: 'us-ny', name: 'New York, USA', color: '#1f2937', description: 'North America HQ' },
          { id: 'us-ca', name: 'San Francisco, USA', color: '#374151', description: 'West Coast Office' },
          { id: 'uk-london', name: 'London, UK', color: '#4b5563', description: 'European HQ' },
          { id: 'ca-toronto', name: 'Toronto, Canada', color: '#6b7280', description: 'Canadian Office' },
          { id: 'de-berlin', name: 'Berlin, Germany', color: '#9ca3af', description: 'DACH Region Office' },
          { id: 'sg-singapore', name: 'Singapore', color: '#d1d5db', description: 'APAC HQ' },
          { id: 'au-sydney', name: 'Sydney, Australia', color: '#e5e7eb', description: 'Australia Office' }
        ]
      },
      tenants: {
        name: [
          { id: 'acme-corp', name: 'Acme Corporation', color: '#3b82f6', description: 'Global manufacturing company' },
          { id: 'tech-innovations', name: 'Tech Innovations Inc.', color: '#10b981', description: 'Software development startup' },
          { id: 'green-energy-solutions', name: 'Green Energy Solutions', color: '#059669', description: 'Renewable energy provider' },
          { id: 'healthcare-plus', name: 'Healthcare Plus', color: '#dc2626', description: 'Medical services provider' },
          { id: 'financial-services-group', name: 'Financial Services Group', color: '#7c3aed', description: 'Banking and finance' },
          { id: 'retail-masters', name: 'Retail Masters', color: '#f59e0b', description: 'E-commerce platform' },
          { id: 'education-hub', name: 'Education Hub', color: '#0891b2', description: 'Online learning platform' },
          { id: 'logistics-pro', name: 'Logistics Pro', color: '#ea580c', description: 'Supply chain management' },
          { id: 'creative-agency', name: 'Creative Agency', color: '#ec4899', description: 'Digital marketing and design' },
          { id: 'consulting-experts', name: 'Consulting Experts', color: '#84cc16', description: 'Business consulting firm' },
          { id: 'food-delivery-network', name: 'Food Delivery Network', color: '#f97316', description: 'Restaurant delivery service' },
          { id: 'real-estate-ventures', name: 'Real Estate Ventures', color: '#6366f1', description: 'Property management' },
          { id: 'automotive-solutions', name: 'Automotive Solutions', color: '#8b5cf6', description: 'Car dealership network' },
          { id: 'travel-connect', name: 'Travel Connect', color: '#06b6d4', description: 'Travel booking platform' },
          { id: 'sports-management', name: 'Sports Management', color: '#ef4444', description: 'Athletic club management' }
        ],
        status: [
          { id: 'active', name: 'Active', color: '#10b981', description: 'Fully operational tenant' },
          { id: 'suspended', name: 'Suspended', color: '#f59e0b', description: 'Temporarily suspended' },
          { id: 'inactive', name: 'Inactive', color: '#6b7280', description: 'Not currently active' },
          { id: 'trial', name: 'Trial', color: '#3b82f6', description: 'Trial period active' },
          { id: 'expired', name: 'Expired', color: '#ef4444', description: 'Subscription expired' }
        ],
        plan: [
          { id: 'free', name: 'Free Plan', color: '#6b7280', description: 'Basic features only' },
          { id: 'starter', name: 'Starter Plan', color: '#3b82f6', description: 'Small team features' },
          { id: 'professional', name: 'Professional Plan', color: '#059669', description: 'Advanced features' },
          { id: 'enterprise', name: 'Enterprise Plan', color: '#dc2626', description: 'Full feature set' }
        ]
      }
    };

    // Get data for the specified module and field
    const moduleData = mockData[module];
    if (!moduleData) {
      return NextResponse.json(
        { error: `Module '${module}' not found` },
        { status: 404 }
      );
    }

    const fieldData = moduleData[field];
    if (!fieldData) {
      return NextResponse.json(
        { error: `Field '${field}' not found in module '${module}'` },
        { status: 404 }
      );
    }

    // Apply search filter if provided
    let filteredData = fieldData;
    if (search && search.length >= 2) {
      filteredData = fieldData.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Simulate network delay for testing
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      data: {
        options: paginatedData,
        total: filteredData.length,
        page,
        limit,
        hasMore: endIndex < filteredData.length
      },
      success: true
    });

  } catch (error) {
    console.error('Filter dropdown options error:', error);
    return NextResponse.json(
      { error: 'Failed to load dropdown options' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const field = searchParams.get('field');
  const module = searchParams.get('module');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Reuse POST logic for GET requests
  const mockRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ field, module, search, page, limit }),
    headers: { 'Content-Type': 'application/json' }
  });

  return POST(mockRequest as NextRequest);
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
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