import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';

// Handler for DELETE /api/tenants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Use unified server API client to automatically forward cookies & CSRF
  const api = createServerApiClient(req);

  try {
    const backendResponse = await api.delete(`/tenants/${id}`);
    if (!backendResponse.success) {
      return NextResponse.json({ message: backendResponse.error || 'Failed to delete tenant' }, { status:  backendResponse.error ? 400 : 500 });
    }

    // Return 204 No Content on success
    // Return a success response, often with no body for DELETE
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API proxy error for DELETE /tenants/${id}:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
}

// Handler for PATCH /api/tenants/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Parse incoming request body (expects `isActive` boolean)
  const body = await req.json();

  try {
    const api = createServerApiClient(req);
    const backendResponse = await api.patch(`/tenants/${id}`, body);
    if (!backendResponse.success) {
      return NextResponse.json({ message: backendResponse.error || 'Failed to update tenant' }, { status: 400 });
    }

    // Return the updated tenant data
    return NextResponse.json(backendResponse.data);
  } catch (error) {
    console.error(`API proxy error for PATCH /tenants/${id}:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 