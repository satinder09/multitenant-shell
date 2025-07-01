// Health check API route that proxies to backend
import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';

export async function GET(req: NextRequest) {
  try {
    // Proxy health check to backend using per-request server API client
    const api = createServerApiClient(req);
    const backendResponse = await api.get<Record<string, any>>('/health');
    // Extract backend data
    const healthData = backendResponse.data;
    
    return NextResponse.json({
      ...healthData,
      frontend: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      }
    }, {
      status: 200,
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