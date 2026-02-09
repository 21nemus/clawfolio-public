'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { BotRegistryABI } from '@/abi/BotRegistry';
import { loadConfig } from '@/lib/config';
import { encodeMetadataURI } from '@/lib/encoding';
import { resolveTokenInput } from '@/lib/tokenRegistry';
import { uploadImage } from '@/lib/nadfun/client';
import { ProofPanel } from '@/components/ProofPanel';
import { TxLink } from '@/components/TxLink';
import { AddressLink } from '@/components/AddressLink';

const RISK_PRESETS = {
  conservative: {
    maxAmountInPerTrade: parseEther('0.5'), // 0.5 MON - safe for testnet
    minSecondsBetweenTrades: 600n, // 10 min
  },
  balanced: {
    maxAmountInPerTrade: parseEther('1'), // 1 MON - testnet default
    minSecondsBetweenTrades: 300n, // 5 min
  },
  aggressive: {
    maxAmountInPerTrade: parseEther('2'), // 2 MON - max for testnet
    minSecondsBetweenTrades: 120n, // 2 min
  },
  custom: {
    maxAmountInPerTrade: parseEther('1'), // placeholder, will be overridden
    minSecondsBetweenTrades: 300n, // placeholder, will be overridden
  },
};

const STRATEGY_PRESETS = [
  {
    name: 'Momentum',
    prompt: `Execute momentum-based trades on Monad Testnet within your allowed trading path. Buy when 15-minute volume exceeds 2x the rolling average and price breaks above recent resistance. Sell when momentum fades (volume drops or price stalls). Always respect your max trade size and cooldown limits. Avoid trading on illiquid pairs or during extreme slippage.`,
  },
  {
    name: 'MeanRevert',
    prompt: `Trade mean-reversion opportunities within your allowed trading path. Buy when price drops below 20-period moving average by 3%+ with confirmed support. Set stop-loss at 5% below entry. Take profit when price returns to mean or crosses above. Monitor liquidity on Kuru Exchange (Monad Testnet). Respect risk limits and cooldown between trades.`,
  },
  {
    name: 'DCA',
    prompt: `Implement dollar-cost averaging strategy within your allowed trading path on Monad Testnet. Make periodic small buys (within your max trade size) when simple trend filter is positive (e.g., price above 50-period MA). Occasionally take profit at 10%+ gains. Avoid buying during obvious downtrends. Respect cooldown and risk parameters.`,
  },
  {
    name: 'Range',
    prompt: `Trade range-bound markets within your allowed trading path. Buy near identified local support levels, sell near local resistance. Use recent swing lows/highs to define range boundaries. Exit immediately if range breaks with volume. Avoid chasing price outside the range. Always check liquidity before trades. Respect your max trade size and cooldown settings.`,
  },
];

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const config = loadConfig();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategyPrompt, setStrategyPrompt] = useState('');
  const [handle, setHandle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const [operator, setOperator] = useState('');
  const [riskPreset, setRiskPreset] = useState<keyof typeof RISK_PRESETS>('balanced');
  const [customMaxMon, setCustomMaxMon] = useState('1');
  const [customCooldownSeconds, setCustomCooldownSeconds] = useState('300');
  const [customRiskError, setCustomRiskError] = useState<string | null>(null);
  const [pathTokenA, setPathTokenA] = useState('MON');
  const [pathTokenB, setPathTokenB] = useState('USDC');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [pathTokenAError, setPathTokenAError] = useState<string | null>(null);
  const [pathTokenBError, setPathTokenBError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [createdBotId, setCreatedBotId] = useState<bigint | null>(null);
  const [createdBotAccount, setCreatedBotAccount] = useState<`0x${string}` | null>(null);

  const handleImageUpload = async () => {
    if (!imageFile) return;
    
    try {
      setImageUploading(true);
      setImageError('');
      const result = await uploadImage(imageFile);
      
      // Robust handling of different response shapes
      const imageUri = result.image_uri || result.url || result.image_url;
      
      if (!imageUri) {
        throw new Error('No image URL in response');
      }
      
      setImageUrl(imageUri);
      setImageFile(null);
      setLocalPreviewUrl('');
    } catch (err) {
      console.error('Image upload error:', err);
      setImageError(err instanceof Error ? err.message : 'Image upload failed. Try pasting a URL instead.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Revoke old preview URL
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    setImageError('');

    // Check for HEIC/HEIF
    const fileName = file.name.toLowerCase();
    if (
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'
    ) {
      setImageError("HEIC isn't supported. Please convert to JPG/PNG or paste an image URL.");
      setImageFile(null);
      setLocalPreviewUrl('');
      return;
    }

    // Check file size (6MB limit)
    if (file.size > 6 * 1024 * 1024) {
      setImageError('Image too large for upload—try a smaller file or paste a URL.');
      setImageFile(null);
      setLocalPreviewUrl('');
      return;
    }

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewUrl);
    setImageFile(file);
    setImageUrl('');
  };

  const handleCreate = async () => {
    if (!config.botRegistry) {
      alert('BotRegistry address not configured');
      return;
    }

    // Auto-upload image if file is selected but not yet uploaded
    if (imageFile && !imageUrl) {
      try {
        setImageUploading(true);
        const result = await uploadImage(imageFile);
        const imageUri = result.image_uri || result.url || result.image_url;
        
        if (!imageUri) {
          alert('Image upload failed. Please try again or paste a URL instead.');
          setImageUploading(false);
          return;
        }
        
        setImageUrl(imageUri);
        setImageFile(null);
        setImageUploading(false);
      } catch (err) {
        console.error('Auto-upload error:', err);
        alert('Image upload failed. Please try again or paste a URL instead.');
        setImageUploading(false);
        return;
      }
    }

    // Resolve token inputs to addresses
    const resolvedTokenA = resolveTokenInput(pathTokenA);
    const resolvedTokenB = resolveTokenInput(pathTokenB);

    // Check for validation errors
    if ('error' in resolvedTokenA) {
      setPathTokenAError(resolvedTokenA.error);
      return;
    }
    if ('error' in resolvedTokenB) {
      setPathTokenBError(resolvedTokenB.error);
      return;
    }

    // Clear any previous errors
    setPathTokenAError(null);
    setPathTokenBError(null);

    const metadata = {
      name,
      description,
      strategyPrompt: strategyPrompt || undefined,
      image: imageUrl || undefined,
      handle: handle || undefined,
    };

    const metadataURI = encodeMetadataURI(metadata);
    const operatorAddress = (operator || address) as `0x${string}`;
    
    // Build risk params based on preset or custom
    let riskParams;
    if (riskPreset === 'custom') {
      try {
        const maxAmount = parseEther(customMaxMon);
        const cooldown = BigInt(customCooldownSeconds);
        if (cooldown < 0n) {
          setCustomRiskError('Cooldown must be a positive number');
          return;
        }
        riskParams = {
          maxAmountInPerTrade: maxAmount,
          minSecondsBetweenTrades: cooldown,
        };
        setCustomRiskError(null);
      } catch (err) {
        setCustomRiskError('Invalid risk parameters. Check your numbers.');
        return;
      }
    } else {
      riskParams = RISK_PRESETS[riskPreset];
    }
    
    const allowedPaths: `0x${string}`[][] = [];
    if (pathTokenA && pathTokenB) {
      allowedPaths.push([resolvedTokenA.address, resolvedTokenB.address]);
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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

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
          <p className="text-red-400">BotRegistry address not configured. Set NEXT_PUBLIC_BOT_REGISTRY or NEXT_PUBLIC_BOT_REGISTRY_ADDR.</p>
        </div>
      </div>
    );
  }

  if (isSuccess && createdBotId && createdBotAccount) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Agent Created! 🎉</h1>
          <p className="text-white/60">Your trading agent has been deployed onchain.</p>
        </div>

        {/* Agent Preview Card */}
        {(name || imageUrl) && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Agent Preview</h2>
            <div className="flex items-start gap-5">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={name || `Agent ${createdBotId}`}
                  className="w-24 h-24 object-cover rounded-lg border border-white/20 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-1">
                  {name || `Agent #${createdBotId.toString()}`}
                </h3>
                {handle && (
                  <p className="text-sm text-white/60 font-mono mb-2">{handle}</p>
                )}
                {description && (
                  <p className="text-sm text-white/70 leading-relaxed">{description}</p>
                )}
              </div>
            </div>
          </div>
        )}

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
            View Agent →
          </a>
          <button
            onClick={() => {
              setCreatedBotId(null);
              setCreatedBotAccount(null);
              setName('');
              setDescription('');
              setStrategyPrompt('');
              setImageUrl('');
              setImageFile(null);
              setHandle('');
              setOperator('');
              setRiskPreset('balanced');
              setCustomMaxMon('1');
              setCustomCooldownSeconds('300');
              setCustomRiskError(null);
              setPathTokenA('MON');
              setPathTokenB('USDC');
              setAdvancedExpanded(false);
              setPathTokenAError(null);
              setPathTokenBError(null);
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
        <h1 className="text-4xl font-bold mb-2">Create Trading Agent</h1>
        <p className="text-white/60">Deploy a new autonomous trading agent</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Trading Agent"
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
          <label className="block text-sm font-medium mb-2">Strategy Prompt</label>
          
          {/* Strategy Presets */}
          <div className="mb-3 flex gap-2 flex-wrap">
            {STRATEGY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', preset.prompt);
                }}
                onClick={() => setStrategyPrompt(preset.prompt)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-red-400/50 text-white text-xs rounded-lg transition-colors cursor-move"
                title="Click to apply or drag to textarea"
              >
                {preset.name}
              </button>
            ))}
          </div>
          
          <textarea
            value={strategyPrompt}
            onChange={(e) => setStrategyPrompt(e.target.value)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const text = e.dataTransfer.getData('text/plain');
              if (text) setStrategyPrompt(text);
            }}
            placeholder="Trade MON/USDC pairs based on momentum signals. Buy when 15-min volume spikes above 2x average..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
          />
          <p className="text-xs text-white/40 mt-1">This prompt will be read by your agent runner to guide trading decisions</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Agent Image (optional)</label>
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-red-500 file:text-white file:cursor-pointer hover:file:bg-red-600"
              />
              <button
                type="button"
                onClick={handleImageUpload}
                disabled={!imageFile || imageUploading || !!imageError}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg text-sm transition-colors"
              >
                {imageUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            
            {imageError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <p className="text-xs text-red-400">{imageError}</p>
              </div>
            )}
            
            <div className="text-xs text-white/40">Or paste image URL:</div>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImageFile(null);
                if (localPreviewUrl) {
                  URL.revokeObjectURL(localPreviewUrl);
                  setLocalPreviewUrl('');
                }
                setImageError('');
              }}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 text-sm"
            />
            {(localPreviewUrl || imageUrl) && (
              <div className="mt-2">
                <img 
                  src={localPreviewUrl || imageUrl} 
                  alt="Agent preview" 
                  className="w-24 h-24 object-cover rounded-lg border border-white/10" 
                  onError={(e) => {
                    if (!localPreviewUrl) {
                      // Only hide if it's a URL preview (not local)
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
          </div>
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
          <label className="block text-sm font-medium mb-2">Risk Management</label>
          <select
            value={riskPreset}
            onChange={(e) => setRiskPreset(e.target.value as keyof typeof RISK_PRESETS)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-400/50"
          >
            <option value="conservative">Conservative (0.5 MON max, 10min cooldown)</option>
            <option value="balanced">Balanced (1 MON max, 5min cooldown) - Recommended</option>
            <option value="aggressive">Aggressive (2 MON max, 2min cooldown)</option>
            <option value="custom">Custom (configure in Advanced)</option>
          </select>
          <p className="text-xs text-white/40 mt-1">Testnet-safe defaults. Faucet limits apply.</p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <label className="block text-sm font-medium cursor-pointer">
              Advanced Settings
            </label>
            <svg
              className={`w-5 h-5 text-white/60 transition-transform ${advancedExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {!advancedExpanded && (
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-white/60">
                Allowed Trading: <span className="text-white font-mono">{pathTokenA} ↔ {pathTokenB}</span>
              </p>
            </div>
          )}
          
          {advancedExpanded && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-6">
              {/* Operator Address */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Operator Address</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder={address || '0x...'}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
                />
                <p className="text-xs text-white/40 mt-1">
                  Defaults to your connected wallet. Only change if delegating execution to another address (e.g., separate runner wallet).
                </p>
              </div>

              {/* Custom Risk Parameters */}
              {riskPreset === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Custom Risk Parameters</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Max Amount Per Trade (MON)</label>
                      <input
                        type="text"
                        value={customMaxMon}
                        onChange={(e) => {
                          setCustomMaxMon(e.target.value);
                          setCustomRiskError(null);
                        }}
                        placeholder="1"
                        className={`w-full bg-white/5 border ${customRiskError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 text-sm`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Cooldown Between Trades (seconds)</label>
                      <input
                        type="text"
                        value={customCooldownSeconds}
                        onChange={(e) => {
                          setCustomCooldownSeconds(e.target.value);
                          setCustomRiskError(null);
                        }}
                        placeholder="300"
                        className={`w-full bg-white/5 border ${customRiskError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 text-sm`}
                      />
                      <p className="text-xs text-white/40 mt-1">300 seconds = 5 minutes</p>
                    </div>
                    {customRiskError && (
                      <p className="text-xs text-red-400">{customRiskError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Allowed Trading Path */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Allowed Trading Path</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={pathTokenA}
                      onChange={(e) => {
                        setPathTokenA(e.target.value);
                        setPathTokenAError(null);
                      }}
                      placeholder="MON"
                      className={`w-full bg-white/5 border ${pathTokenAError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm`}
                    />
                    {pathTokenAError && (
                      <p className="text-xs text-red-400 mt-1">{pathTokenAError}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={pathTokenB}
                      onChange={(e) => {
                        setPathTokenB(e.target.value);
                        setPathTokenBError(null);
                      }}
                      placeholder="USDC"
                      className={`w-full bg-white/5 border ${pathTokenBError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm`}
                    />
                    {pathTokenBError && (
                      <p className="text-xs text-red-400 mt-1">{pathTokenBError}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Use symbols (MON, USDC, USDT, etc.) or paste token addresses. Symbols will be resolved automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {writeError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">{writeError.message}</p>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name || isPending || isConfirming || imageUploading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {imageUploading ? 'Uploading image...' : isPending ? 'Waiting for signature...' : isConfirming ? 'Creating agent...' : 'Create Trading Agent'}
        </button>
      </div>
    </div>
  );
}
