import { NextRequest, NextResponse } from 'next/server';

// Handler for GET /api/tenants (fetch all)
export async function GET(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  const apiUrl = `${backendUrl}/tenants`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'cookie': req.headers.get('cookie') || '',
      },
    });

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
  const backendUrl = process.env.BACKEND_URL;
  const apiUrl = `${backendUrl}/tenants`;

  try {
    const body = await req.json();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

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