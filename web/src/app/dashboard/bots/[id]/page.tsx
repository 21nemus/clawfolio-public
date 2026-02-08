import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadConfig } from '@/lib/config';
import { publicClient, getAddressUrl, getTxUrl } from '@/lib/clients';
import { BOT_REGISTRY_ABI, BOT_ACCOUNT_ABI } from '@/lib/abi';
import { DebugBeacon } from '@/components/DebugBeacon';

export const dynamic = 'force-dynamic';

const LIFECYCLE_LABELS: Record<number, string> = {
  0: 'Draft',
  1: 'Stealth',
  2: 'Public',
  3: 'Graduated',
  4: 'Retired',
};

function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) return 'Never';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

async function getBotDetails(botId: number) {
  const config = loadConfig();
  
  if (!config.botRegistry) {
    return { error: 'BotRegistry address not configured' };
  }

  try {
    // Get bot data from registry
    const [botAccountAddr, metadataURI] = await Promise.all([
      publicClient.readContract({
        address: config.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'botAccountOf',
        args: [BigInt(botId)],
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: config.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'metadataURI',
        args: [BigInt(botId)],
      }) as Promise<string>,
    ]);

    if (!botAccountAddr || botAccountAddr === '0x0000000000000000000000000000000000000000') {
      return { error: 'Bot not found' };
    }

    // Get bot account details
    const [creator, operator, paused, lifecycleState, riskParams, lastTradeTimestamp, nonce] = await Promise.all([
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'creator',
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'operator',
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'paused',
      }) as Promise<boolean>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'lifecycleState',
      }) as Promise<number>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'riskParams',
      }) as Promise<{ maxAmountInPerTrade: bigint; minSecondsBetweenTrades: bigint }>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'lastTradeTimestamp',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: botAccountAddr,
        abi: BOT_ACCOUNT_ABI,
        functionName: 'nonce',
      }) as Promise<bigint>,
    ]);

    return {
      botId,
      botAccountAddr,
      metadataURI,
      creator,
      operator,
      paused,
      lifecycleState: Number(lifecycleState),
      riskParams: {
        maxAmountInPerTrade: riskParams.maxAmountInPerTrade.toString(),
        minSecondsBetweenTrades: Number(riskParams.minSecondsBetweenTrades),
      },
      lastTradeTimestamp,
      nonce: Number(nonce),
    };
  } catch (error) {
    console.error('Failed to fetch bot details:', error);
    return { error: 'Failed to fetch bot details from chain' };
  }
}

export default async function BotDetailPage({ params }: { params: { id: string } }) {
  const botId = parseInt(params.id, 10);
  
  if (isNaN(botId) || botId < 0) {
    notFound();
  }

  const data = await getBotDetails(botId);

  if ('error' in data) {
    if (data.error === 'Bot not found') {
      notFound();
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">
            Bot #{botId}
          </h1>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <p className="text-red-300 font-medium">{data.error}</p>
          </div>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lifecycleLabel = LIFECYCLE_LABELS[data.lifecycleState] || `Unknown (${data.lifecycleState})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <DebugBeacon page="dashboard/bots/[id]:render" botId={params.id} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Bot #{data.botId}
          </h1>
          <p className="text-slate-400">Read-only bot details from Monad testnet</p>
        </div>

        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Lifecycle</div>
                <div className="text-white font-medium">{lifecycleLabel}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Paused</div>
                <div className={`font-medium ${data.paused ? 'text-red-400' : 'text-green-400'}`}>
                  {data.paused ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Trade Nonce</div>
                <div className="text-white font-medium">{data.nonce}</div>
              </div>
            </div>
          </div>

          {/* Addresses Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Addresses</h2>
            <div className="space-y-3">
              <div>
                <div className="text-slate-400 text-sm mb-1">Bot Account</div>
                <a
                  href={getAddressUrl(data.botAccountAddr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-mono text-sm break-all"
                >
                  {data.botAccountAddr}
                </a>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Creator</div>
                <a
                  href={getAddressUrl(data.creator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-mono text-sm break-all"
                >
                  {data.creator}
                </a>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Operator</div>
                <a
                  href={getAddressUrl(data.operator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-mono text-sm break-all"
                >
                  {data.operator}
                </a>
              </div>
            </div>
          </div>

          {/* Risk Parameters Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Risk Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Max Amount Per Trade</div>
                <div className="text-white font-medium font-mono">{data.riskParams.maxAmountInPerTrade}</div>
                <div className="text-slate-500 text-xs mt-1">wei</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Min Seconds Between Trades</div>
                <div className="text-white font-medium">{data.riskParams.minSecondsBetweenTrades}s</div>
                <div className="text-slate-500 text-xs mt-1">
                  {data.riskParams.minSecondsBetweenTrades >= 3600
                    ? `(${(data.riskParams.minSecondsBetweenTrades / 3600).toFixed(1)}h)`
                    : data.riskParams.minSecondsBetweenTrades >= 60
                    ? `(${(data.riskParams.minSecondsBetweenTrades / 60).toFixed(1)}m)`
                    : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Trading History Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Trading History</h2>
            <div>
              <div className="text-slate-400 text-sm mb-1">Last Trade Timestamp</div>
              <div className="text-white font-medium">{formatTimestamp(data.lastTradeTimestamp)}</div>
              {data.lastTradeTimestamp !== 0n && (
                <div className="text-slate-500 text-xs mt-1">
                  Unix: {data.lastTradeTimestamp.toString()}
                </div>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Metadata</h2>
            <div>
              <div className="text-slate-400 text-sm mb-1">Metadata URI</div>
              <div className="text-white font-mono text-sm break-all bg-slate-900/50 p-3 rounded">
                {data.metadataURI || '(empty)'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
