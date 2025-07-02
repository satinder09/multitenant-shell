import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';

export async function GET(req: NextRequest) {
  console.log(`Forwarding 'me' request to backend`);

  try {
    const serverClient = createServerApiClient(req);
    const response = await serverClient.get('/auth/me');

    if (!response.success) {
      return NextResponse.json(
        { message: `Error from backend: ${response.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json(response.data);

  } catch (error) {
    console.error('Auth "me" proxy fetch failed:', error);
    return NextResponse.json(
      { message: 'Could not connect to the backend service.' },
      { status: 503 }, // 503 Service Unavailable is more appropriate
    );
  }
}
