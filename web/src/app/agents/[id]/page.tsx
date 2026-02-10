'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBotRegistryLogs, BotCreatedEvent } from '@/hooks/useBotRegistryLogs';
import { useBotDetails, LIFECYCLE_STATES } from '@/hooks/useBotDetails';
import { useBotEvents } from '@/hooks/useBotEvents';
import { useBotToken } from '@/hooks/useBotToken';
import { useAgentAvatar } from '@/hooks/useAgentAvatar';
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
import { uploadImage } from '@/lib/nadfun/client';
import { setAgentImageOverride } from '@/lib/agentImageOverride';
import { getRunnerBotPerf, getRunnerHealth, RunnerPerf } from '@/lib/runnerClient';

export default function BotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  // Strict param validation to prevent invalid/undefined IDs
  const isValidId = id && id !== 'undefined' && /^\d+$/.test(id);
  
  const { logs } = useBotRegistryLogs();
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
  
  // Agent avatar resolver with fallbacks
  const { avatarUrl, hasOverride, refreshOverride } = useAgentAvatar({
    chainId: appConfig.chainId,
    botId: bot?.botId || 0n,
    metadataImage: metadata?.image as string | undefined,
    botToken: botToken || undefined,
    hasToken: !!botToken,
  });
  
  // Image override upload UI state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadSuccess, setImageUploadSuccess] = useState(false);
  const [runnerPerf, setRunnerPerf] = useState<RunnerPerf | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<'unconfigured' | 'online' | 'offline' | 'loading'>(
    appConfig.runnerBaseUrl ? 'loading' : 'unconfigured'
  );

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

  useEffect(() => {
    let cancelled = false;
    const baseUrl = appConfig.runnerBaseUrl;
    if (!baseUrl) {
      setRunnerStatus('unconfigured');
      return;
    }
    if (!isValidId) {
      return;
    }

    const fetchRunner = async () => {
      setRunnerStatus('loading');
      const [healthResult, perfResult] = await Promise.all([
        getRunnerHealth(baseUrl),
        getRunnerBotPerf(baseUrl, id),
      ]);
      if (cancelled) return;
      if (healthResult.ok && perfResult.ok && perfResult.data) {
        setRunnerStatus('online');
        setRunnerPerf(perfResult.data);
      } else {
        setRunnerStatus('offline');
        setRunnerPerf(null);
      }
    };

    fetchRunner();
    const timer = setInterval(fetchRunner, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [appConfig.runnerBaseUrl, id, isValidId]);

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

  const handleImageOverrideUpload = async () => {
    if (!imageFile || !bot) return;
    
    setImageUploading(true);
    setImageUploadError(null);
    setImageUploadSuccess(false);
    
    try {
      const result = await uploadImage(imageFile);
      const imageUri = result.image_uri || result.url || result.image_url;
      
      if (!imageUri) {
        throw new Error('No image URL in response');
      }
      
      setAgentImageOverride(appConfig.chainId, bot.botId, imageUri);
      refreshOverride();
      setImageUploadSuccess(true);
      setImageFile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setImageUploadSuccess(false), 3000);
    } catch (err: unknown) {
      setImageUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  // Only block if we don't have a bot yet
  if (!bot && directLookupLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-white/60">Looking up bot onchain...</p>
      </div>
    );
  }

  // Show invalid ID error first
  if (!isValidId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Invalid Agent ID</h2>
          <p className="text-white/70 mb-4">This link looks broken. The agent ID must be a valid number.</p>
          <Link
            href="/agents"
            className="inline-block px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Go back to Explore
          </Link>
        </div>
      </div>
    );
  }

  if (botNotFound || !bot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Agent #{id} not found</h2>
          <p className="text-white/70 mb-4">This agent doesn't exist or hasn't been indexed yet.</p>
          <Link
            href="/agents"
            className="inline-block px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Go back to Explore
          </Link>
        </div>
      </div>
    );
  }

  // Derive last activity from events
  const lastActivity = events && events.length > 0 ? events[0] : null;
  const latestRunner = runnerPerf?.latest ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {detailsLoading ? (
        <p className="text-white/60">Loading bot details...</p>
      ) : details ? (
        <>
          {/* Profile Header */}
          <div className="mb-10 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              {/* Left: Bot Identity */}
              <div className="flex gap-5">
                {avatarUrl ? (
                  <div className="relative">
                    <img 
                      src={avatarUrl} 
                      alt="Agent avatar" 
                      className="w-32 h-32 object-cover rounded-lg border border-white/20 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {hasOverride && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        Custom
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2 leading-tight">
                    {metadata?.name ? metadata.name as string : `Bot #${bot.botId.toString()}`}
                  </h1>
                  {metadata?.handle ? (
                    <p className="text-white/50 font-mono text-sm mb-3">{metadata.handle as string}</p>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <AddressLink address={bot.botAccount} />
                    <CopyButton text={bot.botAccount} label="address" />
                    {appConfig.explorerAddressUrlPrefix && (
                      <a
                        href={`${appConfig.explorerAddressUrlPrefix}${bot.botAccount}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-red-400 transition-colors text-base"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
                {metadata && (metadata.website || metadata.twitter) ? (
                  <div className="mt-3 flex items-center gap-2">
                    {metadata.website && typeof metadata.website === 'string' ? (
                      <a
                        href={metadata.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-xs text-white/80 hover:text-white transition-colors"
                      >
                        🌐 Website
                      </a>
                    ) : null}
                    {metadata.twitter && typeof metadata.twitter === 'string' ? (
                      <a
                        href={
                          metadata.twitter.startsWith('http')
                            ? metadata.twitter
                            : `https://x.com/${metadata.twitter.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-xs text-white/80 hover:text-white transition-colors"
                      >
                        𝕏 X
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Right: Status Pills */}
              <div className="flex flex-wrap gap-2 lg:justify-end">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Primary Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Identity & Strategy - PRIMARY */}
              {metadata ? (
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Identity & Strategy</h3>
                    {isCreator && (
                      <span className="text-xs text-white/30 italic">immutable</span>
                    )}
                  </div>
                  <div className="space-y-5">
                    {metadata.description ? (
                      <div>
                        <span className="text-xs uppercase tracking-wide text-white/40 font-medium">Description</span>
                        <p className="mt-2 text-white/90 leading-relaxed">{metadata.description as string}</p>
                      </div>
                    ) : null}
                    {metadata.strategyPrompt ? (
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wide text-white/40 font-medium">Strategy Prompt</span>
                          <div className="flex gap-2">
                            <CopyButton text={metadata.strategyPrompt as string} label="strategy" />
                            <button
                              onClick={() => setStrategyExpanded(!strategyExpanded)}
                              className="text-xs text-white/60 hover:text-red-400 transition-colors"
                            >
                              {strategyExpanded ? 'Collapse' : 'Expand'}
                            </button>
                          </div>
                        </div>
                        <p className="text-white/80 font-mono text-xs bg-black/30 p-4 rounded-lg border border-white/5 leading-relaxed">
                          {strategyExpanded 
                            ? metadata.strategyPrompt as string 
                            : (metadata.strategyPrompt as string).slice(0, 200) + ((metadata.strategyPrompt as string).length > 200 ? '...' : '')}
                        </p>
                        <p className="text-xs text-white/30 mt-2">Guides the agent runner&apos;s trading decisions</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
                  <h3 className="text-2xl font-bold mb-4 text-white">Identity & Strategy</h3>
                  <p className="text-white/50 text-sm">Metadata not decodable. Raw URI:</p>
                  <p className="text-white/30 text-xs font-mono mt-2 break-all">{bot.metadataURI}</p>
                </div>
              )}

              {/* Onchain Proof - PRIMARY */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
                <h3 className="text-2xl font-bold mb-6 text-white">Onchain Proof</h3>
                
                <div className="space-y-6">
                  {/* Creation Group */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-white/40 font-medium mb-4">Creation</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Transaction</span>
                        {bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <TxLink hash={bot.transactionHash} />
                            <CopyButton text={bot.transactionHash} label="tx" />
                          </div>
                        ) : (
                          <span className="text-white/40 text-sm text-right">Not available</span>
                        )}
                      </div>
                      {bot.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-white/50 min-w-[100px]">Block</span>
                          <span className="text-white font-mono font-semibold">{bot.blockNumber.toString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Metadata URI</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 font-mono text-xs truncate max-w-[200px]">
                            {bot.metadataURI.slice(0, 30)}...
                          </span>
                          <CopyButton text={bot.metadataURI} label="URI" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Runtime Group */}
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="text-xs uppercase tracking-wide text-white/40 font-medium mb-4">Runtime</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Creator</span>
                        <AddressLink address={details.creator} />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Operator</span>
                        <AddressLink address={details.operator} />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Nonce</span>
                        <span className="text-white text-xl font-bold tabular-nums">{details.nonce.toString()}</span>
                      </div>
                      {lastActivity && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-white/50 min-w-[100px]">Last Activity</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/70 text-xs">{lastActivity.type}</span>
                            <TxLink hash={lastActivity.transactionHash} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Max Trade</span>
                        <span className="text-white/80 font-mono text-sm">{formatTokenAmount(details.riskParams.maxAmountInPerTrade)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white/50 min-w-[100px]">Cooldown</span>
                        <span className="text-white/80 font-mono text-sm">{details.riskParams.minSecondsBetweenTrades.toString()}s</span>
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

              {/* Simulation Runner Performance */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
                <h3 className="text-2xl font-bold mb-3 text-white">Simulated Performance (Runner)</h3>
                <p className="text-xs uppercase tracking-wide text-white/40 font-medium mb-6">
                  Mode: Simulation
                </p>
                {runnerStatus === 'unconfigured' && (
                  <p className="text-white/40 text-sm">Runner not configured.</p>
                )}
                {runnerStatus === 'loading' && (
                  <p className="text-white/50 text-sm">Loading runner data...</p>
                )}
                {runnerStatus === 'offline' && (
                  <p className="text-yellow-400 text-sm">Runner offline.</p>
                )}
                {runnerStatus === 'online' && latestRunner && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.03] rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-1">Equity</p>
                      <p className="text-xl font-bold text-white">{latestRunner.equity.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-1">PnL</p>
                      <p className={`text-xl font-bold ${latestRunner.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {latestRunner.pnl >= 0 ? '+' : ''}{latestRunner.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-1">PnL %</p>
                      <p className={`text-xl font-bold ${latestRunner.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {latestRunner.pnlPct >= 0 ? '+' : ''}{latestRunner.pnlPct.toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-1">Trades</p>
                      <p className="text-xl font-bold text-white">{latestRunner.trades}</p>
                    </div>
                  </div>
                )}
                {runnerStatus === 'online' && latestRunner && (
                  <p className="text-xs text-white/40 mt-4">
                    Last update: {new Date(latestRunner.ts * 1000).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Activity Timeline */}
              <EventTimeline events={events} loading={eventsLoading} />
            </div>

            {/* Right Column: Secondary Content */}
            <div className="space-y-5">
              {/* Tokenization - SECONDARY */}
              <div id="token">
                <TokenizePanel 
                  botId={bot.botId} 
                  botToken={botToken || undefined} 
                  isCreator={!!isCreator}
                  botMetadata={metadata}
                />
              </div>

              {/* Creator Actions - SECONDARY */}
              {isCreator && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-white mb-4">Creator Actions</h3>
                  
                  {/* Pause/Resume */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-orange-500/20 p-4">
                    <h4 className="font-medium text-white text-sm mb-2">⏸️ Pause/Resume</h4>
                    <p className="text-xs text-white/50 mb-3">
                      {details.paused ? 'Resume operations' : 'Pause all operations'}
                    </p>
                    <PauseControl botAccount={bot.botAccount} currentlyPaused={details.paused} />
                  </div>

                  {/* Lifecycle */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                    <h4 className="font-medium text-white text-sm mb-2">🔄 Lifecycle</h4>
                    <p className="text-xs text-white/50 mb-3">
                      Visibility and trading permissions
                    </p>
                    <LifecycleControl botAccount={bot.botAccount} currentState={details.lifecycleState} />
                    
                    {/* Quick Archive/Restore */}
                    {details.lifecycleState !== 4 ? (
                      <button
                        onClick={() => {
                          if (window.confirm('Archive this agent? It will be hidden from Explore (can be restored later via Lifecycle control above).')) {
                            import('wagmi').then(({ useWriteContract }) => {
                              // Direct inline execution would need hook refactor
                              alert('Please use Lifecycle control above and select "Retired (archived)"');
                            });
                          }
                        }}
                        className="mt-3 w-full px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-xs rounded transition-colors"
                      >
                        Quick: Archive Agent
                      </button>
                    ) : (
                      <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                        <p className="text-xs text-yellow-400">⚠️ Agent is archived (use Lifecycle control to restore)</p>
                      </div>
                    )}
                  </div>

                  {/* Deposit */}
                  {address && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                      <h4 className="font-medium text-white text-sm mb-2">💰 Deposit</h4>
                      <p className="text-xs text-white/50 mb-3">
                        Step 1: Approve | Step 2: Deposit
                      </p>
                      <DepositControl botAccount={bot.botAccount} userAddress={address} />
                    </div>
                  )}

                  {/* Withdraw */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-red-500/20 p-4">
                    <h4 className="font-medium text-white text-sm mb-2">💸 Withdraw</h4>
                    <p className="text-xs text-white/50 mb-3">
                      Remove tokens (creator only)
                    </p>
                    <WithdrawControl botAccount={bot.botAccount} creatorAddress={details.creator} />
                  </div>

                  {/* Agent Image Override (Creator Only) */}
                  {isCreator && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                      <h4 className="font-medium text-white text-sm mb-2">🎨 Agent Image</h4>
                      <p className="text-xs text-white/50 mb-3">
                        Change how your agent appears.
                        <span className="text-yellow-400"> (Only on this device)</span>
                      </p>
                      
                      {avatarUrl && (
                        <div className="mb-3 flex justify-center">
                          <div className="relative">
                            <img 
                              src={avatarUrl} 
                              alt="Current avatar" 
                              className="w-16 h-16 object-cover rounded-lg border border-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            {hasOverride && (
                              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded-full font-medium">
                                Custom
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setImageFile(e.target.files?.[0] || null);
                            setImageUploadError(null);
                            setImageUploadSuccess(false);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-white text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-red-500 file:text-white file:cursor-pointer hover:file:bg-red-600 file:text-xs transition-colors"
                        />
                        
                        <button
                          onClick={handleImageOverrideUpload}
                          disabled={imageUploading || !imageFile}
                          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                        >
                          {imageUploading ? 'Uploading...' : 'Upload & Set'}
                        </button>
                        
                        {imageUploadError && (
                          <p className="text-xs text-red-400">{imageUploadError}</p>
                        )}
                        
                        {imageUploadSuccess && (
                          <p className="text-xs text-green-400">✓ Updated!</p>
                        )}
                      </div>
                    </div>
                  )}

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

              {/* Social Feed - TERTIARY */}
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
