import { NextRequest, NextResponse } from 'next/server';
import { serverDelete } from '@/shared/services/api/server-client';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await serverDelete('/tenants/bulk', { body: JSON.stringify(body) }, req);
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error for DELETE /tenants/bulk-delete:', error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 