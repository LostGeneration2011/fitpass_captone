
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Proxy to backend notifications API
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001/api/notifications';
  const headers: Record<string, string> = {};
  // Forward the Authorization header if present (for protected endpoints)
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;

  const res = await fetch(backendUrl, { headers });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
