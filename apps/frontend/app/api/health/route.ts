// Health check API route that proxies to backend
import { NextRequest, NextResponse } from 'next/server';
import { serverGet } from '@/shared/services/api/server-client';

export async function GET(req: NextRequest) {
  try {
    // Proxy health check to backend
    const backendRes = await serverGet('/health', { skipCSRF: true }, req);
    
    // Create response with backend data
    const healthData = await backendRes.json();
    
    return NextResponse.json({
      ...healthData,
      frontend: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      }
    }, {
      status: backendRes.status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('[API HEALTH] Error:', error);
    
    // Return frontend-only health if backend fails
    return NextResponse.json({
      status: 'degraded',
      frontend: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
      backend: {
        status: 'down',
        error: 'Backend health check failed',
      }
    }, { 
      status: 503
    });
  }
} 