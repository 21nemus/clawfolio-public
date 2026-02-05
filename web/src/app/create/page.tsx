'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { BotRegistryABI } from '@/abi/BotRegistry';
import { loadConfig } from '@/lib/config';
import { encodeMetadataURI } from '@/lib/encoding';
import { ProofPanel } from '@/components/ProofPanel';
import { TxLink } from '@/components/TxLink';
import { AddressLink } from '@/components/AddressLink';

const RISK_PRESETS = {
  conservative: {
    maxAmountInPerTrade: parseEther('10'),
    minSecondsBetweenTrades: 300n, // 5 min
  },
  balanced: {
    maxAmountInPerTrade: parseEther('100'),
    minSecondsBetweenTrades: 120n, // 2 min
  },
  aggressive: {
    maxAmountInPerTrade: parseEther('1000'),
    minSecondsBetweenTrades: 60n, // 1 min
  },
};

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const config = loadConfig();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [handle, setHandle] = useState('');
  const [operator, setOperator] = useState('');
  const [riskPreset, setRiskPreset] = useState<keyof typeof RISK_PRESETS>('balanced');
  const [pathTokenA, setPathTokenA] = useState('');
  const [pathTokenB, setPathTokenB] = useState('');

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [createdBotId, setCreatedBotId] = useState<bigint | null>(null);
  const [createdBotAccount, setCreatedBotAccount] = useState<`0x${string}` | null>(null);

  const handleCreate = async () => {
    if (!config.botRegistry) {
      alert('BotRegistry address not configured');
      return;
    }

    const metadata = {
      name,
      description,
      handle: handle || undefined,
    };

    const metadataURI = encodeMetadataURI(metadata);
    const operatorAddress = (operator || address) as `0x${string}`;
    const riskParams = RISK_PRESETS[riskPreset];
    
    const allowedPaths: `0x${string}`[][] = [];
    if (pathTokenA && pathTokenB) {
      allowedPaths.push([pathTokenA as `0x${string}`, pathTokenB as `0x${string}`]);
    }

    try {
      writeContract({
        address: config.botRegistry,
        abi: BotRegistryABI,
        functionName: 'createBot',
        args: [
          metadataURI,
          operatorAddress,
          riskParams,
          allowedPaths,
          1, // Stealth state
        ],
      });
    } catch (err) {
      console.error('Failed to create bot:', err);
    }
  };

  // Parse receipt logs when transaction succeeds
  useEffect(() => {
    if (isSuccess && receipt && !createdBotId) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: BotRegistryABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'BotCreated') {
            setCreatedBotId(decoded.args.botId);
            setCreatedBotAccount(decoded.args.botAccount);
            break;
          }
        } catch (e) {
          // Skip logs that don't match
        }
      }
    }
  }, [isSuccess, receipt, createdBotId]);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <p className="text-yellow-400">Please connect your wallet to create a bot.</p>
        </div>
      </div>
    );
  }

  if (!config.botRegistry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <p className="text-red-400">BotRegistry address not configured. Set NEXT_PUBLIC_BOT_REGISTRY.</p>
        </div>
      </div>
    );
  }

  if (isSuccess && createdBotId && createdBotAccount) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Bot Created! 🎉</h1>
          <p className="text-white/60">Your trading agent has been deployed onchain.</p>
        </div>

        <ProofPanel
          title="Creation Proof"
          items={[
            { label: 'Bot ID', value: createdBotId.toString() },
            { label: 'Bot Account', value: <AddressLink address={createdBotAccount} shorten={false} /> },
            { label: 'Transaction', value: <TxLink hash={hash!} /> },
          ]}
        />

        <div className="mt-6 flex gap-4">
          <a
            href={`/bots/${createdBotId}`}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            View Bot →
          </a>
          <button
            onClick={() => {
              setCreatedBotId(null);
              setCreatedBotAccount(null);
              setName('');
              setDescription('');
              setHandle('');
            }}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create Bot</h1>
        <p className="text-white/60">Deploy a new autonomous trading agent</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Trading Bot"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A momentum trading bot that..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Moltbook Handle (optional)</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@my-bot"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Operator Address</label>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder={address || '0x...'}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
          />
          <p className="text-xs text-white/40 mt-1">Defaults to your connected wallet</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Risk Preset</label>
          <select
            value={riskPreset}
            onChange={(e) => setRiskPreset(e.target.value as keyof typeof RISK_PRESETS)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-400/50"
          >
            <option value="conservative">Conservative (10 MON max, 5min cooldown)</option>
            <option value="balanced">Balanced (100 MON max, 2min cooldown)</option>
            <option value="aggressive">Aggressive (1000 MON max, 1min cooldown)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Allowed Trading Path</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={pathTokenA}
              onChange={(e) => setPathTokenA(e.target.value)}
              placeholder="Token A address"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
            />
            <input
              type="text"
              value={pathTokenB}
              onChange={(e) => setPathTokenB(e.target.value)}
              placeholder="Token B address"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
            />
          </div>
          <p className="text-xs text-white/40 mt-1">At least one path is recommended</p>
        </div>

        {writeError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">{writeError.message}</p>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name || isPending || isConfirming}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {isPending ? 'Waiting for signature...' : isConfirming ? 'Creating bot...' : 'Create Bot'}
        </button>
      </div>
    </div>
  );
}
