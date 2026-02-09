'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { decodeEventLog, parseEther, formatEther } from 'viem';
import { uploadImage, uploadImageFromUrl, uploadMetadata, mineSalt, getDeployFee, getInitialBuyAmountOut, getProgress } from '@/lib/nadfun/client';
import { BONDING_CURVE_ROUTER } from '@/lib/nadfun/constants';
import { bondingCurveRouterAbi, curveAbi } from '@/lib/nadfun/abi';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { TxLink } from '@/components/TxLink';
import { AddressLink } from '@/components/AddressLink';
import { CopyButton } from '@/components/CopyButton';

const appConfig = loadConfig();

// Helper to format wallet errors into friendly messages
function formatWalletError(err: unknown): { summary: string; details?: string } {
  if (!(err instanceof Error)) {
    return { summary: 'Unknown error occurred', details: String(err) };
  }

  const message = err.message;

  // User cancelled
  if (message.includes('User denied transaction signature') || message.includes('User rejected')) {
    return { summary: 'Transaction cancelled in wallet.', details: message };
  }

  // Insufficient funds
  if (message.toLowerCase().includes('insufficient funds')) {
    return { summary: 'Insufficient funds. Reduce initial buy amount.', details: message };
  }

  // Try to extract nested JSON error
  if (message.includes('{"error":')) {
    try {
      const jsonMatch = message.match(/\{[^}]*"error"[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          // Recursively handle nested error strings
          if (typeof parsed.error === 'string' && parsed.error.includes('{"error":')) {
            return formatWalletError(new Error(parsed.error));
          }
          return { summary: parsed.error, details: message };
        }
      }
    } catch {
      // Failed to parse nested JSON
    }
  }

  return { summary: message.split('\n')[0] || 'Transaction failed', details: message };
}

interface TokenizeState {
  imageUri?: string;
  metadataUri?: string;
  salt?: `0x${string}`;
  predictedAddress?: string;
  deployFee?: bigint;
  createTxHash?: `0x${string}`;
  token?: `0x${string}`;
  pool?: `0x${string}`;
  linkTxHash?: `0x${string}`;
  progress?: { value: bigint };
}

interface FormData {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  initialBuyAmount: string;
}

