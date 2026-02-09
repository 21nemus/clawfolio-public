/**
 * Proxy route to upload an image from URL to Nad.fun
 * POST /api/nadfun/image-from-url
 * Fetches image from URL, validates, and forwards to Nad.fun
 */

import { NextRequest, NextResponse } from 'next/server';
import { NAD_FUN_API_BASE } from '@/lib/nadfun/constants';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT = 10000; // 10 seconds

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid url field' }, { status: 400 });
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 });
    }

    // Fetch image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let imageResponse;
    try {
      imageResponse = await fetch(url, { signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Image fetch timeout' }, { status: 408 });
      }
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
    }

    // Validate content type
    const contentType = imageResponse.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: `URL must point to an image (got ${contentType})` },
        { status: 400 }
      );
    }

    // Read and validate size
    const imageBytes = await imageResponse.arrayBuffer();
    if (imageBytes.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` },
        { status: 413 }
      );
    }

    // Forward to Nad.fun
    const res = await fetch(`${NAD_FUN_API_BASE}/agent/token/image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: imageBytes,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
