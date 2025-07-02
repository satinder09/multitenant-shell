import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const serverClient = createServerApiClient(req);
    const response = await serverClient.get(`/platform-rbac/roles/${id}`);

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to fetch platform role', details: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching platform role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    
    const serverClient = createServerApiClient(req);
    const response = await serverClient.put(`/platform-rbac/roles/${id}`, body);

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to update platform role', details: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating platform role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = req.cookies.get('Authentication')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const serverClient = createServerApiClient(req);
    const response = await serverClient.delete(`/platform-rbac/roles/${id}`);

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to delete platform role', details: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting platform role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 