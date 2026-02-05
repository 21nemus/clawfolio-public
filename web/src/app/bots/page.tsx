'use client';

import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { BotCard } from '@/components/BotCard';
import { useState } from 'react';

export default function BotsPage() {
  const { logs, loading, error } = useBotRegistryLogs();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.botId.toString().includes(query) ||
      log.botAccount.toLowerCase().includes(query) ||
      log.creator.toLowerCase().includes(query)
    );
  });

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
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60">
            {searchQuery ? 'No bots match your search.' : 'No bots found. Be the first to create one!'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLogs.map((bot) => (
            <BotCard key={bot.botId.toString()} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
