'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { getProgress } from '@/lib/nadfun/client';
import { decodeMetadataURI } from '@/lib/encoding';
import { AddressLink } from '@/components/AddressLink';
import { CopyButton } from '@/components/CopyButton';

interface TokenizedBot {
  botId: bigint;
  tokenAddress: `0x${string}`;
  name?: string;
  handle?: string;
  image?: string;
  progress?: bigint;
  progressLoading: boolean;
  error?: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenizedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const appConfig = loadConfig();

  // Filter tokens based on search
  const filteredTokens = tokens.filter((token) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.botId.toString().includes(query) ||
      token.tokenAddress.toLowerCase().includes(query) ||
      token.name?.toLowerCase().includes(query) ||
      token.handle?.toLowerCase().includes(query)
    );
  });

  // Sort tokens: by progress desc (if available), then by botId desc
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    // If both have progress, sort by progress desc
    if (a.progress !== undefined && b.progress !== undefined) {
      return Number(b.progress - a.progress);
    }
    // If only one has progress, prioritize it
    if (a.progress !== undefined) return -1;
    if (b.progress !== undefined) return 1;
    // Otherwise sort by botId desc
    return Number(b.botId - a.botId);
  });

  useEffect(() => {
    let cancelled = false;

    const fetchTokenizedBots = async () => {
      if (!appConfig.botRegistry) {
        if (!cancelled) {
          setError('BotRegistry not configured');
          setLoading(false);
        }
        return;
      }

      try {
        // Read botCount
        const botCount = await publicClient.readContract({
          address: appConfig.botRegistry,
          abi: BOT_REGISTRY_ABI,
          functionName: 'botCount',
        }) as bigint;

        if (cancelled) return;

        const tokenizedBots: TokenizedBot[] = [];
        const CONCURRENCY = 5; // Limit parallel requests

        // Iterate bot IDs in chunks (starting from 0)
        for (let i = 0n; i < botCount; i++) {
          if (cancelled) break;

          // Process in batches
          const batch: Promise<void>[] = [];
          const batchSize = Math.min(Number(CONCURRENCY), Number(botCount - i));

          for (let j = 0; j < batchSize && i + BigInt(j) < botCount; j++) {
            const botId = i + BigInt(j);
            
            batch.push((async () => {
              try {
                const [tokenAddress, metadataURI] = await Promise.all([
                  publicClient.readContract({
                    address: appConfig.botRegistry!,
                    abi: BOT_REGISTRY_ABI,
                    functionName: 'botTokenOf',
                    args: [botId],
                  }) as Promise<`0x${string}`>,
                  publicClient.readContract({
                    address: appConfig.botRegistry!,
                    abi: BOT_REGISTRY_ABI,
                    functionName: 'metadataURI',
                    args: [botId],
                  }) as Promise<string>,
                ]);

                // Filter zero address (not tokenized)
                if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                  return;
                }

                // Decode metadata
                const metadata = decodeMetadataURI(metadataURI);

                if (!cancelled) {
                  tokenizedBots.push({
                    botId,
                    tokenAddress,
                    name: metadata?.name as string | undefined,
                    handle: metadata?.handle as string | undefined,
                    image: metadata?.image as string | undefined,
                    progressLoading: true,
                  });
                }
              } catch (err) {
                console.error(`Failed to fetch bot ${botId}:`, err);
              }
            })());
          }

          await Promise.all(batch);
          i += BigInt(batchSize - 1); // Adjust loop counter

          // Update UI incrementally
          if (!cancelled && tokenizedBots.length > 0) {
            setTokens([...tokenizedBots]);
          }
        }

        if (cancelled) return;
        setTokens([...tokenizedBots]);
        setLoading(false);

        // Now fetch progress for each token (background)
        for (const token of tokenizedBots) {
          if (cancelled) break;

          try {
            const progress = await getProgress(publicClient, token.tokenAddress);
            if (!cancelled) {
              setTokens((prev) =>
                prev.map((t) =>
                  t.botId === token.botId
                    ? { ...t, progress, progressLoading: false }
                    : t
                )
              );
            }
          } catch (err) {
            console.error(`Failed to fetch progress for ${token.tokenAddress}:`, err);
            if (!cancelled) {
              setTokens((prev) =>
                prev.map((t) =>
                  t.botId === token.botId
                    ? { ...t, error: 'Progress unavailable', progressLoading: false }
                    : t
                )
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch tokenized bots:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tokens');
          setLoading(false);
        }
      }
    };

    fetchTokenizedBots();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && tokens.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Token Hub</h1>
        <p className="text-white/60 mb-8">All launched tokens on Nad.fun</p>
        <p className="text-white/60">Loading tokenized bots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Token Hub</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Token Hub</h1>
        <p className="text-white/60 mb-8">All launched tokens on Nad.fun</p>
        <div className="text-center py-12">
          <p className="text-white/60">No tokens launched yet. Be the first to tokenize your bot!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Token Hub</h1>
        <p className="text-white/60">All launched tokens on Nad.fun ({tokens.length} total)</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by bot ID, token address, name, or handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
        />
      </div>

      {filteredTokens.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <p className="text-white/60">No tokens match your search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTokens.map((token) => (
          <div
            key={token.botId.toString()}
            className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all"
          >
            <div className="flex items-start gap-4 mb-4">
              {token.image && (
                <img
                  src={token.image}
                  alt={token.name || `Bot ${token.botId}`}
                  className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/bots/${token.botId}`}>
                  <h3 className="text-lg font-bold text-white hover:text-red-400 transition-colors truncate">
                    {token.name || `Bot #${token.botId.toString()}`}
                  </h3>
                </Link>
                {token.handle && (
                  <p className="text-sm text-white/60 font-mono truncate">{token.handle}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white/40 text-xs mb-1">Token Address</p>
                <div className="flex items-center gap-2">
                  <AddressLink address={token.tokenAddress} />
                  <CopyButton text={token.tokenAddress} label="token" />
                </div>
              </div>

              <div>
                <p className="text-white/40 text-xs mb-1">Bonding Curve Progress</p>
                {token.progressLoading ? (
                  <p className="text-white/60 text-xs">Loading...</p>
                ) : token.error ? (
                  <p className="text-white/40 text-xs">{token.error}</p>
                ) : token.progress !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/80 text-xs">
                        {(Number(token.progress) / 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Number(token.progress) / 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href={`/bots/${token.botId}`}
                  className="flex-1 text-center px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white transition-colors"
                >
                  View Bot
                </Link>
                <a
                  href={
                    appConfig.explorerAddressUrlPrefix
                      ? `${appConfig.explorerAddressUrlPrefix}${token.tokenAddress}`
                      : `https://monadvision.com/address/${token.tokenAddress}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs text-red-400 transition-colors"
                >
                  Explorer →
                </a>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {loading && tokens.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm">Loading more tokens...</p>
        </div>
      )}
    </div>
  );
}
