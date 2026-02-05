'use client';

import { useAccount } from 'wagmi';
import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { BotCard } from '@/components/BotCard';

export default function MyBotsPage() {
  const { address, isConnected } = useAccount();
  const { logs, loading, error } = useBotRegistryLogs(address);

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
      ) : logs.length === 0 ? (
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
          {logs.map((bot) => (
            <BotCard key={bot.botId.toString()} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
