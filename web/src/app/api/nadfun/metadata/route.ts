/**
 * Proxy route for Nad.fun metadata upload
 * POST /api/nadfun/metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { NAD_FUN_API_BASE } from '@/lib/nadfun/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, symbol, description, image_uri, website, twitter, telegram } = body;

    if (!name || !symbol || !description || !image_uri) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, description, image_uri' },
        { status: 400 }
      );
    }

    const payload: Record<string, string> = { name, symbol, description, image_uri };
    if (website) payload.website = website;
    if (twitter) payload.twitter = twitter;
    if (telegram) payload.telegram = telegram;

    const res = await fetch(`${NAD_FUN_API_BASE}/agent/token/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
