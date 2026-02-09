/**
 * Proxy route to fetch JSON from URL (to avoid CORS)
 * GET /api/nadfun/fetch-json?url=<encoded>
 */

import { NextRequest, NextResponse } from 'next/server';

const MAX_JSON_SIZE = 1 * 1024 * 1024; // 1MB
const FETCH_TIMEOUT = 10000; // 10 seconds

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 });
    }

    // Fetch JSON with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Fetch timeout' }, { status: 408 });
      }
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json({ error: `URL returned ${response.status}` }, { status: 400 });
    }

    // Read and validate size
    const text = await response.text();
    if (text.length > MAX_JSON_SIZE) {
      return NextResponse.json(
        { error: `Response too large (max ${MAX_JSON_SIZE / 1024 / 1024}MB)` },
        { status: 413 }
      );
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Response is not valid JSON' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
