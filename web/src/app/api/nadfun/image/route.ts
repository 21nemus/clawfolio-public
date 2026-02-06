/**
 * Proxy route for Nad.fun image upload
 * POST /api/nadfun/image
 * Accepts multipart/form-data from browser, forwards raw bytes to Nad.fun
 */

import { NextRequest, NextResponse } from 'next/server';
import { NAD_FUN_API_BASE } from '@/lib/nadfun/constants';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid image field' }, { status: 400 });
    }

    // Convert File to ArrayBuffer for raw bytes upload
    const imageBytes = await image.arrayBuffer();
    const contentType = image.type || 'image/png';

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
