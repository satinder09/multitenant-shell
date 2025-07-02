// Performance optimization API route
import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'report';
    
    let endpoint: string;
    switch (action) {
      case 'report':
        endpoint = '/performance/report';
        break;
      case 'live':
        endpoint = '/performance/metrics/live';
        break;
      case 'benchmark':
        endpoint = '/performance/benchmark';
        break;
      default:
        endpoint = '/performance/report';
    }
    
    // Proxy performance request to backend
    const serverApi = new ServerApiClient();
    const backendRes = await serverApi.get(endpoint, { skipCSRF: true }, req);
    
    if (!backendRes.ok) {
      throw new Error(`Backend performance request failed: ${backendRes.status}`);
    }
    
    const performanceData = await backendRes.json();
    
    return NextResponse.json(performanceData, {
      status: backendRes.status,
      headers: {
        'Cache-Control': action === 'live' ? 'no-cache' : 'max-age=60', // Live metrics: no cache, others: 1 minute
      },
    });

  } catch (error) {
    console.error('[API PERFORMANCE] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch performance data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { 
      status: 500
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Proxy performance optimization request to backend
    const serverApi = new ServerApiClient();
    const backendRes = await serverApi.post('/performance/optimize', body, {}, req);
    
    if (!backendRes.ok) {
      throw new Error(`Backend performance optimization failed: ${backendRes.status}`);
    }
    
    const optimizationResult = await backendRes.json();
    
    return NextResponse.json(optimizationResult, {
      status: backendRes.status,
    });

  } catch (error) {
    console.error('[API PERFORMANCE] Optimization error:', error);
    
    return NextResponse.json({
      error: 'Performance optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { 
      status: 500
    });
  }
} 