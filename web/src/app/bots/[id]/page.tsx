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
import { PerformancePanel } from '@/components/PerformancePanel';
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
  
  const appConfig = loadConfig();

  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  // Check logs first (fast path if bot is recent)
  useEffect(() => {
    const botFromLogs = logs.find((b) => b.botId.toString() === id);
    if (botFromLogs && !bot) {
      setBot(botFromLogs);
      setBotNotFound(false);
    }
  }, [id, logs, bot]);

  // Direct lookup effect (runs on id change only)
  useEffect(() => {
    let cancelled = false;

    const directLookup = async () => {
      const config = loadConfig();
      if (!config.botRegistry) {
        if (!cancelled) setBotNotFound(true);
        return;
      }

      try {
        setDirectLookupLoading(true);
        const botId = BigInt(id);

        // Fast registry reads (no log scan yet)
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

        if (cancelled) return;

        if (!botAccount || botAccount === '0x0000000000000000000000000000000000000000') {
          setBotNotFound(true);
          return;
        }

        // Set bot immediately with placeholder creation proof
        setBot({
          botId,
          botAccount,
          creator: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          operator: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          metadataURI,
          transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          blockNumber: 0n,
        });
        setBotNotFound(false);
      } catch (err) {
        console.error('Direct lookup failed:', err);
        if (!cancelled) setBotNotFound(true);
      } finally {
        if (!cancelled) setDirectLookupLoading(false);
      }
    };

    directLookup();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Background creation-proof scan (runs after bot is set with placeholder)
  useEffect(() => {
    if (!bot || bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return; // Skip if no bot or proof already found
    }

    let cancelled = false;

    const fetchCreationProof = async () => {
      const config = loadConfig();
      if (!config.botRegistry) return;

      try {
        const latestBlock = await publicClient.getBlockNumber();
        const CHUNK_SIZE = 100n;
        const MAX_CHUNKS = 30;
        
        let currentBlock = latestBlock;
        let chunksScanned = 0;
        let found = false;

        while (chunksScanned < MAX_CHUNKS && currentBlock > config.startBlock && !found && !cancelled) {
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
            if (log.args.botId === bot.botId) {
              if (!cancelled) {
                setBot((prev) => prev ? {
                  ...prev,
                  transactionHash: log.transactionHash as `0x${string}`,
                  blockNumber: log.blockNumber,
                  creator: log.args.creator as `0x${string}`,
                  operator: log.args.operator as `0x${string}`,
                } : null);
              }
              found = true;
              break;
            }
          }

          currentBlock = fromBlock - 1n;
          chunksScanned++;
        }
      } catch (err) {
        console.log('Background creation-proof scan failed:', err);
      }
    };

    fetchCreationProof();

    return () => {
      cancelled = true;
    };
  }, [bot]);

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

  // Only block if we don't have a bot yet
  if (!bot && directLookupLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-white/60">Looking up bot onchain...</p>
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

  // Derive last activity from events
  const lastActivity = events && events.length > 0 ? events[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {detailsLoading ? (
        <p className="text-white/60">Loading bot details...</p>
      ) : details ? (
        <>
          {/* Profile Header */}
          <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Bot Identity */}
              <div className="flex gap-4">
                {metadata?.image ? (
                  <img 
                    src={metadata.image as string} 
                    alt="Bot avatar" 
                    className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-1">
                    {metadata?.name ? metadata.name as string : `Bot #${bot.botId.toString()}`}
                  </h1>
                  {metadata?.handle ? (
                    <p className="text-white/60 font-mono text-sm mb-2">{metadata.handle as string}</p>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm">
                    <AddressLink address={bot.botAccount} />
                    <CopyButton text={bot.botAccount} label="address" />
                    {appConfig.explorerAddressUrlPrefix && (
                      <a
                        href={`${appConfig.explorerAddressUrlPrefix}${bot.botAccount}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-red-400 transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Status Pills */}
              <div className="flex flex-wrap gap-2">
                <StatusChip 
                  label={LIFECYCLE_STATES[details.lifecycleState as keyof typeof LIFECYCLE_STATES]}
                  variant="info"
                />
                <StatusChip 
                  label={details.paused ? 'Paused' : 'Active'} 
                  variant={details.paused ? 'warning' : 'success'} 
                />
                <StatusChip 
                  label={botToken ? 'Token Launched' : 'No Token'} 
                  variant={botToken ? 'success' : 'default'} 
                />
              </div>
            </div>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Primary Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Identity & Strategy */}
              {metadata ? (
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-red-400">Identity & Strategy</h3>
                    {isCreator && (
                      <span className="text-xs text-white/40 italic">Identity is immutable after creation</span>
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    {metadata.description ? (
                      <div>
                        <span className="text-white/60">Description:</span>
                        <p className="mt-1 text-white/80">{metadata.description as string}</p>
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

              {/* Onchain Proof - Merged */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Onchain Proof</h3>
                
                <div className="space-y-6">
                  {/* Creation Group */}
                  <div>
                    <h4 className="text-sm font-medium text-white/80 mb-3">Creation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Transaction:</span>
                        {bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
                          <div className="flex items-center gap-2">
                            <TxLink hash={bot.transactionHash} />
                            <CopyButton text={bot.transactionHash} label="tx" />
                          </div>
                        ) : (
                          <span className="text-white/60">Not available (direct lookup)</span>
                        )}
                      </div>
                      {bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                        <div className="flex items-start justify-between">
                          <span className="text-white/60">Block:</span>
                          <span className="text-white/80">{bot.blockNumber.toString()}</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Metadata URI:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/80 font-mono text-xs truncate max-w-xs">
                            {bot.metadataURI.slice(0, 40)}...
                          </span>
                          <CopyButton text={bot.metadataURI} label="URI" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Runtime Group */}
                  <div>
                    <h4 className="text-sm font-medium text-white/80 mb-3">Runtime</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Creator:</span>
                        <AddressLink address={details.creator} />
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Operator:</span>
                        <AddressLink address={details.operator} />
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Nonce:</span>
                        <span className="text-white/80 font-medium">{details.nonce.toString()}</span>
                      </div>
                      {lastActivity && (
                        <div className="flex items-start justify-between">
                          <span className="text-white/60">Last Activity:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/80 text-xs">{lastActivity.type}</span>
                            <TxLink hash={lastActivity.transactionHash} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Max Trade Size:</span>
                        <span className="text-white/80">{formatTokenAmount(details.riskParams.maxAmountInPerTrade)}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-white/60">Cooldown:</span>
                        <span className="text-white/80">{details.riskParams.minSecondsBetweenTrades.toString()}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Dashboard */}
              <PerformancePanel 
                botAccount={bot.botAccount}
                events={events}
                explorerAddressUrlPrefix={appConfig.explorerAddressUrlPrefix}
              />

              {/* Activity Timeline */}
              <EventTimeline events={events} loading={eventsLoading} />
            </div>

            {/* Right Column: Secondary Content */}
            <div className="space-y-6">
              {/* Tokenization */}
              <TokenizePanel 
                botId={bot.botId} 
                botToken={botToken || undefined} 
                isCreator={!!isCreator}
                botMetadata={metadata}
              />

              {/* Creator Actions */}
              {isCreator && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-400">Creator Actions</h3>
                  
                  {/* Pause/Resume */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-orange-500/20 p-4">
                    <h4 className="font-medium text-white mb-3">⏸️ Pause/Resume</h4>
                    <p className="text-xs text-white/60 mb-3">
                      {details.paused ? 'Resume bot operations' : 'Temporarily pause all operations'}
                    </p>
                    <PauseControl botAccount={bot.botAccount} currentlyPaused={details.paused} />
                  </div>

                  {/* Lifecycle */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                    <h4 className="font-medium text-white mb-3">🔄 Update Lifecycle</h4>
                    <p className="text-xs text-white/60 mb-3">
                      Change bot visibility and trading permissions
                    </p>
                    <LifecycleControl botAccount={bot.botAccount} currentState={details.lifecycleState} />
                  </div>

                  {/* Deposit */}
                  {address && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                      <h4 className="font-medium text-white mb-3">💰 Deposit Funds</h4>
                      <p className="text-xs text-white/60 mb-3">
                        Step 1: Approve token | Step 2: Deposit to bot
                      </p>
                      <DepositControl botAccount={bot.botAccount} userAddress={address} />
                    </div>
                  )}

                  {/* Withdraw */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-red-500/20 p-4">
                    <h4 className="font-medium text-white mb-3">💸 Withdraw Funds</h4>
                    <p className="text-xs text-white/60 mb-3">
                      Withdraw tokens from bot account (creator only)
                    </p>
                    <WithdrawControl botAccount={bot.botAccount} creatorAddress={details.creator} />
                  </div>

                  {/* Moltbook Publishing */}
                  {appConfig.moltbookEnabled && (
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
                  )}
                </div>
              )}

              {/* Social Feed */}
              <PostsFeed botId={id} />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <p className="text-red-400">Failed to load bot details</p>
        </div>
      )}
    </div>
  );
}
