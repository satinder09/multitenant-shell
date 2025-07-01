import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Use server-side client with automatic CSRF protection
    const response = await serverPost('/tenant-access/secure-login', body, {
      timeout: 10000
    }, request);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { 
          error: 'Failed to perform secure login',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error performing secure login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 