import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    
    // Forward the request to the backend tenant service
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://lvh.me:4000';
    
    // For tenant resolution, we need basic headers but not authentication
    // This endpoint should be accessible to unauthenticated users (e.g., on login page)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Only forward authentication headers if they exist (optional for this endpoint)
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${backendUrl}/tenants/by-subdomain/${subdomain}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tenant by subdomain:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
} 