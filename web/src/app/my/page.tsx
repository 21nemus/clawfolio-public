'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { AddressLink } from '@/components/AddressLink';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MyBot {
  botId: bigint;
  botAccount: `0x${string}` | null;
}

export default function MyBotsPage() {
  const { address, isConnected } = useAccount();
  const [bots, setBots] = useState<MyBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isConnected || !address) {
      setBots([]);
      setLoading(false);
      return;
    }

    const fetchMyBots = async () => {
      const config = loadConfig();
      
      if (!config.botRegistry) {
        setError('BotRegistry address not configured');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Direct contract call: getBotsByCreator
        const botIds = await publicClient.readContract({
          address: config.botRegistry,
          abi: BOT_REGISTRY_ABI,
          functionName: 'getBotsByCreator',
          args: [address],
        }) as bigint[];

        // Optionally fetch botAccountOf for each (minimal)
        const botsWithAccounts = await Promise.all(
          botIds.map(async (botId) => {
            if (!config.botRegistry) return { botId, botAccount: null };
            try {
              const botAccount = await publicClient.readContract({
                address: config.botRegistry,
                abi: BOT_REGISTRY_ABI,
                functionName: 'botAccountOf',
                args: [botId],
              }) as `0x${string}`;
              return { botId, botAccount };
            } catch {
              return { botId, botAccount: null };
            }
          })
        );

        setBots(botsWithAccounts);
      } catch (err) {
        console.error('Failed to fetch your bots:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch your bots');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBots();
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Bots</h1>
          <p className="text-white/60">Your deployed trading agents</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <p className="text-yellow-400">Please connect your wallet to view your bots.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Bots</h1>
        <p className="text-white/60">
          Bots created by <span className="font-mono text-sm">{address}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-white/60">Loading your bots...</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60 mb-4">You haven't created any bots yet.</p>
          <a
            href="/create"
            className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Create Your First Bot →
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <div
              key={bot.botId.toString()}
              className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer group"
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('a')) {
                  router.push(`/bots/${bot.botId}`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/bots/${bot.botId}`);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                    <Link href={`/bots/${bot.botId}`} className="hover:underline">
                      Bot #{bot.botId.toString()}
                    </Link>
                  </h3>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {bot.botAccount && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Account:</span>
                    <AddressLink address={bot.botAccount} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
