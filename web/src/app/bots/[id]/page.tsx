'use client';

import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { useBotDetails, LIFECYCLE_STATES } from '@/hooks/useBotDetails';
import { useBotEvents } from '@/hooks/useBotEvents';
import { ProofPanel } from '@/components/ProofPanel';
import { EventTimeline } from '@/components/EventTimeline';
import { AddressLink } from '@/components/AddressLink';
import { TxLink } from '@/components/TxLink';
import { formatTokenAmount } from '@/lib/format';
import { useAccount } from 'wagmi';
import { PauseControl } from '@/components/actions/PauseControl';
import { LifecycleControl } from '@/components/actions/LifecycleControl';
import { DepositControl } from '@/components/actions/DepositControl';
import { WithdrawControl } from '@/components/actions/WithdrawControl';

export default function BotDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { logs, loading: logsLoading } = useBotRegistryLogs();
  const { address } = useAccount();
  
  const bot = logs.find((b) => b.botId.toString() === id);
  const { details, loading: detailsLoading } = useBotDetails(bot?.botAccount);
  const { events, loading: eventsLoading } = useBotEvents(bot?.botAccount);

  const isCreator = details && address && details.creator.toLowerCase() === address.toLowerCase();

  if (logsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <p className="text-red-400">Bot #{id} not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Bot #{bot.botId.toString()}</h1>
        <p className="text-white/60">
          <AddressLink address={bot.botAccount} shorten={false} />
        </p>
      </div>

      {detailsLoading ? (
        <p className="text-white/60">Loading bot details...</p>
      ) : details ? (
        <div className="space-y-6">
          <ProofPanel
            title="Bot Details"
            items={[
              { label: 'Creator', value: <AddressLink address={details.creator} /> },
              { label: 'Operator', value: <AddressLink address={details.operator} /> },
              { 
                label: 'Lifecycle State', 
                value: LIFECYCLE_STATES[details.lifecycleState as keyof typeof LIFECYCLE_STATES] 
              },
              { label: 'Paused', value: details.paused ? 'Yes' : 'No' },
              { label: 'Nonce', value: details.nonce.toString() },
              { 
                label: 'Max Trade Size', 
                value: formatTokenAmount(details.riskParams.maxAmountInPerTrade) 
              },
              { 
                label: 'Cooldown', 
                value: `${details.riskParams.minSecondsBetweenTrades.toString()}s` 
              },
            ]}
          />

          <ProofPanel
            title="Creation"
            items={[
              { label: 'Transaction', value: <TxLink hash={bot.transactionHash} /> },
              { label: 'Block', value: bot.blockNumber.toString() },
              { label: 'Metadata URI', value: bot.metadataURI.slice(0, 50) + '...' },
            ]}
          />

          {isCreator && (
            <div className="space-y-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Creator Actions</h3>
                <div className="space-y-6">
                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between py-2 hover:text-red-400 transition-colors">
                      <span className="font-medium">⏸️ Pause/Resume</span>
                      <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-4 pl-4">
                      <PauseControl botAccount={bot.botAccount} currentlyPaused={details.paused} />
                    </div>
                  </details>

                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between py-2 hover:text-red-400 transition-colors">
                      <span className="font-medium">🔄 Update Lifecycle</span>
                      <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-4 pl-4">
                      <LifecycleControl botAccount={bot.botAccount} currentState={details.lifecycleState} />
                    </div>
                  </details>

                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between py-2 hover:text-red-400 transition-colors">
                      <span className="font-medium">💸 Withdraw</span>
                      <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-4 pl-4">
                      <WithdrawControl botAccount={bot.botAccount} creatorAddress={details.creator} />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-400">Deposit Funds</h3>
            <DepositControl botAccount={bot.botAccount} userAddress={address!} />
          </div>

          <EventTimeline events={events} loading={eventsLoading} />
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <p className="text-red-400">Failed to load bot details</p>
        </div>
      )}
    </div>
  );
}
