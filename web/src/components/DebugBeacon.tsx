'use client';

import { useEffect } from 'react';

export function DebugBeacon({
  page,
  botId,
}: {
  page: string;
  botId?: string;
}) {
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b5d49497-3c0d-4821-bca6-8ae27b698a6c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'debug1',
        hypothesisId: 'H1',
        location: 'web/src/components/DebugBeacon.tsx:18',
        message: 'DebugBeacon mounted',
        data: {
          page,
          botId: botId || null,
          pathname: typeof window !== 'undefined' ? window.location.pathname : null,
          href: typeof window !== 'undefined' ? window.location.href : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [page, botId]);

  return null;
}

