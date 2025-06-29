import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/shared/services/api';

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
    const response = await fetch(`${backendUrl}/platform-rbac/roles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
        'Cache-Control': 'no-cache',
      },
    });
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch platform roles', details: text },
        { status: response.status }
      );
    }

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'Invalid JSON from backend', details: text };
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching platform roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    const response = await fetch(`${backendUrl}/platform-rbac/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Host': req.headers.get('host') || '',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create platform role', details: text },
        { status: response.status }
      );
    }

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'Invalid JSON from backend', details: text };
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating platform role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 