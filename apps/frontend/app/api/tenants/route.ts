import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

// Handler for GET /api/tenants (fetch all)
export async function GET(req: NextRequest) {
  try {
    const serverApi = new ServerApiClient();
    const response = await serverApi.get('/tenants', {}, req);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API proxy error for GET /tenants:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
}

// Handler for POST /api/tenants (create)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const serverApi = new ServerApiClient();
    const response = await serverApi.post('/tenants', body, {}, req);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API proxy error for POST /tenants:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 