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
    const response = await fetch(`${backendUrl}/rbac/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-forwarded-host': req.headers.get('host') || '',
        'Cache-Control': 'no-cache',
      },
    });
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: text },
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
    console.error('Error fetching permissions:', error);
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
    const response = await fetch(`${backendUrl}/rbac/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-forwarded-host': req.headers.get('host') || '',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create permission', details: text },
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
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 