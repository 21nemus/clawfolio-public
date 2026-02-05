import Link from 'next/link';
import { AddressLink } from './AddressLink';
import { TxLink } from './TxLink';
import { formatBlockNumber } from '@/lib/format';
import { BotCreatedEvent } from '@/hooks/useBotRegistryLogs';

export function BotCard({ bot }: { bot: BotCreatedEvent }) {
  return (
    <Link href={`/bots/${bot.botId}`}>
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-red-400/50 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
              Bot #{bot.botId.toString()}
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
    </Link>
  );
}