export function TokenizePanel({ 
  botId, 
  botToken, 
  isCreator,
  botMetadata,
}: { 
  botId: bigint; 
  botToken?: `0x${string}`; 
  isCreator: boolean;
  botMetadata?: Record<string, unknown> | null;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState(1);
  const [state, setState] = useState<TokenizeState>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    initialBuyAmount: '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Step 4 specific state
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState<bigint | null>(null);
  const [step4ValidationError, setStep4ValidationError] = useState('');

  const agentAvatarUrl = botMetadata?.image ? (botMetadata.image as string) : null;

  // Prefill form data from bot metadata
  useEffect(() => {
    if (botMetadata && formData.name === '') {
      const name = botMetadata.name as string || '';
      const description = botMetadata.description as string || '';
      const symbol = name 
        ? name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) 
        : '';
      
      setFormData((prev) => ({
        ...prev,
        name,
        description,
        symbol,
      }));
    }
  }, [botMetadata]);

  // Load token progress if already tokenized
  const [progressLoading, setProgressLoading] = useState(false);
  const loadTokenProgress = async () => {
    if (!botToken || !publicClient) return;
    setProgressLoading(true);
    try {
      const progress = await getProgress(publicClient, botToken);
      setState((s) => ({ ...s, progress: { value: progress } }));
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  // Helper to set formatted error
  const setFormattedError = useCallback((err: unknown) => {
    const formatted = formatWalletError(err);
    setError(formatted.summary);
    setErrorDetails(formatted.details);
    setShowErrorDetails(false);
  }, []);

  const handleUseAgentAvatar = async () => {
    if (!agentAvatarUrl) return;
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const result = await uploadImageFromUrl(agentAvatarUrl);
      const imageUri = result.image_uri || result.url || result.image_url;
      
      if (!imageUri) {
        throw new Error('No image URL in response');
      }
      
      setState((s) => ({ ...s, imageUri }));
      setStep(2);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseImageUrl = async () => {
    if (!imageUrlInput || !imageUrlInput.startsWith('http')) {
      setError('Please enter a valid image URL (https://...)');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const result = await uploadImageFromUrl(imageUrlInput);
      const imageUri = result.image_uri || result.url || result.image_url;
      
      if (!imageUri) {
        throw new Error('No image URL in response');
      }
      
      setState((s) => ({ ...s, imageUri }));
      setStep(2);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) {
      setError('Please select an image');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const result = await uploadImage(imageFile);
      // Robust to different response shapes (image_uri vs url vs image_url)
      const imageUri = result.image_uri || result.url || result.image_url;
      if (!imageUri) {
        throw new Error('No image URL in response');
      }
      setState((s) => ({ ...s, imageUri }));
      setStep(2);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataUpload = async () => {
    if (!formData.name || !formData.symbol || !formData.description || !state.imageUri) {
      setError('Missing required fields');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const { metadata_uri } = await uploadMetadata({
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image_uri: state.imageUri,
        website: formData.website || undefined,
        twitter: formData.twitter || undefined,
        telegram: formData.telegram || undefined,
      });
      setState((s) => ({ ...s, metadataUri: metadata_uri }));
      setStep(3);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMineSalt = async () => {
    if (!address || !formData.name || !formData.symbol || !state.metadataUri) {
      setError('Missing required data');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const { salt, predictedAddress } = await mineSalt({
        creator: address,
        name: formData.name,
        symbol: formData.symbol,
        metadata_uri: state.metadataUri,
      });
      setState((s) => ({ ...s, salt: salt as `0x${string}`, predictedAddress }));
      setStep(4);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch wallet balance and deploy fee when entering step 4
  useEffect(() => {
    if (step === 4 && address && publicClient) {
      const fetchStep4Data = async () => {
        try {
          const [balance, deployFee] = await Promise.all([
            publicClient.getBalance({ address }),
            getDeployFee(publicClient),
          ]);
          setWalletBalance(balance);
          setState((s) => ({ ...s, deployFee }));
        } catch (err) {
          console.error('Failed to fetch step 4 data:', err);
        }
      };
      fetchStep4Data();
    }
  }, [step, address, publicClient]);

  // Debounced effect to estimate tokens when initialBuyAmount changes
  useEffect(() => {
    if (step !== 4 || !publicClient) return;

    const timer = setTimeout(async () => {
      try {
        const amount = formData.initialBuyAmount.trim();
        if (!amount || amount === '0') {
          setEstimatedTokens(null);
          return;
        }

        const initialBuy = parseEther(amount);
        if (initialBuy > 0n) {
          const tokens = await getInitialBuyAmountOut(publicClient, initialBuy);
          setEstimatedTokens(tokens);
        } else {
          setEstimatedTokens(null);
        }
      } catch {
        setEstimatedTokens(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [step, formData.initialBuyAmount, publicClient]);

  // Validate step 4 inputs
  useEffect(() => {
    if (step !== 4) {
      setStep4ValidationError('');
      return;
    }

    try {
      const amount = formData.initialBuyAmount.trim();
      if (!amount) {
        setStep4ValidationError('');
        return;
      }

      const initialBuy = parseEther(amount);
      const deployFee = state.deployFee || 0n;
      const totalRequired = deployFee + initialBuy;

      if (walletBalance !== null && totalRequired > walletBalance) {
        setStep4ValidationError('Insufficient MON. Reduce initial buy amount.');
        return;
      }

      setStep4ValidationError('');
    } catch {
      setStep4ValidationError('Invalid number format');
    }
  }, [step, formData.initialBuyAmount, walletBalance, state.deployFee]);

  const handleOnchainCreate = async () => {
    if (!publicClient || !state.salt || !state.metadataUri) {
      setError('Missing required data');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const deployFee = state.deployFee || await getDeployFee(publicClient);
      setState((s) => ({ ...s, deployFee }));

      const initialBuy = parseEther(formData.initialBuyAmount || '0');
      let minTokens = 0n;
      if (initialBuy > 0n) {
        minTokens = await getInitialBuyAmountOut(publicClient, initialBuy);
      }

      const hash = await writeContractAsync({
        address: BONDING_CURVE_ROUTER,
        abi: bondingCurveRouterAbi,
        functionName: 'create',
        args: [
          {
            name: formData.name,
            symbol: formData.symbol,
            tokenURI: state.metadataUri,
            amountOut: minTokens,
            salt: state.salt,
            actionId: 1,
          },
        ],
        value: deployFee + initialBuy,
      });

      setState((s) => ({ ...s, createTxHash: hash }));

      // Wait for receipt and parse logs
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Decode CurveCreate event from logs
      let token: `0x${string}` | undefined;
      let pool: `0x${string}` | undefined;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: curveAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'CurveCreate') {
            token = decoded.args.token as `0x${string}`;
            pool = decoded.args.pool as `0x${string}`;
            break;
          }
        } catch {
          // Not a CurveCreate event, continue
        }
      }

      if (token && pool) {
        setState((s) => ({ ...s, token, pool }));
        setStep(5);
      } else {
        setError('CurveCreate event not found in receipt');
      }
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkToken = async () => {
    if (!state.token || !state.pool || !appConfig.botRegistry) {
      setError('Missing token/pool or BotRegistry not configured');
      return;
    }
    setLoading(true);
    setError('');
    setErrorDetails(undefined);
    try {
      const hash = await writeContractAsync({
        address: appConfig.botRegistry,
        abi: BOT_REGISTRY_ABI,
        functionName: 'setBotToken',
        args: [botId, state.token, state.pool],
      });
      setState((s) => ({ ...s, linkTxHash: hash }));
      setError('');
      // Refresh after a moment
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      setFormattedError(err);
    } finally {
      setLoading(false);
    }
  };

  // Read-only status for non-creators or already tokenized
  if (!isCreator || botToken) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-5">
        <h3 className="text-base font-semibold mb-4 text-white">Token Status</h3>
        {botToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Token:</span>
              <AddressLink address={botToken} />
              <CopyButton text={botToken} label="token" />
            </div>
            <button
              onClick={loadTokenProgress}
              disabled={progressLoading}
              className="text-xs text-white/60 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              {progressLoading ? 'Loading...' : 'Load Progress'}
            </button>
            {state.progress && (
              <div className="text-xs text-white/50">
                <p>Progress: {state.progress.value.toString()}</p>
              </div>
            )}
            <a
              href={`https://nad.fun/token/${botToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-white/60 hover:text-red-400 transition-colors mt-2"
            >
              View on Nad.fun →
            </a>
          </div>
        ) : (
          <p className="text-white/50 text-sm">
            {isCreator ? 'Not launched yet' : 'Connect as creator to tokenize'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-5">
      <h3 className="text-base font-semibold mb-4 text-white">Tokenize on Nad.fun</h3>

      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-xs">
          <div className="break-words whitespace-pre-wrap max-h-40 overflow-auto">
            {error}
          </div>
          {errorDetails && errorDetails !== error && (
            <div className="mt-2 pt-2 border-t border-red-500/20">
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-red-300 hover:text-red-200 underline text-xs"
              >
                {showErrorDetails ? 'Hide details' : 'Show details'}
              </button>
              {showErrorDetails && (
                <div className="mt-2 space-y-2">
                  <div className="bg-black/20 rounded p-2 text-[10px] font-mono break-words whitespace-pre-wrap max-h-32 overflow-auto">
                    {errorDetails}
                  </div>
                  <CopyButton text={errorDetails} label="error details" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded ${
              s <= step ? 'bg-red-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-white/80 text-sm">Step 1: Upload Image</p>
          
          {agentAvatarUrl && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <img 
                  src={agentAvatarUrl} 
                  alt="Agent avatar" 
                  className="w-12 h-12 rounded object-cover border border-white/10"
                />
                <div className="flex-1">
                  <p className="text-sm text-white/80 mb-2">Use agent avatar as token image?</p>
                  <button
                    onClick={handleUseAgentAvatar}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                  >
                    Use Agent Avatar →
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-white/40 text-xs">
            {agentAvatarUrl ? 'or upload a different image:' : 'Upload token image:'}
          </div>

          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-red-500 file:text-white file:cursor-pointer hover:file:bg-red-600 file:font-medium transition-colors"
            />
            <p className="text-xs text-white/40">
              We upload the image to Nad.fun first (required for NSFW scan).
            </p>
            <button
              onClick={handleImageUpload}
              disabled={loading || !imageFile}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>

          <div className="text-center text-white/40 text-xs">
            or paste an image URL:
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://..."
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 text-sm"
            />
            <button
              onClick={handleUseImageUrl}
              disabled={loading || !imageUrlInput}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
            >
              Use URL →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-white/80 text-sm">Step 2: Enter Metadata</p>
          <input
            type="text"
            placeholder="Token Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
          />
          <input
            type="text"
            placeholder="Symbol (e.g. CLAW)"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
            rows={3}
          />
          <input
            type="text"
            placeholder="Website (optional)"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
          />
          <input
            type="text"
            placeholder="Twitter (optional)"
            value={formData.twitter}
            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
          />
          <input
            type="text"
            placeholder="Telegram (optional)"
            value={formData.telegram}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
          />
          <button
            onClick={handleMetadataUpload}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded"
          >
            {loading ? 'Uploading...' : 'Upload Metadata'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-white/80 text-sm">Step 3: Mine Salt</p>
          <p className="text-white/60 text-xs">This may take a few seconds...</p>
          <button
            onClick={handleMineSalt}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded"
          >
            {loading ? 'Mining...' : 'Mine Salt'}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-white/80 text-sm font-semibold">Step 4: Create Onchain</p>
          {state.predictedAddress && (
            <p className="text-white/60 text-xs">Predicted: {state.predictedAddress}</p>
          )}

          {/* Info box */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
            {walletBalance !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Wallet Balance:</span>
                <span className="text-white font-mono">{formatEther(walletBalance)} MON</span>
              </div>
            )}
            {state.deployFee !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Deploy Fee:</span>
                <span className="text-white font-mono">{formatEther(state.deployFee)} MON</span>
              </div>
            )}
            {formData.initialBuyAmount && formData.initialBuyAmount !== '0' && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Initial Buy:</span>
                  <span className="text-white font-mono">{formData.initialBuyAmount} MON</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-white/10 pt-2">
                  <span className="text-white/80">Total Required:</span>
                  <span className="text-white font-mono">
                    {formatEther((state.deployFee || 0n) + parseEther(formData.initialBuyAmount || '0'))} MON
                  </span>
                </div>
                {estimatedTokens !== null && (
                  <div className="flex justify-between text-xs text-green-400">
                    <span>Est. Tokens:</span>
                    <span className="font-mono">~{formatEther(estimatedTokens)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-white/80 text-sm font-medium">
              Initial buy (MON to spend)
            </label>
            <p className="text-white/50 text-xs">
              This is NOT max supply. You are buying tokens from the bonding curve.
            </p>
            
            {/* Preset buttons */}
            <div className="flex gap-2">
              {[0, 0.05, 0.1, 0.5, 1.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setFormData({ ...formData, initialBuyAmount: preset.toString() })}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 rounded px-2 py-1 text-white text-xs transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="e.g. 0.1"
              value={formData.initialBuyAmount}
              onChange={(e) => setFormData({ ...formData, initialBuyAmount: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
            />

            {step4ValidationError && (
              <p className="text-red-400 text-xs">{step4ValidationError}</p>
            )}
          </div>

          <button
            onClick={handleOnchainCreate}
            disabled={loading || !!step4ValidationError}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create Token'}
          </button>

          {state.createTxHash && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">Tx:</span>
              <TxLink hash={state.createTxHash} />
              <CopyButton text={state.createTxHash} label="tx hash" />
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <p className="text-white/80 text-sm">Step 5: Link Token to Bot</p>
          {state.token && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/60">Token:</span>
              <AddressLink address={state.token} />
              <CopyButton text={state.token} label="token address" />
            </div>
          )}
          {state.pool && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/60">Pool:</span>
              <AddressLink address={state.pool} />
              <CopyButton text={state.pool} label="pool address" />
            </div>
          )}
          <button
            onClick={handleLinkToken}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded"
          >
            {loading ? 'Linking...' : 'Link Token to Bot'}
          </button>
          {state.linkTxHash && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span>✅ Linked! Tx:</span>
              <TxLink hash={state.linkTxHash} />
              <CopyButton text={state.linkTxHash} label="tx hash" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
