import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

// Handler for POST /api/tenants/search
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔍 Frontend API: Proxying tenant search request to backend');
    
    const response = await serverPost('/tenants/search', body, {}, req);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Backend tenant search failed:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Tenant search successful, returning data');
    return NextResponse.json(data);
  } catch (error) {
    console.error(`❌ API proxy error for POST /tenants/search:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 