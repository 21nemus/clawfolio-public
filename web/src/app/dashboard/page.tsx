import Link from 'next/link';
import { loadConfig } from '@/lib/config';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';

export const dynamic = 'force-dynamic';

async function getBotData() {
  const config = loadConfig();
  
  if (!config.botRegistry) {
    return { error: 'BotRegistry address not configured' };
  }

  try {
    const [botCount, creatorBots] = await Promise.all([
      publicClient.readContract({
        address: config.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'botCount',
      }) as Promise<bigint>,
      config.demoCreatorAddr ? publicClient.readContract({
        address: config.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'getBotsByCreator',
        args: [config.demoCreatorAddr],
      }) as Promise<bigint[]> : Promise.resolve([]),
    ]);

    return {
      botCount: Number(botCount),
      creatorBots: creatorBots.map(id => Number(id)),
      creatorAddress: config.demoCreatorAddr,
    };
  } catch (error) {
    console.error('Failed to fetch bot data:', error);
    return { error: 'Failed to fetch data from chain' };
  }
}

export default async function DashboardPage() {
  const config = loadConfig();
  const data = await getBotData();

  if ('error' in data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">
            Clawfolio Dashboard
          </h1>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <p className="text-red-300 font-medium">{data.error}</p>
            <p className="text-slate-400 mt-2 text-sm">
              Set NEXT_PUBLIC_BOT_REGISTRY (or NEXT_PUBLIC_BOT_REGISTRY_ADDR) in your environment variables
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Clawfolio Dashboard
          </h1>
          <p className="text-slate-400">Read-only view of deployed bots on Monad testnet</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">Total Bots</div>
            <div className="text-3xl font-bold text-white">{data.botCount}</div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">Creator Bots</div>
            <div className="text-3xl font-bold text-white">{data.creatorBots.length}</div>
            {data.creatorAddress && (
              <div className="text-xs text-slate-500 mt-2 truncate">
                {data.creatorAddress}
              </div>
            )}
          </div>
        </div>

        {data.creatorBots.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">No bots found for this creator</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Creator Bots</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {data.creatorBots.map((botId) => (
                <Link
                  key={botId}
                  href={`/dashboard/bots/${botId}`}
                  className="block p-6 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Bot #{botId}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        Click to view details
                      </div>
                    </div>
                    <div className="text-purple-400">→</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
