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

  const radius = 180; // Radius of the circle in pixels
  const angleStep = (2 * Math.PI) / agents.length;

  return (
    <div className="relative w-full py-20 overflow-hidden">
      <h2 className="text-3xl font-bold text-center mb-16">Recently Created Agents</h2>
      
      <div className="relative w-full" style={{ height: `${radius * 2 + 200}px` }}>
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            animation: 'rotate360 40s linear infinite',
          }}
        >
          {agents.map((agent, idx) => {
            const angle = idx * angleStep;
            const x = Math.cos(angle - Math.PI / 2) * radius;
            const y = Math.sin(angle - Math.PI / 2) * radius;

            return (
              <Link
                key={agent.botId.toString()}
                href={`/bots/${agent.botId}`}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${-angle + Math.PI / 2}rad)`,
                }}
              >
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:border-red-400/50 hover:scale-105 transition-all w-48">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-16 h-16 object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-white truncate max-w-full">
                        {agent.name}
                      </h3>
                      {agent.handle && (
                        <p className="text-xs text-white/60 font-mono truncate max-w-full">
                          {agent.handle}
                        </p>
                      )}
                    </div>
                    {agent.tokenSymbol && (
                      <div className="text-xs text-white/80">
                        <span className="font-mono text-red-400">${agent.tokenSymbol}</span>
                        {agent.marketCapMon && (
                          <div className="text-white/60 mt-1">
                            MCap: {(Number(agent.marketCapMon) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} MON
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes rotate360 {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
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
