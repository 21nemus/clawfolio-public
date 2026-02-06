/**
 * Proxy route for Nad.fun salt mining
 * POST /api/nadfun/salt
 */

import { NextRequest, NextResponse } from 'next/server';
import { NAD_FUN_API_BASE } from '@/lib/nadfun/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creator, name, symbol, metadata_uri } = body;

    if (!creator || !name || !symbol || !metadata_uri) {
      return NextResponse.json(
        { error: 'Missing required fields: creator, name, symbol, metadata_uri' },
        { status: 400 }
      );
    }

    const res = await fetch(`${NAD_FUN_API_BASE}/agent/salt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator, name, symbol, metadata_uri }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    // Normalize response for UI: { salt, address } -> { salt, predictedAddress }
    const normalized = {
      salt: data.salt,
      predictedAddress: data.address || data.predictedAddress,
    };
    return NextResponse.json(normalized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
