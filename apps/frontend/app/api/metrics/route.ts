// Metrics API route that proxies to backend monitoring
import { NextRequest, NextResponse } from 'next/server';
import { serverGet } from '@/shared/services/api/server-client';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters to determine which metrics to fetch
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'dashboard';
    
    let endpoint: string;
    switch (type) {
      case 'performance':
        endpoint = '/metrics/performance';
        break;
      case 'business':
        endpoint = '/metrics/business';
        break;
      case 'health-score':
        endpoint = '/metrics/health-score';
        break;
      case 'alerts':
        endpoint = '/metrics/alerts';
        break;
      default:
        endpoint = '/metrics/dashboard';
    }
    
    // Proxy metrics request to backend
    const backendRes = await serverGet(endpoint, { skipCSRF: true }, req);
    
    if (!backendRes.ok) {
      throw new Error(`Backend metrics request failed: ${backendRes.status}`);
    }
    
    const metricsData = await backendRes.json();
    
    return NextResponse.json(metricsData, {
      status: backendRes.status,
      headers: {
        'Cache-Control': 'max-age=30', // Cache for 30 seconds
      },
    });

  } catch (error) {
    console.error('[API METRICS] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { 
      status: 500
    });
  }
} 