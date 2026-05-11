import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const backendBase = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
    const authorization = request.headers.get('authorization');

    const response = await fetch(`${backendBase}/attendance/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to proxy bulk attendance request' },
      { status: 500 }
    );
  }
}
