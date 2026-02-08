'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useBotRegistryLogs, BotCreatedEvent } from '@/hooks/useBotRegistryLogs';
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
import { MoltbookPostPanel } from '@/components/actions/MoltbookPostPanel';
import { PostsFeed } from '@/components/PostsFeed';
import { StatusChip } from '@/components/StatusChip';
import { CopyButton } from '@/components/CopyButton';
import { decodeMetadataURI } from '@/lib/encoding';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';

export default function BotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { logs, loading: logsLoading } = useBotRegistryLogs();
  const { address } = useAccount();
  
  const [bot, setBot] = useState<BotCreatedEvent | null>(null);
  const [directLookupLoading, setDirectLookupLoading] = useState(false);
  const [botNotFound, setBotNotFound] = useState(false);

  const { details, loading: detailsLoading } = useBotDetails(bot?.botAccount);
  const { events, loading: eventsLoading } = useBotEvents(bot?.botAccount);
  const { token: botToken } = useBotToken(bot?.botId);

  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  // Find bot in logs or do direct lookup
  useEffect(() => {
    const botFromLogs = logs.find((b) => b.botId.toString() === id);
    
    if (botFromLogs) {
      setBot(botFromLogs);
      setBotNotFound(false);
      return;
    }

    // If logs are still loading, wait
    if (logsLoading) {
      return;
    }

    // Direct lookup fallback when bot not in logs
    const directLookup = async () => {
      const config = loadConfig();
      if (!config.botRegistry) {
        setBotNotFound(true);
        return;
      }

      try {
        setDirectLookupLoading(true);
        const botId = BigInt(id);

        const [botAccount, metadataURI] = await Promise.all([
          publicClient.readContract({
            address: config.botRegistry,
            abi: BOT_REGISTRY_ABI,
            functionName: 'botAccountOf',
            args: [botId],
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: config.botRegistry,
            abi: BOT_REGISTRY_ABI,
            functionName: 'metadataURI',
            args: [botId],
          }) as Promise<string>,
        ]);

        if (!botAccount || botAccount === '0x0000000000000000000000000000000000000000') {
          setBotNotFound(true);
          return;
        }

        // Attempt bounded log search for creation proof
        let transactionHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
        let blockNumber: bigint = 0n;
        let creator: `0x${string}` = '0x0000000000000000000000000000000000000000' as `0x${string}`;
        let operator: `0x${string}` = '0x0000000000000000000000000000000000000000' as `0x${string}`;

        try {
          const latestBlock = await publicClient.getBlockNumber();
          const CHUNK_SIZE = 100n;
          const MAX_CHUNKS = 30; // 3000 blocks max
          
          let currentBlock = latestBlock;
          let chunksScanned = 0;
          let found = false;

          while (chunksScanned < MAX_CHUNKS && currentBlock > config.startBlock && !found) {
            const fromBlock = currentBlock - CHUNK_SIZE > config.startBlock 
              ? currentBlock - CHUNK_SIZE 
              : config.startBlock;

            const logs = await publicClient.getLogs({
              address: config.botRegistry,
              event: {
                type: 'event',
                name: 'BotCreated',
                inputs: [
                  { type: 'uint256', indexed: true, name: 'botId' },
                  { type: 'address', indexed: true, name: 'creator' },
                  { type: 'address', indexed: false, name: 'botAccount' },
                  { type: 'address', indexed: false, name: 'operator' },
                  { type: 'string', indexed: false, name: 'metadataURI' },
                ],
              },
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of logs) {
              if (log.args.botId === botId) {
                transactionHash = log.transactionHash as `0x${string}`;
                blockNumber = log.blockNumber;
                creator = log.args.creator as `0x${string}`;
                operator = log.args.operator as `0x${string}`;
                found = true;
                break;
              }
            }

            currentBlock = fromBlock - 1n;
            chunksScanned++;
          }
        } catch (err) {
          console.log('Bounded log search failed, using placeholders:', err);
        }

        // Construct bot object (with creation proof if found)
        setBot({
          botId,
          botAccount,
          creator,
          operator,
          metadataURI,
          transactionHash,
          blockNumber,
        });
        setBotNotFound(false);
      } catch (err) {
        console.error('Direct lookup failed:', err);
        setBotNotFound(true);
      } finally {
        setDirectLookupLoading(false);
      }
    };

    directLookup();
  }, [id, logs, logsLoading]);

  useEffect(() => {
    if (bot) {
      const decoded = decodeMetadataURI(bot.metadataURI);
      setMetadata(decoded);
    }
  }, [bot]);

  // Update creator/operator from details when available (for direct lookup case)
  useEffect(() => {
    if (bot && details && bot.creator === '0x0000000000000000000000000000000000000000') {
      setBot((prev) => prev ? {
        ...prev,
        creator: details.creator,
        operator: details.operator,
      } : null);
    }
  }, [bot, details]);

  const isCreator = details && address && details.creator.toLowerCase() === address.toLowerCase();

  if (logsLoading || directLookupLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-white/60">
          {directLookupLoading ? 'Looking up bot onchain...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (botNotFound || !bot) {
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
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-400">Identity & Strategy</h3>
                {isCreator && (
                  <span className="text-xs text-white/40 italic">Identity is immutable after creation</span>
                )}
              </div>
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

          {bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
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
          ) : (
            <ProofPanel
              title="Creation"
              items={[
                { label: 'Transaction', value: 'Not available (bot found via direct lookup)' },
                { label: 'Metadata URI', value: bot.metadataURI.slice(0, 50) + '...' },
              ]}
            />
          )}

          <TokenizePanel 
            botId={bot.botId} 
            botToken={botToken || undefined} 
            isCreator={!!isCreator}
            botMetadata={metadata}
          />

          <MoltbookPostPanel
            botId={bot.botId}
            botAccountAddress={bot.botAccount}
            creatorAddress={details.creator}
            lifecycleLabel={LIFECYCLE_STATES[details.lifecycleState as keyof typeof LIFECYCLE_STATES]}
            botMetadata={metadata}
            botToken={botToken || undefined}
            creationTxHash={bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? bot.transactionHash : undefined}
            isCreator={!!isCreator}
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
