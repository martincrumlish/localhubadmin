import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Serve widget assets (JS/CSS files) from the build output
 * This endpoint serves pre-built widget bundles to ChatGPT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the requested file path
    const filePath = params.path.join('/');

    // Resolve to the widget dist directory
    const assetsDir = path.join(process.cwd(), 'apps', 'localhub', 'web', 'dist');
    const fullPath = path.join(assetsDir, filePath);

    // Security: ensure the path is within the assets directory
    const normalizedPath = path.normalize(fullPath);
    const normalizedAssetsDir = path.normalize(assetsDir);
    if (!normalizedPath.startsWith(normalizedAssetsDir)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read the file
    const fileContent = fs.readFileSync(fullPath);

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
