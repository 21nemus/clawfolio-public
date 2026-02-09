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
        const maxAttempts = 20; // Check up to 20 recent bots

        // Start from the newest bot and work backwards
        for (let i = 0; i < maxAttempts && recentAgents.length < targetCount; i++) {
          if (cancelled) break;

          const botId = botCount - BigInt(i);
          if (botId <= 0n) break;

          try {
            const [botAccount, metadataURI, tokenAddress] = await Promise.all([
              publicClient.readContract({
                address: config.botRegistry,
                abi: BOT_REGISTRY_ABI,
                functionName: 'botAccountOf',
                args: [botId],
              }) as Promise<`0x${string}`>,
              publicClient.readContract({
                address: config.botRegistry,
                abi: BOT_REGISTRY_ABI,
                functionName: 'metadataURI',
                args: [botId],
              }) as Promise<string>,
              publicClient.readContract({
                address: config.botRegistry,
                abi: BOT_REGISTRY_ABI,
                functionName: 'botTokenOf',
                args: [botId],
              }) as Promise<`0x${string}`>,
            ]);

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

            recentAgents.push({
              botId,
              name: (metadata?.name as string) || `Agent #${botId}`,
              handle: metadata?.handle as string | undefined,
              image,
              tokenAddress: hasToken ? tokenAddress : undefined,
              tokenSymbol,
              marketCapMon,
            });
          } catch (err) {
            console.error(`Failed to fetch bot ${botId}:`, err);
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

  // Duplicate agents for seamless loop
  const duplicatedAgents = [...agents, ...agents];

  return (
    <div className="relative w-full py-20 overflow-hidden">
      <h2 className="text-3xl font-bold text-center mb-8">Recently Created Agents</h2>
      
      {/* Ticker container */}
      <div className="relative w-full overflow-hidden bg-white/5 border-y border-white/10 py-4">
        <div 
          className="flex gap-6"
          style={{
            animation: 'scroll-left 40s linear infinite',
            width: 'max-content',
          }}
        >
          {duplicatedAgents.map((agent, idx) => (
            <Link
              key={`${agent.botId.toString()}-${idx}`}
              href={`/agents/${agent.botId}`}
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
