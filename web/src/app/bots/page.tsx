'use client';

import { useAllBots, BotWithMetadata } from '@/hooks/useAllBots';
import { BotCard } from '@/components/BotCard';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/clients';
import { BotAccountABI } from '@/abi/BotAccount';
import { formatEther } from 'viem';
import Link from 'next/link';

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
  balance?: bigint;
}

export default function BotsPage() {
  const { bots, loading, error } = useAllBots();
  const [searchQuery, setSearchQuery] = useState('');
  const [topBots, setTopBots] = useState<TopBot[]>([]);
  const [topBotsLoading, setTopBotsLoading] = useState(true);

  // Filter bots based on search
  const filteredBots = bots.filter((bot) => {
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

  // Fetch Top Bots (ranked by nonce)
  useEffect(() => {
    if (loading || bots.length === 0) return;

    let cancelled = false;

    const fetchTopBots = async () => {
      try {
        setTopBotsLoading(true);
        // Fetch nonce for first 50 bots (or all if less)
        const botsToRank = bots.slice(0, Math.min(50, bots.length));
        const CONCURRENCY = 5;

        const rankedBots: TopBot[] = [];

        for (let i = 0; i < botsToRank.length; i += CONCURRENCY) {
          if (cancelled) break;

          const batch = botsToRank.slice(i, i + CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (bot) => {
              try {
                const [nonce, lifecycleState, paused, balance] = await Promise.all([
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
                  publicClient.getBalance({ address: bot.botAccount }),
                ]);

                return { ...bot, nonce, lifecycleState, paused, balance };
              } catch {
                return { ...bot, nonce: 0n, lifecycleState: 0, paused: false, balance: 0n };
              }
            })
          );

          if (!cancelled) {
            rankedBots.push(...results);
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
          
          // Then by balance desc
          const aBalance = a.balance || 0n;
          const bBalance = b.balance || 0n;
          if (aBalance !== bBalance) {
            return Number(bBalance - aBalance);
          }
          
          // Finally by botId desc
          return Number(b.botId - a.botId);
        });

        if (!cancelled) {
          setTopBots(rankedBots.slice(0, 6)); // Top 6 for display
          setTopBotsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch top bots:', err);
        if (!cancelled) {
          setTopBotsLoading(false);
        }
      }
    };

    fetchTopBots();

    return () => {
      cancelled = true;
    };
  }, [bots, loading]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Explore Bots</h1>
        <p className="text-white/60">All trading agents deployed onchain</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by bot ID, name, handle, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
        />
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
          {/* Top Bots Section */}
          {!searchQuery && topBots.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🏆</span>
                <span>Top Bots</span>
                <span className="text-sm text-white/40 font-normal">(by activity)</span>
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topBots.map((bot, idx) => (
                  <Link key={bot.botId.toString()} href={`/bots/${bot.botId}`}>
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
                        {bot.image && (
                          <img 
                            src={bot.image} 
                            alt={bot.name || `Bot ${bot.botId}`}
                            className="w-12 h-12 object-cover rounded-lg border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
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
                              <span className="text-white/60">Trades:</span>
                              <span className="text-white font-medium">{bot.nonce?.toString() || '0'}</span>
                            </div>
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
                            {bot.balance !== undefined && bot.balance > 0n && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-white/60">Balance:</span>
                                <span className="text-white/80">{parseFloat(formatEther(bot.balance)).toFixed(2)} MON</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All Bots Grid */}
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              {searchQuery ? `Search Results (${filteredBots.length})` : `All Bots (${bots.length})`}
            </h2>
          </div>

          {filteredBots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60">
                {searchQuery 
                  ? 'No bots match your search.' 
                  : 'No bots found. Be the first to create one!'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBots.map((bot) => (
                <Link key={bot.botId.toString()} href={`/bots/${bot.botId}`}>
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer">
                    <div className="flex items-start gap-4 mb-4">
                      {bot.image && (
                        <img 
                          src={bot.image} 
                          alt={bot.name || `Bot ${bot.botId}`}
                          className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
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
                        <p className="text-white/40 text-xs mt-2 font-mono break-all">
                          {bot.botAccount.slice(0, 10)}...{bot.botAccount.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <p className="text-red-400 text-sm">View details →</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
