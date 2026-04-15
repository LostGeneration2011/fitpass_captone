import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Dummy response for bulk attendance
  return NextResponse.json({ message: 'Bulk attendance endpoint is working.' });
}
