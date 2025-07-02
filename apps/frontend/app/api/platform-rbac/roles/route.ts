import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const serverClient = createServerApiClient(req);
    const response = await serverClient.get('/platform-rbac/roles');

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to fetch platform roles', details: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching platform roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    
    const serverClient = createServerApiClient(req);
    const response = await serverClient.post('/platform-rbac/roles', body);

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to create platform role', details: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating platform role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 