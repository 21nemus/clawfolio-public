import { BotEvent } from '@/hooks/useBotEvents';
import { TxLink } from './TxLink';
import { AddressLink } from './AddressLink';
import { formatTokenAmount, formatBlockNumber } from '@/lib/format';
import { LIFECYCLE_STATES } from '@/hooks/useBotDetails';

function EventItem({ event }: { event: BotEvent }) {
  let icon = '📝';
  let title: string = event.type;
  let details: React.ReactNode = null;

  switch (event.type) {
    case 'TradeExecuted':
      icon = '💱';
      title = 'Trade Executed';
      details = (
        <>
          <div>Amount In: {formatTokenAmount(event.amountIn)}</div>
          <div>Amount Out: {formatTokenAmount(event.amountOut)}</div>
          <div>Nonce: {event.nonce.toString()}</div>
          <div>Router: <AddressLink address={event.router} /></div>
        </>
      );
      break;
    case 'Deposited':
      icon = '💰';
      title = 'Deposit';
      details = (
        <>
          <div>Amount: {formatTokenAmount(event.amount)}</div>
          <div>Token: <AddressLink address={event.token} /></div>
          <div>From: <AddressLink address={event.depositor} /></div>
        </>
      );
      break;
    case 'Withdrawn':
      icon = '💸';
      title = 'Withdrawal';
      details = (
        <>
          <div>Amount: {formatTokenAmount(event.amount)}</div>
          <div>Token: <AddressLink address={event.token} /></div>
          <div>To: <AddressLink address={event.to} /></div>
        </>
      );
      break;
    case 'LifecycleChanged':
      icon = '🔄';
      title = 'Lifecycle Changed';
      details = (
        <div>
          {LIFECYCLE_STATES[event.fromState as keyof typeof LIFECYCLE_STATES]} → {LIFECYCLE_STATES[event.toState as keyof typeof LIFECYCLE_STATES]}
        </div>
      );
      break;
    case 'PausedUpdated':
      icon = event.paused ? '⏸️' : '▶️';
      title = event.paused ? 'Paused' : 'Resumed';
      break;
    case 'OperatorUpdated':
      icon = '🔑';
      title = 'Operator Updated';
      details = (
        <div>
          <AddressLink address={event.oldOperator} label="Old" /> → <AddressLink address={event.newOperator} label="New" />
        </div>
      );
      break;
  }

  return (
    <div className="flex gap-3 pb-4 border-b border-white/5 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-white/70 text-sm">{title}</h4>
            <p className="text-xs text-white/40 mt-1">
              Block {formatBlockNumber(event.blockNumber)}
            </p>
          </div>
          <TxLink hash={event.transactionHash} />
        </div>
        {details && (
          <div className="mt-2 text-xs text-white/60 space-y-1">
            {details}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventTimeline({ events, loading }: { events: BotEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
        <p className="text-white/40 text-xs">Loading events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
        <p className="text-white/40 text-xs">No events yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
      <h3 className="text-sm font-medium mb-4 text-white/50">Activity</h3>
      <div className="space-y-5">
        {events.map((event, idx) => (
          <EventItem key={`${event.type}-${event.transactionHash}-${idx}`} event={event} />
        ))}
      </div>
    </div>
  );
}
