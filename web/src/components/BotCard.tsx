'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddressLink } from './AddressLink';
import { TxLink } from './TxLink';
import { formatBlockNumber } from '@/lib/format';
import { BotCreatedEvent } from '@/hooks/useBotRegistryLogs';

interface BotCardProps {
  bot: BotCreatedEvent;
  name?: string;
  handle?: string;
  image?: string;
  hasToken?: boolean;
}

export function BotCard({ bot, name, handle, image, hasToken }: BotCardProps) {
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on an anchor link (explorer links)
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    router.push(`/agents/${bot.botId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/agents/${bot.botId}`);
    }
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer group"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
    >
      <div className="flex items-start gap-4 mb-4">
        {image && (
          <img 
            src={image} 
            alt={name || `Bot ${bot.botId}`}
            className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
              <Link href={`/agents/${bot.botId}`} className="hover:underline">
                {name || `Bot #${bot.botId.toString()}`}
              </Link>
            </h3>
            {hasToken && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                Token
              </span>
            )}
          </div>
          {handle && (
            <p className="text-sm text-white/60 mt-1 font-mono">{handle}</p>
          )}
          <p className="text-xs text-white/40 mt-1">
            Block {formatBlockNumber(bot.blockNumber)}
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Account:</span>
          <AddressLink address={bot.botAccount} />
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Creator:</span>
          <AddressLink address={bot.creator} />
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Operator:</span>
          <AddressLink address={bot.operator} />
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Tx:</span>
          <TxLink hash={bot.transactionHash} />
        </div>
      </div>
    </div>
  );
}
