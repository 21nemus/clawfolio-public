'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useBotRegistryLogs } from '@/hooks/useBotRegistryLogs';
import { useBotDetails, LIFECYCLE_STATES } from '@/hooks/useBotDetails';
import { useBotEvents } from '@/hooks/useBotEvents';
import { useBotToken } from '@/hooks/useBotToken';
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
import { TokenizePanel } from '@/components/actions/TokenizePanel';
import { PostsFeed } from '@/components/PostsFeed';
import { StatusChip } from '@/components/StatusChip';
import { CopyButton } from '@/components/CopyButton';
import { decodeMetadataURI } from '@/lib/encoding';

export default function BotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { logs, loading: logsLoading } = useBotRegistryLogs();
  const { address } = useAccount();
  
  const bot = logs.find((b) => b.botId.toString() === id);
  const { details, loading: detailsLoading } = useBotDetails(bot?.botAccount);
  const { events, loading: eventsLoading } = useBotEvents(bot?.botAccount);
  const { token: botToken } = useBotToken(bot?.botId);

  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  useEffect(() => {
    if (bot) {
      const decoded = decodeMetadataURI(bot.metadataURI);
      setMetadata(decoded);
    }
  }, [bot]);

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
          <div className="flex flex-wrap gap-2 mb-4">
            <StatusChip 
              label={details.paused ? 'Paused' : 'Active'} 
              variant={details.paused ? 'warning' : 'success'} 
            />
            <StatusChip 
              label={`Lifecycle: ${LIFECYCLE_STATES[details.lifecycleState as keyof typeof LIFECYCLE_STATES]}`}
              variant="info"
            />
            {botToken && (
              <StatusChip 
                label="Token Launched" 
                variant="success" 
              />
            )}
          </div>

          {metadata ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-400">Identity & Strategy</h3>
              <div className="space-y-3 text-sm">
                {metadata.image ? (
                  <div className="mb-4">
                    <img 
                      src={metadata.image as string} 
                      alt="Agent avatar" 
                      className="w-32 h-32 object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
                {metadata.name ? (
                  <div>
                    <span className="text-white/60">Name:</span>
                    <span className="ml-2 text-white font-medium">{metadata.name as string}</span>
                  </div>
                ) : null}
                {metadata.description ? (
                  <div>
                    <span className="text-white/60">Description:</span>
                    <p className="mt-1 text-white/80">{metadata.description as string}</p>
                  </div>
                ) : null}
                {metadata.handle ? (
                  <div>
                    <span className="text-white/60">Handle:</span>
                    <span className="ml-2 text-white/80 font-mono text-xs">{metadata.handle as string}</span>
                  </div>
                ) : null}
                {metadata.strategyPrompt ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60">Strategy Prompt:</span>
                      <div className="flex gap-2">
                        <CopyButton text={metadata.strategyPrompt as string} label="strategy" />
                        <button
                          onClick={() => setStrategyExpanded(!strategyExpanded)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          {strategyExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>
                    <p className="text-white/80 font-mono text-xs bg-black/20 p-3 rounded border border-white/5">
                      {strategyExpanded 
                        ? metadata.strategyPrompt as string 
                        : (metadata.strategyPrompt as string).slice(0, 200) + ((metadata.strategyPrompt as string).length > 200 ? '...' : '')}
                    </p>
                    <p className="text-xs text-white/40 mt-1">This prompt guides the agent runner's trading decisions</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-2 text-red-400">Identity & Strategy</h3>
              <p className="text-white/60 text-sm">Metadata not decodable. Raw URI:</p>
              <p className="text-white/40 text-xs font-mono mt-2 break-all">{bot.metadataURI}</p>
            </div>
          )}

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
              { 
                label: 'Transaction', 
                value: (
                  <div className="flex items-center gap-2">
                    <TxLink hash={bot.transactionHash} />
                    <CopyButton text={bot.transactionHash} label="tx hash" />
                  </div>
                )
              },
              { label: 'Block', value: bot.blockNumber.toString() },
              { label: 'Metadata URI', value: bot.metadataURI.slice(0, 50) + '...' },
            ]}
          />

          <TokenizePanel 
            botId={bot.botId} 
            botToken={botToken || undefined} 
            isCreator={!!isCreator}
            botMetadata={metadata}
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

          <PostsFeed botId={id} />

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
