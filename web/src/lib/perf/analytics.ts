/**
 * Pure analytics functions for bot performance metrics
 * No external APIs, deterministic computation from events
 */

import { BotEvent } from '@/hooks/useBotEvents';

export interface NetFlows {
  [token: string]: bigint;
}

export interface TradeStats {
  tradeCount: number;
  lastTrade: BotEvent | null;
  volumeInByToken: { [token: string]: bigint };
  volumeOutByToken: { [token: string]: bigint };
  volumeByPath: { [path: string]: { count: number; totalIn: bigint; totalOut: bigint } };
}

export interface Analytics {
  uniqueTokens: Set<string>;
  netFlowsByToken: NetFlows;
  tradeStats: TradeStats;
}

/**
 * Extract all unique token addresses from events
 */
export function extractUniqueTokens(events: BotEvent[]): Set<string> {
  const tokens = new Set<string>();

  for (const event of events) {
    if (event.type === 'Deposited' || event.type === 'Withdrawn') {
      tokens.add(event.token.toLowerCase());
    } else if (event.type === 'TradeExecuted') {
      // Add all tokens in the swap path
      for (const token of event.path) {
        tokens.add(token.toLowerCase());
      }
    }
  }

  return tokens;
}

/**
 * Compute net flows per token (deposits - withdrawals)
 */
export function computeNetFlows(events: BotEvent[]): NetFlows {
  const flows: NetFlows = {};

  for (const event of events) {
    if (event.type === 'Deposited') {
      const token = event.token.toLowerCase();
      flows[token] = (flows[token] || 0n) + event.amount;
    } else if (event.type === 'Withdrawn') {
      const token = event.token.toLowerCase();
      flows[token] = (flows[token] || 0n) - event.amount;
    }
  }

  return flows;
}

/**
 * Compute trading statistics from TradeExecuted events
 */
export function computeTradeStats(events: BotEvent[]): TradeStats {
  const stats: TradeStats = {
    tradeCount: 0,
    lastTrade: null,
    volumeInByToken: {},
    volumeOutByToken: {},
    volumeByPath: {},
  };

  const tradeEvents = events.filter((e) => e.type === 'TradeExecuted') as Extract<
    BotEvent,
    { type: 'TradeExecuted' }
  >[];

  stats.tradeCount = tradeEvents.length;

  if (tradeEvents.length === 0) {
    return stats;
  }

  // Sort by block number descending to find most recent
  const sortedTrades = [...tradeEvents].sort((a, b) => Number(b.blockNumber - a.blockNumber));
  stats.lastTrade = sortedTrades[0];

  for (const trade of tradeEvents) {
    const tokenIn = trade.path[0].toLowerCase();
    const tokenOut = trade.path[trade.path.length - 1].toLowerCase();
    const pathKey = trade.path.map((t) => t.toLowerCase()).join(' > ');

    // Volume in (first token in path)
    stats.volumeInByToken[tokenIn] = (stats.volumeInByToken[tokenIn] || 0n) + trade.amountIn;

    // Volume out (last token in path)
    stats.volumeOutByToken[tokenOut] = (stats.volumeOutByToken[tokenOut] || 0n) + trade.amountOut;

    // Volume by path
    if (!stats.volumeByPath[pathKey]) {
      stats.volumeByPath[pathKey] = { count: 0, totalIn: 0n, totalOut: 0n };
    }
    stats.volumeByPath[pathKey].count += 1;
    stats.volumeByPath[pathKey].totalIn += trade.amountIn;
    stats.volumeByPath[pathKey].totalOut += trade.amountOut;
  }

  return stats;
}

/**
 * Compute all analytics from events
 */
export function analyzeEvents(events: BotEvent[]): Analytics {
  return {
    uniqueTokens: extractUniqueTokens(events),
    netFlowsByToken: computeNetFlows(events),
    tradeStats: computeTradeStats(events),
  };
}
