import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api';

// Handler for GET /api/platform/admin/users (fetch all platform users)
export async function GET(req: NextRequest) {
  const backendUrl = getBackendUrl(req);
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/platform/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch platform users', details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching platform users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for POST /api/platform/admin/users (create platform user)
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
    const body = await req.json();
    const response = await fetch(`${backendUrl}/platform/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to create platform user', details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating platform user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 