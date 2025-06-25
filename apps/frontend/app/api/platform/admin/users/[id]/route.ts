import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api';

// Handler for GET /api/platform/admin/users/[id] (fetch single platform user)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const backendUrl = getBackendUrl(req);
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const response = await fetch(`${backendUrl}/platform/admin/users/${id}`, {
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
        { error: 'Failed to fetch platform user', details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching platform user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for PATCH /api/platform/admin/users/[id] (update platform user)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    
    const response = await fetch(`${backendUrl}/platform/admin/users/${id}`, {
      method: 'PATCH',
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
        { error: 'Failed to update platform user', details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating platform user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for DELETE /api/platform/admin/users/[id] (delete platform user)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const backendUrl = getBackendUrl(req);
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const response = await fetch(`${backendUrl}/platform/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to delete platform user', details: text },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting platform user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 