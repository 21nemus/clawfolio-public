'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { decodeMetadataURI } from '@/lib/encoding';
import { getMarketCapMon } from '@/lib/nadfun/client';
import { ERC20ABI } from '@/abi/ERC20';

interface RecentAgent {
  botId: bigint;
  name: string;
  handle?: string;
  image: string;
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  marketCapMon?: bigint;
}

export function RecentAgentsCarousel() {
  const [agents, setAgents] = useState<RecentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const config = loadConfig();

  useEffect(() => {
    let cancelled = false;

    const fetchRecentAgents = async () => {
      try {
        if (!publicClient || !config.botRegistry) return;

        const botCount = await publicClient.readContract({
          address: config.botRegistry,
          abi: BOT_REGISTRY_ABI,
          functionName: 'botCount',
        }) as bigint;

        if (botCount === 0n) {
          setLoading(false);
          return;
        }

        const recentAgents: RecentAgent[] = [];
        const targetCount = 8;
        const maxAttempts = 200; // Check up to 200 recent bots for better coverage
        const BATCH_SIZE = 10; // Multicall batch size

        // Start from the newest bot and work backwards, using multicall for efficiency
        for (let i = 0; i < maxAttempts && recentAgents.length < targetCount; i += BATCH_SIZE) {
          if (cancelled) break;

          const batchIds: bigint[] = [];
          for (let j = 0; j < BATCH_SIZE && i + j < maxAttempts; j++) {
            const botId = botCount - BigInt(i + j);
            if (botId > 0n) {
              batchIds.push(botId);
            }
          }

          if (batchIds.length === 0) break;

          try {
            // Use multicall for better RPC efficiency
            const multicallContracts = batchIds.flatMap(botId => [
              { address: config.botRegistry, abi: BOT_REGISTRY_ABI, functionName: 'botAccountOf', args: [botId] },
              { address: config.botRegistry, abi: BOT_REGISTRY_ABI, functionName: 'metadataURI', args: [botId] },
              { address: config.botRegistry, abi: BOT_REGISTRY_ABI, functionName: 'botTokenOf', args: [botId] },
            ]);

            const multicallResults = await publicClient.multicall({
              contracts: multicallContracts as any[],
            });

            // Process each bot in the batch
            for (let idx = 0; idx < batchIds.length; idx++) {
              if (cancelled || recentAgents.length >= targetCount) break;

              const botId = batchIds[idx];
              const baseIdx = idx * 3;
              const botAccount = multicallResults[baseIdx].result as `0x${string}`;
              const metadataURI = multicallResults[baseIdx + 1].result as string;
              const tokenAddress = multicallResults[baseIdx + 2].result as `0x${string}`;

              if (botAccount === '0x0000000000000000000000000000000000000000') {
                continue;
              }

              const metadata = decodeMetadataURI(metadataURI);
              const image = metadata?.image as string | undefined;

              // Only include agents with images
              if (!image) continue;

              const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';
              let tokenSymbol: string | undefined;
              let marketCapMon: bigint | undefined;

              if (hasToken) {
                try {
                  const [symbol, mcap] = await Promise.all([
                    publicClient.readContract({
                      address: tokenAddress,
                      abi: ERC20ABI,
                      functionName: 'symbol',
                    }) as Promise<string>,
                    getMarketCapMon(publicClient, tokenAddress).catch(() => null),
                  ]);
                  tokenSymbol = symbol;
                  marketCapMon = mcap?.marketCapMon;
                } catch {
                  // Ignore token metadata errors
                }
              }

              // Only include agents with valid bigint IDs
              if (typeof botId === 'bigint') {
                recentAgents.push({
                  botId,
                  name: (metadata?.name as string) || `Agent #${botId}`,
                  handle: metadata?.handle as string | undefined,
                  image,
                  tokenAddress: hasToken ? tokenAddress : undefined,
                  tokenSymbol,
                  marketCapMon,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to fetch batch starting at ${batchIds[0]}:`, err);
          }
        }

        if (!cancelled) {
          setAgents(recentAgents);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch recent agents:', err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRecentAgents();

    return () => {
      cancelled = true;
    };
  }, [config.botRegistry]);

  if (loading || agents.length === 0) {
    return null;
  }

  // Ensure track is long enough to avoid blank gaps
  const MIN_TRACK_ITEMS = 16;
  const repeats = Math.max(1, Math.ceil(MIN_TRACK_ITEMS / agents.length));
  const baseTrack = Array.from({ length: repeats }, () => agents).flat();
  
  // Duplicate for seamless loop (need 2x for the translateX(-50%) animation)
  const duplicatedAgents = [...baseTrack, ...baseTrack];
  
  // For single agent, render static to avoid weird animation
  const shouldAnimate = agents.length > 1;

  return (
    <div className="relative w-full py-12 overflow-hidden">
      <h2 className="text-3xl font-bold text-center mb-4">Recently Created Agents</h2>
      
      {/* Ticker container */}
      <div className="relative w-full overflow-hidden bg-white/5 border-y border-white/10 py-4">
        <div 
          className="flex gap-6"
          style={{
            animation: shouldAnimate ? 'scroll-left 40s linear infinite' : 'none',
            width: 'max-content',
          }}
        >
          {duplicatedAgents.map((agent, idx) => (
            <Link
              key={`${agent.botId.toString()}-${idx}`}
              href={`/agents/${agent.botId.toString()}`}
              className="flex-shrink-0"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:border-red-400/50 hover:scale-105 transition-all w-64">
                  <div className="flex items-center gap-3">
                    {agent.image ? (
                      <img
                        src={agent.image}
                        alt={agent.name}
                        className="w-12 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0"
                        onError={(e) => {
                          // Replace with placeholder on error
                          const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-12 h-12 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-sm flex-shrink-0';
                          placeholder.textContent = initials;
                          (e.target as HTMLImageElement).replaceWith(placeholder);
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-sm flex-shrink-0">
                        {agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {agent.name}
                    </h3>
                    {agent.tokenSymbol && (
                      <p className="text-xs font-mono text-red-400 truncate">
                        ${agent.tokenSymbol}
                      </p>
                    )}
                    {agent.handle && (
                      <p className="text-xs text-white/60 font-mono truncate">
                        {agent.handle}
                      </p>
                    )}
                    {agent.marketCapMon && (
                      <p className="text-xs text-white/60 truncate">
                        MCap: {(Number(agent.marketCapMon) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} MON
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          div[style*="animation"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
