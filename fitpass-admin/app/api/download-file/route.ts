import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const fileUrl = request.nextUrl.searchParams.get('url');
    const fileName = request.nextUrl.searchParams.get('name') || 'download';
    
    if (!fileUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Fetch file with ngrok bypass header
    const response = await fetch(fileUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'FitPass-Admin/1.0',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, { 
        status: response.status 
      });
    }

    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return new NextResponse(`Download error: ${error.message}`, { status: 500 });
  }
}
