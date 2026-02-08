'use client';

import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { BotCard } from '@/components/BotCard';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { decodeMetadataURI } from '@/lib/encoding';
import Link from 'next/link';

interface BotEnrichment {
  name?: string;
  handle?: string;
  image?: string;
  hasToken?: boolean;
}

interface DirectLookupBot {
  botId: bigint;
  botAccount: `0x${string}`;
  name?: string;
  handle?: string;
  image?: string;
  hasToken?: boolean;
}

export default function BotsPage() {
  const { logs, loading, error } = useBotRegistryLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [directLookupBot, setDirectLookupBot] = useState<DirectLookupBot | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [enrichments, setEnrichments] = useState<Map<string, BotEnrichment>>(new Map());

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.botId.toString().includes(query) ||
      log.botAccount.toLowerCase().includes(query) ||
      log.creator.toLowerCase().includes(query)
    );
  });

  // Enrich visible bots with identity + token status (limit to first 24 for performance)
  useEffect(() => {
    if (loading || filteredLogs.length === 0) return;

    let cancelled = false;

    const enrichBots = async () => {
      const config = loadConfig();
      if (!config.botRegistry) return;

      try {
        // Only enrich first 24 bots initially
        const botsToEnrich = filteredLogs.slice(0, 24);
        
        const enrichmentResults = await Promise.all(
          botsToEnrich.map(async (bot) => {
            try {
              const [metadataURI, tokenAddress] = await Promise.all([
                publicClient.readContract({
                  address: config.botRegistry!,
                  abi: BOT_REGISTRY_ABI,
                  functionName: 'metadataURI',
                  args: [bot.botId],
                }) as Promise<string>,
                publicClient.readContract({
                  address: config.botRegistry!,
                  abi: BOT_REGISTRY_ABI,
                  functionName: 'botTokenOf',
                  args: [bot.botId],
                }) as Promise<`0x${string}`>,
              ]);

              const metadata = decodeMetadataURI(metadataURI);
              const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';

              return {
                botId: bot.botId.toString(),
                enrichment: {
                  name: metadata?.name as string | undefined,
                  handle: metadata?.handle as string | undefined,
                  image: metadata?.image as string | undefined,
                  hasToken,
                },
              };
            } catch {
              return {
                botId: bot.botId.toString(),
                enrichment: {},
              };
            }
          })
        );

        if (cancelled) return;

        const newEnrichments = new Map<string, BotEnrichment>();
        enrichmentResults.forEach(({ botId, enrichment }) => {
          newEnrichments.set(botId, enrichment);
        });
        
        if (!cancelled) {
          setEnrichments(newEnrichments);
        }
      } catch (err) {
        console.error('Failed to enrich bots:', err);
      }
    };

    enrichBots();

    return () => {
      cancelled = true;
    };
  }, [filteredLogs, loading]);

  // Direct lookup by botId if search query is numeric
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setDirectLookupBot(null);
      return;
    }

    const botId = BigInt(trimmed);
    
    // Check if already in logs
    if (logs.find((log) => log.botId === botId)) {
      setDirectLookupBot(null);
      return;
    }

    const lookup = async () => {
      const config = loadConfig();
      if (!config.botRegistry) return;

      try {
        setLookupLoading(true);
        
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

        if (botAccount && botAccount !== '0x0000000000000000000000000000000000000000') {
          const metadata = decodeMetadataURI(metadataURI);
          const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';

          setDirectLookupBot({
            botId,
            botAccount,
            name: metadata?.name as string | undefined,
            handle: metadata?.handle as string | undefined,
            image: metadata?.image as string | undefined,
            hasToken,
          });
        } else {
          setDirectLookupBot(null);
        }
      } catch (err) {
        console.error('Direct lookup failed:', err);
        setDirectLookupBot(null);
      } finally {
        setLookupLoading(false);
      }
    };

    lookup();
  }, [searchQuery, logs]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Explore Bots</h1>
        <p className="text-white/60">All trading agents deployed onchain</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by bot ID, account address, or creator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-white/60">Loading bots...</p>
        </div>
      ) : (
        <>
          {directLookupBot && (
            <div className="mb-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-blue-400 text-sm">Direct lookup result (not in recent logs):</p>
              </div>
              <Link href={`/bots/${directLookupBot.botId}`}>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer">
                  <div className="flex items-start gap-4 mb-4">
                    {directLookupBot.image && (
                      <img 
                        src={directLookupBot.image} 
                        alt={directLookupBot.name || `Bot ${directLookupBot.botId}`}
                        className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xl font-bold text-white hover:text-red-400 transition-colors">
                          {directLookupBot.name || `Bot #${directLookupBot.botId.toString()}`}
                        </h3>
                        {directLookupBot.hasToken && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                            Token
                          </span>
                        )}
                      </div>
                      {directLookupBot.handle && (
                        <p className="text-sm text-white/60 mt-1 font-mono">{directLookupBot.handle}</p>
                      )}
                      <p className="text-white/40 text-xs mt-2 font-mono break-all">
                        {directLookupBot.botAccount}
                      </p>
                    </div>
                  </div>
                  <p className="text-red-400 text-sm">View details →</p>
                </div>
              </Link>
            </div>
          )}

          {lookupLoading && (
            <div className="text-center py-6">
              <p className="text-white/60 text-sm">Looking up bot #{searchQuery}...</p>
            </div>
          )}

          {filteredLogs.length === 0 && !directLookupBot && !lookupLoading ? (
            <div className="text-center py-12">
              <p className="text-white/60">
                {searchQuery ? 'No bots match your search.' : 'No bots found. Be the first to create one!'}
              </p>
              {searchQuery && /^\d+$/.test(searchQuery.trim()) && (
                <p className="text-white/40 text-sm mt-2">
                  Bot #{searchQuery} not found or does not exist.
                </p>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLogs.map((bot) => {
                const enrichment = enrichments.get(bot.botId.toString());
                return (
                  <BotCard 
                    key={bot.botId.toString()} 
                    bot={bot}
                    name={enrichment?.name}
                    handle={enrichment?.handle}
                    image={enrichment?.image}
                    hasToken={enrichment?.hasToken}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
