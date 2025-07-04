import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const serverApi = new ServerApiClient();
    const response = await serverApi.patch('/tenants/bulk', body, {}, req);
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error for PATCH /tenants/bulk-update:', error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 