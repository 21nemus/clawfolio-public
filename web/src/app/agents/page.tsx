'use client';

import { useAllBots, BotWithMetadata } from '@/hooks/useAllBots';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/clients';
import { BotAccountABI } from '@/abi/BotAccount';
import Link from 'next/link';
import { useAgentAvatar } from '@/hooks/useAgentAvatar';
import { loadConfig } from '@/lib/config';
import { getRunnerLeaderboard } from '@/lib/runnerClient';

const LIFECYCLE_STATES = {
  0: 'Draft',
  1: 'Stealth',
  2: 'Public',
  3: 'Graduated',
  4: 'Retired',
} as const;

interface TopBot extends BotWithMetadata {
  nonce?: bigint;
  lifecycleState?: number;
  paused?: boolean;
  simulatedPnlPct?: number;
  simulatedTrades?: number;
  fromSimulation?: boolean;
}

function TopBotCardWithAvatar({ bot, idx }: { bot: TopBot; idx: number }) {
  const appConfig = loadConfig();
  
  const { avatarUrl } = useAgentAvatar({
    chainId: appConfig.chainId,
    botId: bot.botId,
    metadataImage: bot.image,
    botToken: bot.tokenAddress,
    hasToken: bot.hasToken,
    disableLocalOverride: true,
  });

  return (
    <Link href={`/agents/${bot.botId}`}>
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:border-red-400/50 transition-all cursor-pointer relative">
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {idx === 0 && <span className="text-xl">🥇</span>}
          {idx === 1 && <span className="text-xl">🥈</span>}
          {idx === 2 && <span className="text-xl">🥉</span>}
          {bot.hasToken && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
              Token
            </span>
          )}
        </div>
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={bot.name || `Bot ${bot.botId}`}
              className="w-16 h-16 object-cover rounded-lg border border-white/10"
              onError={(e) => {
                const name = bot.name || `Bot ${bot.botId}`;
                const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const placeholder = document.createElement('div');
                placeholder.className = 'w-16 h-16 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-base';
                placeholder.textContent = initials;
                (e.target as HTMLImageElement).replaceWith(placeholder);
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-base">
              {(bot.name || `Bot ${bot.botId}`).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">
              {bot.name || `Bot #${bot.botId.toString()}`}
            </h3>
            {bot.handle && (
              <p className="text-xs text-white/60 font-mono truncate">{bot.handle}</p>
            )}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">Agent #</span>
                <span className="text-white font-medium">{bot.botId.toString()}</span>
              </div>
              {bot.fromSimulation && bot.simulatedPnlPct !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/60">PnL:</span>
                  <span className={bot.simulatedPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {bot.simulatedPnlPct >= 0 ? '+' : ''}{bot.simulatedPnlPct.toFixed(2)}%
                  </span>
                </div>
              )}
              {bot.fromSimulation && bot.simulatedTrades !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/60">Trades:</span>
                  <span className="text-white/80">{bot.simulatedTrades}</span>
                </div>
              )}
              {bot.lifecycleState !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/60">State:</span>
                  <span className="text-white/80">{LIFECYCLE_STATES[bot.lifecycleState as keyof typeof LIFECYCLE_STATES]}</span>
                  {bot.paused && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
                      Paused
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AllBotCardWithAvatar({ bot }: { bot: BotWithMetadata }) {
  const appConfig = loadConfig();
  
  const { avatarUrl } = useAgentAvatar({
    chainId: appConfig.chainId,
    botId: bot.botId,
    metadataImage: bot.image,
    botToken: bot.tokenAddress,
    hasToken: bot.hasToken,
    disableLocalOverride: true,
  });

  return (
    <Link href={`/agents/${bot.botId}`}>
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer">
        <div className="flex items-start gap-4 mb-4">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={bot.name || `Bot ${bot.botId}`}
              className="w-20 h-20 object-cover rounded-lg border border-white/10 flex-shrink-0"
              onError={(e) => {
                const name = bot.name || `Bot ${bot.botId}`;
                const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const placeholder = document.createElement('div');
                placeholder.className = 'w-20 h-20 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-lg flex-shrink-0';
                placeholder.textContent = initials;
                (e.target as HTMLImageElement).replaceWith(placeholder);
              }}
            />
          ) : (
            <div className="w-20 h-20 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-lg flex-shrink-0">
              {(bot.name || `Bot ${bot.botId}`).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-white hover:text-red-400 transition-colors truncate">
                {bot.name || `Bot #${bot.botId.toString()}`}
              </h3>
              {bot.hasToken && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded flex-shrink-0">
                  Token
                </span>
              )}
            </div>
            {bot.handle && (
              <p className="text-sm text-white/60 mt-1 font-mono truncate">{bot.handle}</p>
            )}
            <p className="text-white/40 text-xs mt-2">
              Agent #{bot.botId.toString()}
            </p>
          </div>
        </div>
        {bot.description && (
          <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
            {bot.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function BotsPage() {
  const { bots, loading, error } = useAllBots();
  const appConfig = loadConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'token' | 'noToken'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'marketCap' | 'activity'>('newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [topBots, setTopBots] = useState<TopBot[]>([]);
  const [runnerOnline, setRunnerOnline] = useState<boolean>(false);

  // Filter bots based on search, archive status, and token filter
  let filteredBots = bots.filter((bot) => {
    // Filter archived unless explicitly enabled
    if (!includeArchived && bot.lifecycleState === 4) return false;
    
    // Filter by token status
    if (tokenFilter === 'token' && !bot.hasToken) return false;
    if (tokenFilter === 'noToken' && bot.hasToken) return false;
    
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    // Normalize handle search: remove @ if query starts with @
    const normalizedQuery = query.startsWith('@') ? query.slice(1) : query;
    
    return (
      bot.botId.toString().includes(query) ||
      bot.botAccount.toLowerCase().includes(query) ||
      bot.name?.toLowerCase().includes(query) ||
      bot.handle?.toLowerCase().includes(normalizedQuery) ||
      bot.description?.toLowerCase().includes(query)
    );
  });

  // Apply sorting
  if (sortBy === 'newest') {
    filteredBots = [...filteredBots].sort((a, b) => Number(b.botId - a.botId));
  } else if (sortBy === 'oldest') {
    filteredBots = [...filteredBots].sort((a, b) => Number(a.botId - b.botId));
  } else if (sortBy === 'activity') {
    // Sort by nonce (requires topBots data)
    const nonceMap = new Map(topBots.map(bot => [bot.botId.toString(), bot.nonce || 0n]));
    filteredBots = [...filteredBots].sort((a, b) => {
      const aNonce = nonceMap.get(a.botId.toString()) || 0n;
      const bNonce = nonceMap.get(b.botId.toString()) || 0n;
      return Number(bNonce - aNonce);
    });
  }

  // Fetch Top Bots (ranked by nonce)
  useEffect(() => {
    if (loading || bots.length === 0) return;

    let cancelled = false;

    const fetchTopBots = async () => {
      try {
        if (appConfig.runnerBaseUrl) {
          const runnerResult = await getRunnerLeaderboard(appConfig.runnerBaseUrl, 6);
          if (runnerResult.ok && runnerResult.data?.bots?.length) {
            const mapped: TopBot[] = runnerResult.data.bots
              .map((entry) => {
                const matched = bots.find((b) => b.botId.toString() === entry.botId);
                if (!matched) return null;
                return {
                  ...matched,
                  simulatedPnlPct: entry.pnlPct,
                  simulatedTrades: entry.trades,
                  fromSimulation: true,
                } as TopBot;
              })
              .filter((x): x is TopBot => x !== null)
              .filter((bot) => includeArchived || bot.lifecycleState !== 4)
              .slice(0, 6);

            if (!cancelled) {
              setTopBots(mapped);
              setRunnerOnline(true);
            }
            return;
          }
          if (!cancelled) {
            setRunnerOnline(false);
          }
        }

        // Filter out archived agents first, then fetch nonce for first 50 bots (or all if less)
        const activeBotsToRank = bots
          .filter((bot) => includeArchived || bot.lifecycleState !== 4)
          .slice(0, Math.min(50, bots.length));
        const CONCURRENCY = 10;

        const rankedBots: TopBot[] = [];

        for (let i = 0; i < activeBotsToRank.length; i += CONCURRENCY) {
          if (cancelled) break;

          const batch = activeBotsToRank.slice(i, i + CONCURRENCY);
          
          // Use multicall for better RPC efficiency
          const multicallContracts = batch.flatMap(bot => [
            { address: bot.botAccount, abi: BotAccountABI, functionName: 'nonce' },
            { address: bot.botAccount, abi: BotAccountABI, functionName: 'lifecycleState' },
            { address: bot.botAccount, abi: BotAccountABI, functionName: 'paused' },
          ]);

          try {
            const multicallResults = await publicClient.multicall({
              contracts: multicallContracts as any[],
            });

            const results = batch.map((bot, idx) => {
              const baseIdx = idx * 3;
              const nonce = (multicallResults[baseIdx].result as bigint) || 0n;
              const lifecycleState = (multicallResults[baseIdx + 1].result as number) || 0;
              const paused = (multicallResults[baseIdx + 2].result as boolean) || false;
              
              return { ...bot, nonce, lifecycleState, paused };
            });

            if (!cancelled) {
              rankedBots.push(...results);
            }
          } catch {
            // Fallback to individual reads if multicall fails
            const results = await Promise.all(
              batch.map(async (bot) => {
                try {
                  const [nonce, lifecycleState, paused] = await Promise.all([
                    publicClient.readContract({
                      address: bot.botAccount,
                      abi: BotAccountABI,
                      functionName: 'nonce',
                    }) as Promise<bigint>,
                    publicClient.readContract({
                      address: bot.botAccount,
                      abi: BotAccountABI,
                      functionName: 'lifecycleState',
                    }) as Promise<number>,
                    publicClient.readContract({
                      address: bot.botAccount,
                      abi: BotAccountABI,
                      functionName: 'paused',
                    }) as Promise<boolean>,
                  ]);

                  return { ...bot, nonce, lifecycleState, paused };
                } catch {
                  return { ...bot, nonce: 0n, lifecycleState: 0, paused: false };
                }
              })
            );

            if (!cancelled) {
              rankedBots.push(...results);
            }
          }
        }

        // Sort by: lifecycleState (higher is better), nonce desc, hasToken, balance desc, botId desc
        rankedBots.sort((a, b) => {
          // Prefer higher lifecycle states (Public=2, Graduated=3 > Draft=0, Stealth=1)
          const aState = a.lifecycleState || 0;
          const bState = b.lifecycleState || 0;
          if (aState !== bState) {
            return bState - aState;
          }
          
          // Then by nonce desc
          const aNonce = a.nonce || 0n;
          const bNonce = b.nonce || 0n;
          if (aNonce !== bNonce) {
            return Number(bNonce - aNonce);
          }
          
          // Then by tokenization
          if (a.hasToken !== b.hasToken) {
            return a.hasToken ? -1 : 1;
          }
          
          // Finally by botId desc (newest first)
          return Number(b.botId - a.botId);
        });

        if (!cancelled) {
          setTopBots(rankedBots.slice(0, 6)); // Top 6 for display
        }
      } catch (err) {
        console.error('Failed to fetch top bots:', err);
      }
    };

    fetchTopBots();

    return () => {
      cancelled = true;
    };
  }, [bots, loading, includeArchived, appConfig.runnerBaseUrl]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Explore Agents</h1>
        <p className="text-white/60">All trading agents deployed onchain</p>
      </div>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by agent ID, name, handle, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
        />
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Filters ▾
          </button>
          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl z-10">
              <div className="p-4 space-y-4">
                {/* Sort options */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50"
                  >
                    <option value="newest">Agent ID (Newest)</option>
                    <option value="oldest">Agent ID (Oldest)</option>
                    <option value="activity">Activity</option>
                    <option value="marketCap">Market Cap</option>
                    <option value="pnlComingSoon" disabled>PnL (coming soon)</option>
                  </select>
                </div>

                {/* Token filter */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">Token Status</label>
                  <select
                    value={tokenFilter}
                    onChange={(e) => setTokenFilter(e.target.value as typeof tokenFilter)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50"
                  >
                    <option value="all">All Agents</option>
                    <option value="token">Token Launched</option>
                    <option value="noToken">No Token</option>
                  </select>
                </div>

                {/* Include archived toggle */}
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-red-500"
                  />
                  Include archived
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 mb-2">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-white/60">Loading bots...</p>
        </div>
      ) : (
        <>
          {/* Leader Board Section */}
          {!searchQuery && topBots.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🏆</span>
                <span>Leader Board</span>
                <span className="text-sm text-white/40 font-normal">
                  {runnerOnline ? '(simulation)' : '(by activity)'}
                </span>
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topBots.map((bot, idx) => (
                  <TopBotCardWithAvatar key={bot.botId.toString()} bot={bot} idx={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Search Results Grid */}
          {searchQuery && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold">
                  Search Results ({filteredBots.length})
                </h2>
              </div>

              {filteredBots.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60">No agents match your search.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBots.map((bot) => (
                    <AllBotCardWithAvatar key={bot.botId.toString()} bot={bot} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
