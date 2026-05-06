import { NextRequest, NextResponse } from 'next/server';

// Use server-side env var first, then public vars, then fallback
// Ensure the URL always ends with /api
function buildBackendApiUrl(): string {
  const raw =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001/api';
  const trimmed = raw.trim().replace(/\/+$/, '');
  // If the URL doesn't end with /api, append it
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const API_BASE_URL = buildBackendApiUrl();

async function readBackendPayload(response: Response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { error: rawBody };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the backend
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await readBackendPayload(response);
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}