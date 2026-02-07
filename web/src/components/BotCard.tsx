'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddressLink } from './AddressLink';
import { TxLink } from './TxLink';
import { formatBlockNumber } from '@/lib/format';
import { BotCreatedEvent } from '@/hooks/useBotRegistryLogs';

export function BotCard({ bot }: { bot: BotCreatedEvent }) {
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on an anchor link (explorer links)
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    router.push(`/bots/${bot.botId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/bots/${bot.botId}`);
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
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
            <Link href={`/bots/${bot.botId}`} className="hover:underline">
              Bot #{bot.botId.toString()}
            </Link>
          </h3>
          <p className="text-sm text-white/60 mt-1">
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
