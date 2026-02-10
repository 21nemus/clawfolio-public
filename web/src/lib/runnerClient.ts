export interface RunnerHealth {
  ok: boolean;
  ts: number;
  chainId: number;
  dbPath: string;
  mode: string;
  lastTickTs: number | null;
  latestBlock: number | null;
  version: string;
}

export interface RunnerLeaderboardBot {
  botId: string;
  name: string | null;
  handle: string | null;
  hasToken: boolean;
  tokenSymbol: string | null;
  pnlPct: number;
  pnl: number;
  trades: number;
  lastDecisionTs: number | null;
  lastActivityTs: number | null;
}

export interface RunnerLeaderboard {
  ok: boolean;
  mode: string;
  count: number;
  bots: RunnerLeaderboardBot[];
}

export interface RunnerPerfPoint {
  ts: number;
  equity: number;
  pnl: number;
  pnlPct: number;
  trades: number;
  mode: string;
}

export interface RunnerPerf {
  ok: boolean;
  botId: string;
  latest: RunnerPerfPoint | null;
  series: RunnerPerfPoint[];
}

export interface RunnerTrade {
  id: number;
  botId: string;
  ts: number;
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  reason: string;
  meta: string | null;
}

export interface RunnerBotTrades {
  ok: boolean;
  botId: string;
  order: 'desc' | 'asc';
  trades: RunnerTrade[];
}

export interface RunnerResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function safeFetch<T>(url: string, timeoutMs = 3000): Promise<RunnerResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const json = (await response.json()) as T;
    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Runner request failed' };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export async function getRunnerHealth(baseUrl: string): Promise<RunnerResult<RunnerHealth>> {
  return safeFetch<RunnerHealth>(`${normalizeBaseUrl(baseUrl)}/health`);
}

export async function getRunnerLeaderboard(baseUrl: string, limit = 20): Promise<RunnerResult<RunnerLeaderboard>> {
  const capped = Math.max(1, Math.min(100, limit));
  return safeFetch<RunnerLeaderboard>(`${normalizeBaseUrl(baseUrl)}/leaderboard?limit=${capped}`);
}

export async function getRunnerBotPerf(baseUrl: string, botId: string, limit = 200): Promise<RunnerResult<RunnerPerf>> {
  const capped = Math.max(1, Math.min(1000, limit));
  return safeFetch<RunnerPerf>(`${normalizeBaseUrl(baseUrl)}/bots/${encodeURIComponent(botId)}/perf?limit=${capped}`);
}

export async function getRunnerBotTrades(baseUrl: string, botId: string, limit = 50): Promise<RunnerResult<RunnerBotTrades>> {
  const capped = Math.max(1, Math.min(500, limit));
  return safeFetch<RunnerBotTrades>(`${normalizeBaseUrl(baseUrl)}/bots/${encodeURIComponent(botId)}/trades?limit=${capped}`);
}

