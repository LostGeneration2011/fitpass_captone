import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Fetch image with ngrok bypass header
    const response = await fetch(imageUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'FitPass-Admin/1.0',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { 
        status: response.status 
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
  }
}
