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
  image?: string;
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  marketCapMon?: bigint;
}

const TARGET_COUNT = 8;
const MAX_ATTEMPTS = 300;
const BATCH_SIZE = 10;
const MIN_TRACK_ITEMS = 16;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const REFRESH_INTERVAL_MS = 45_000;
const MAX_RETRY_MS = 10_000;

export function RecentAgentsCarousel() {
  const [agents, setAgents] = useState<RecentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const config = loadConfig();

  useEffect(() => {
    let cancelled = false;
    let retryDelayMs = 1_000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const createFallbackAgents = (botCount: bigint): RecentAgent[] => {
      if (botCount <= 0n) {
        return Array.from({ length: 3 }, (_, index) => ({
          botId: BigInt(index),
          name: `Agent #${index + 1}`,
        }));
      }

      const fallbackCount = Number(botCount < 4n ? botCount : 4n);
      return Array.from({ length: fallbackCount }, (_, index) => {
        const botId = botCount - 1n - BigInt(index);
        return {
          botId,
          name: `Agent #${botId.toString()}`,
        };
      });
    };

    const pushIfUnique = (collection: RecentAgent[], candidate: RecentAgent) => {
      if (!collection.some((agent) => agent.botId === candidate.botId)) {
        collection.push(candidate);
      }
    };

    const mapMulticallResult = (
      result: unknown
    ): { ok: boolean; value: unknown | null } => {
      if (result && typeof result === 'object' && 'status' in result) {
        const typed = result as { status: string; result?: unknown };
        return { ok: typed.status === 'success', value: typed.result ?? null };
      }
      if (result && typeof result === 'object' && 'result' in result) {
        const typed = result as { result?: unknown };
        return { ok: true, value: typed.result ?? null };
      }
      return { ok: false, value: null };
    };

    const fetchRecentAgents = async (): Promise<RecentAgent[]> => {
      if (!publicClient || !config.botRegistry) {
        return createFallbackAgents(0n);
      }

      const botCount = (await publicClient.readContract({
        address: config.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'botCount',
      })) as bigint;

      if (botCount <= 0n) {
        return createFallbackAgents(botCount);
      }

      const withImage: RecentAgent[] = [];
      const withoutImage: RecentAgent[] = [];
      const scanLimit = Number(botCount < BigInt(MAX_ATTEMPTS) ? botCount : BigInt(MAX_ATTEMPTS));

      for (let i = 0; i < scanLimit && withImage.length + withoutImage.length < TARGET_COUNT; i += BATCH_SIZE) {
        if (cancelled) break;

        const batchIds: bigint[] = [];
        for (let j = 0; j < BATCH_SIZE && i + j < scanLimit; j++) {
          const botId = botCount - 1n - BigInt(i + j);
          if (botId >= 0n) {
            batchIds.push(botId);
          }
        }

        if (batchIds.length === 0) break;

        const contracts = batchIds.flatMap((botId) => [
          { address: config.botRegistry!, abi: BOT_REGISTRY_ABI, functionName: 'botAccountOf', args: [botId] },
          { address: config.botRegistry!, abi: BOT_REGISTRY_ABI, functionName: 'metadataURI', args: [botId] },
          { address: config.botRegistry!, abi: BOT_REGISTRY_ABI, functionName: 'botTokenOf', args: [botId] },
        ]) as any[];

        let results: unknown[] = [];
        try {
          results = await publicClient.multicall({
            contracts,
            allowFailure: true,
          });
        } catch {
          const fallback = await Promise.allSettled(
            contracts.map((contract) =>
              publicClient.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: contract.functionName,
                args: contract.args,
              })
            )
          );

          results = fallback.map((entry) =>
            entry.status === 'fulfilled'
              ? { status: 'success', result: entry.value }
              : { status: 'failure', result: null }
          );
        }

        for (let idx = 0; idx < batchIds.length; idx++) {
          if (cancelled) break;
          if (withImage.length + withoutImage.length >= TARGET_COUNT) break;

          const botId = batchIds[idx];
          const baseIdx = idx * 3;
          const botAccount = mapMulticallResult(results[baseIdx]);
          const metadataURI = mapMulticallResult(results[baseIdx + 1]);
          const tokenAddress = mapMulticallResult(results[baseIdx + 2]);

          const accountValue = botAccount.value as `0x${string}` | null;
          if (!botAccount.ok || !accountValue || accountValue === ZERO_ADDRESS) continue;

          const metadata = decodeMetadataURI((metadataURI.value as string) || '');
          const image = typeof metadata?.image === 'string' ? metadata.image : undefined;
          const token = tokenAddress.ok ? (tokenAddress.value as `0x${string}` | null) : null;
          const hasToken = !!token && token !== ZERO_ADDRESS;

          let tokenSymbol: string | undefined;
          let marketCapMon: bigint | undefined;

          if (hasToken) {
            try {
              const [symbol, mcap] = await Promise.all([
                publicClient.readContract({
                  address: token,
                  abi: ERC20ABI,
                  functionName: 'symbol',
                }) as Promise<string>,
                getMarketCapMon(publicClient, token).catch(() => null),
              ]);
              tokenSymbol = symbol;
              marketCapMon = mcap?.marketCapMon;
            } catch {
              // ignore token-level fetch failures
            }
          }

          const candidate: RecentAgent = {
            botId,
            name: (metadata?.name as string) || `Agent #${botId.toString()}`,
            handle: metadata?.handle as string | undefined,
            image,
            tokenAddress: hasToken ? token : undefined,
            tokenSymbol,
            marketCapMon,
          };

          if (image) {
            pushIfUnique(withImage, candidate);
          } else {
            pushIfUnique(withoutImage, candidate);
          }
        }
      }

      const selected = [...withImage, ...withoutImage].slice(0, TARGET_COUNT);
      return selected.length > 0 ? selected : createFallbackAgents(botCount);
    };

    const runFetch = async () => {
      try {
        const nextAgents = await fetchRecentAgents();
        if (cancelled) return;

        setAgents(nextAgents);
        setLoading(false);
        setIsRetrying(false);
        retryDelayMs = 1_000;
        timer = setTimeout(runFetch, REFRESH_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setLoading(false);
        setIsRetrying(true);
        timer = setTimeout(runFetch, retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS);
      }
    };

    runFetch();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [config.botRegistry]);
  const hasAgents = agents.length > 0;
  const displayAgents: RecentAgent[] = hasAgents
    ? agents
    : Array.from({ length: 4 }, (_, index) => ({
        botId: BigInt(index),
        name: `Agent #${index + 1}`,
      } satisfies RecentAgent));

  const repeats = Math.max(1, Math.ceil(MIN_TRACK_ITEMS / displayAgents.length));
  const baseTrack = Array.from({ length: repeats }, () => displayAgents).flat();
  const duplicatedAgents = [...baseTrack, ...baseTrack];
  const shouldAnimate = !loading && displayAgents.length > 1;

  const renderAvatar = (agent: RecentAgent, key: string) => {
    const initials = agent.name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const showImage = !!agent.image && !failedImages[key];

    if (!showImage) {
      return (
        <div className="w-12 h-12 rounded-lg border border-white/10 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center text-white/80 font-bold text-sm flex-shrink-0">
          {initials || 'AG'}
        </div>
      );
    }

    return (
      <img
        src={agent.image}
        alt={agent.name}
        className="w-12 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0"
        onError={() =>
          setFailedImages((prev) => ({
            ...prev,
            [key]: true,
          }))
        }
      />
    );
  };

  return (
    <div className="relative w-full py-12 overflow-hidden">
      <h2 className="text-3xl font-bold text-center mb-4">Recently Created Agents</h2>
      {loading && <p className="text-center text-white/60 text-sm mb-3">Loading recent agents...</p>}
      {isRetrying && <p className="text-center text-yellow-400 text-sm mb-3">RPC busy, retrying...</p>}
      
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
                    {renderAvatar(agent, `${agent.botId.toString()}-${idx}`)}
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
                    {typeof agent.marketCapMon !== 'undefined' && (
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
