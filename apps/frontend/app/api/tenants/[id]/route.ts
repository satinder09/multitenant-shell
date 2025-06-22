import { NextRequest, NextResponse } from 'next/server';

// Handler for DELETE /api/tenants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiUrl = `${backendUrl}/tenants/${id}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'cookie': req.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    // Return a success response, often with no body for DELETE
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API proxy error for DELETE /tenants/${id}:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
}

// Handler for PATCH /api/tenants/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiUrl = `${backendUrl}/tenants/${id}`;
  const body = await req.json();

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();
    if (!response.ok) {
      return NextResponse.json(responseData, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`API proxy error for PATCH /tenants/${id}:`, error);
    return NextResponse.json({ message: 'API proxy error' }, { status: 500 });
  }
} 