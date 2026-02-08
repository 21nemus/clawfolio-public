import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/moltbook/posts
 * Publishes to Moltbook using server-side API key
 * 
 * Security:
 * - API key kept server-side only
 * - Origin validation enforced
 * - Only posts to https://www.moltbook.com/api/v1
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://clawfolio.vercel.app',
  // Add your production domain here
];

export async function POST(request: NextRequest) {
  try {
    // Origin validation
    const origin = request.headers.get('origin');
    if (!origin || !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      console.warn('Rejected request from origin:', origin);
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { status: 403 }
      );
    }

    // Get config
    const apiBase = process.env.NEXT_PUBLIC_MOLTBOOK_API_BASE || 'https://www.moltbook.com/api/v1';
    const apiKey = process.env.MOLTBOOK_API_KEY;

    // Validate API base (security check)
    if (!apiBase.startsWith('https://www.moltbook.com')) {
      console.error('Invalid Moltbook API base:', apiBase);
      return NextResponse.json(
        { error: 'Invalid Moltbook API configuration' },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Moltbook API key not configured on server' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    if (!body.title || typeof body.title !== 'string' || body.title.length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!body.content || typeof body.content !== 'string' || body.content.length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (body.title.length > 200) {
      return NextResponse.json(
        { error: 'Title too long (max 200 chars)' },
        { status: 400 }
      );
    }

    if (body.content.length > 5000) {
      return NextResponse.json(
        { error: 'Content too long (max 5000 chars)' },
        { status: 400 }
      );
    }

    // Validate submolt if provided
    const submolt = body.submolt || process.env.NEXT_PUBLIC_MOLTBOOK_SUBMOLT || 'moltiversehackathon';
    if (!/^[a-z0-9_-]{2,64}$/.test(submolt)) {
      return NextResponse.json(
        { error: 'Invalid submolt format' },
        { status: 400 }
      );
    }

    // Forward to Moltbook
    const response = await fetch(`${apiBase}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submolt,
        title: body.title,
        content: body.content,
      }),
    });

    const responseData = await response.json();

    // Handle rate limit
    if (response.status === 429) {
      const retryAfter = responseData.retry_after_minutes || 30;
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retry_after_minutes: retryAfter,
          message: `Please wait ${retryAfter} minutes before posting again`,
        },
        { status: 429 }
      );
    }

    // Handle other errors
    if (!response.ok) {
      console.error('Moltbook API error:', response.status, responseData);
      return NextResponse.json(
        {
          error: responseData.error || `Moltbook API error: ${response.status}`,
          hint: responseData.hint,
        },
        { status: response.status }
      );
    }

    // Success
    console.log('Moltbook post created:', response.status);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Moltbook proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to publish to Moltbook' },
      { status: 500 }
    );
  }
}
