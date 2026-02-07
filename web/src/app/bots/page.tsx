'use client';

import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { BotCard } from '@/components/BotCard';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import Link from 'next/link';

export default function BotsPage() {
  const { logs, loading, error } = useBotRegistryLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [directLookupBot, setDirectLookupBot] = useState<{botId: bigint; botAccount: `0x${string}`} | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.botId.toString().includes(query) ||
      log.botAccount.toLowerCase().includes(query) ||
      log.creator.toLowerCase().includes(query)
    );
  });

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
        const botAccount = await publicClient.readContract({
          address: config.botRegistry,
          abi: BOT_REGISTRY_ABI,
          functionName: 'botAccountOf',
          args: [botId],
        }) as `0x${string}`;

        if (botAccount && botAccount !== '0x0000000000000000000000000000000000000000') {
          setDirectLookupBot({ botId, botAccount });
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
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all">
                <Link href={`/bots/${directLookupBot.botId}`} className="block">
                  <h3 className="text-xl font-bold text-white hover:text-red-400 transition-colors">
                    Bot #{directLookupBot.botId.toString()}
                  </h3>
                  <p className="text-white/60 text-sm mt-2 font-mono text-xs">
                    {directLookupBot.botAccount}
                  </p>
                  <p className="text-red-400 text-sm mt-3">View details →</p>
                </Link>
              </div>
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
              {filteredLogs.map((bot) => (
                <BotCard key={bot.botId.toString()} bot={bot} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
