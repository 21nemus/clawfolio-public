'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { decodeEventLog, parseEther, formatEther } from 'viem';
import { uploadImage, uploadImageFromUrl, uploadMetadata, mineSalt, getDeployFee, getInitialBuyAmountOut, getProgress, getTokenFlags, getCurveState, getBuyQuote, getSellQuote, getAvailableBuy, getQuoteWithRouter, getMarketCapMon } from '@/lib/nadfun/client';
import { BONDING_CURVE_ROUTER } from '@/lib/nadfun/constants';
import { bondingCurveRouterAbi, curveAbi, tradeRouterAbi } from '@/lib/nadfun/abi';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { ERC20ABI } from '@/abi/ERC20';
import { loadConfig } from '@/lib/config';
import { TxLink } from '@/components/TxLink';
import { AddressLink } from '@/components/AddressLink';
import { CopyButton } from '@/components/CopyButton';

const appConfig = loadConfig();

// Helper to format numbers with thousands separators and limited decimals
function formatUnitsDisplay(value: bigint, decimals: number, maxFrac: number): string {
  const formatted = formatEther(value);
  const [intPart, fracPart = ''] = formatted.split('.');
  
  // Add thousands separators to integer part
  const intWithSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Limit decimal places and trim trailing zeros
  if (!fracPart || maxFrac === 0) {
    return intWithSeparators;
  }
  
  const limitedFrac = fracPart.slice(0, maxFrac).replace(/0+$/, '');
  return limitedFrac ? `${intWithSeparators}.${limitedFrac}` : intWithSeparators;
}

// Helper to format progress from basis points to percentage
function formatPercentBps(progressBps: bigint): string {
  const percent = Number(progressBps) / 100;
  return percent.toFixed(2);
}

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
  onMarketCapChange,
}: { 
  botId: bigint; 
  botToken?: `0x${string}`; 
  isCreator: boolean;
  botMetadata?: Record<string, unknown> | null;
  onMarketCapChange?: (marketCapMon: bigint | null, loading: boolean) => void;
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

  // Token stats state
  const [tokenStats, setTokenStats] = useState<{
    progress?: bigint;
    isGraduated?: boolean;
    isLocked?: boolean;
    reserves?: {
      realMonReserve: bigint;
      realTokenReserve: bigint;
      virtualMonReserve: bigint;
      virtualTokenReserve: bigint;
      targetTokenAmount: bigint;
    };
    buyQuote?: bigint;
    sellQuote?: bigint;
    availableBuy?: { availableBuyToken: bigint; requiredMonAmount: bigint };
  }>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  // Trade widget state
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [deadlineMinutes, setDeadlineMinutes] = useState('5');
  const [tradeQuote, setTradeQuote] = useState<{ router: `0x${string}`; amountOut: bigint } | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [monBalance, setMonBalance] = useState<bigint | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [marketCapMon, setMarketCapMon] = useState<bigint | null>(null);
  const [marketCapLoading, setMarketCapLoading] = useState(false);

  // Load comprehensive token stats
  const loadTokenStats = async () => {
    if (!botToken || !publicClient) return;
    setStatsLoading(true);
    setStatsError('');
    setMarketCapLoading(true);
    onMarketCapChange?.(marketCapMon, true);
    try {
      const [progress, flags, curves] = await Promise.all([
        getProgress(publicClient, botToken).catch(() => null),
        getTokenFlags(publicClient, botToken).catch(() => ({ isGraduated: false, isLocked: false })),
        getCurveState(publicClient, botToken).catch(() => null),
      ]);

      // Get quotes
      const buyQuote = await getBuyQuote(publicClient, botToken, parseEther('0.1')).catch(() => null);
      const sellQuote = await getSellQuote(publicClient, botToken, parseEther('100')).catch(() => null);
      const availableBuy = await getAvailableBuy(publicClient, botToken).catch(() => null);

      setTokenStats({
        progress: progress || undefined,
        isGraduated: flags.isGraduated,
        isLocked: flags.isLocked,
        reserves: curves ? {
          realMonReserve: curves.realMonReserve,
          realTokenReserve: curves.realTokenReserve,
          virtualMonReserve: curves.virtualMonReserve,
          virtualTokenReserve: curves.virtualTokenReserve,
          targetTokenAmount: curves.targetTokenAmount,
        } : undefined,
        buyQuote: buyQuote || undefined,
        sellQuote: sellQuote || undefined,
        availableBuy: availableBuy || undefined,
      });

      // Load market cap
      try {
        const mcap = await getMarketCapMon(publicClient, botToken);
        setMarketCapMon(mcap.marketCapMon);
        onMarketCapChange?.(mcap.marketCapMon, false);
      } catch (err) {
        console.error('Failed to load market cap:', err);
        setMarketCapMon(null);
        onMarketCapChange?.(null, false);
      }
    } catch (err) {
      console.error('Failed to load token stats:', err);
      setStatsError('Failed to load token stats');
    } finally {
      setStatsLoading(false);
      setMarketCapLoading(false);
    }
  };

  useEffect(() => {
    if (!botToken) {
      onMarketCapChange?.(null, false);
    }
  }, [botToken, onMarketCapChange]);

  useEffect(() => {
    if (!botToken || !publicClient) return;
    loadTokenStats();
    // Intentionally keyed to token/client changes for initial status hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botToken, publicClient]);

  // Helper to set formatted error
  const setFormattedError = useCallback((err: unknown) => {
    const formatted = formatWalletError(err);
    setError(formatted.summary);
    setErrorDetails(formatted.details);
    setShowErrorDetails(false);
  }, []);

  // Load balances and token metadata for trading
  const loadBalances = useCallback(async () => {
    if (!botToken || !address || !publicClient) return;
    
    try {
      const [mon, token, symbol, decimals] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({
          address: botToken,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: botToken,
          abi: ERC20ABI,
          functionName: 'symbol',
        }) as Promise<string>,
        publicClient.readContract({
          address: botToken,
          abi: ERC20ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ]);
      setMonBalance(mon);
      setTokenBalance(token);
      setTokenSymbol(symbol);
      setTokenDecimals(decimals);
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  }, [botToken, address, publicClient]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Debounced quote fetching for trade
  useEffect(() => {
    if (!botToken || !publicClient || !tradeAmount) {
      setTradeQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const amount = parseEther(tradeAmount);
        if (amount <= 0n) {
          setTradeQuote(null);
          return;
        }

        const quote = await getQuoteWithRouter(publicClient, botToken, amount, tradeTab === 'buy');
        setTradeQuote(quote);
      } catch (err) {
        console.error('Failed to get quote:', err);
        setTradeQuote(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [botToken, publicClient, tradeAmount, tradeTab]);

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

  // Trade handlers
  const handleBuy = async () => {
    if (!botToken || !tradeQuote || !address || !tradeAmount) {
      setTradeError('Missing required data');
      return;
    }

    setTradeLoading(true);
    setTradeError('');
    setTradeSuccess('');

    try {
      const amountIn = parseEther(tradeAmount);
      const slippageNum = parseFloat(slippage) || 1;
      const minOut = (tradeQuote.amountOut * BigInt(Math.floor((100 - slippageNum) * 100))) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineMinutes) * 60);

      const hash = await writeContractAsync({
        address: tradeQuote.router,
        abi: tradeRouterAbi,
        functionName: 'buy',
        args: [{
          amountOutMin: minOut,
          token: botToken,
          to: address,
          deadline,
        }],
        value: amountIn,
      });

      // Wait for confirmation
      await publicClient?.waitForTransactionReceipt({ hash });
      
      // Refresh balances
      await loadBalances();
      
      setTradeSuccess(`Bought ~${formatUnitsDisplay(tradeQuote.amountOut, 18, 2)} tokens`);
      setTradeAmount('');
      setTradeQuote(null);
      
      // Clear success after 5s
      setTimeout(() => setTradeSuccess(''), 5000);
    } catch (err) {
      const formatted = formatWalletError(err);
      setTradeError(formatted.summary);
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    if (!botToken || !tradeQuote || !address || !tradeAmount || !publicClient) {
      setTradeError('Missing required data');
      return;
    }

    setTradeLoading(true);
    setTradeError('');
    setTradeSuccess('');

    try {
      const amountIn = parseEther(tradeAmount);
      const slippageNum = parseFloat(slippage) || 1;
      const minOut = (tradeQuote.amountOut * BigInt(Math.floor((100 - slippageNum) * 100))) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineMinutes) * 60);

      // Check allowance
      const allowance = await publicClient.readContract({
        address: botToken,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, tradeQuote.router],
      }) as bigint;

      // Approve if needed
      if (allowance < amountIn) {
        const approveHash = await writeContractAsync({
          address: botToken,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [tradeQuote.router, amountIn],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Execute sell
      const hash = await writeContractAsync({
        address: tradeQuote.router,
        abi: tradeRouterAbi,
        functionName: 'sell',
        args: [{
          amountIn,
          amountOutMin: minOut,
          token: botToken,
          to: address,
          deadline,
        }],
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh balances
      await loadBalances();

      setTradeSuccess(`Sold for ~${formatUnitsDisplay(tradeQuote.amountOut, 18, 4)} MON`);
      setTradeAmount('');
      setTradeQuote(null);
      
      // Clear success after 5s
      setTimeout(() => setTradeSuccess(''), 5000);
    } catch (err) {
      const formatted = formatWalletError(err);
      setTradeError(formatted.summary);
    } finally {
      setTradeLoading(false);
    }
  };

  const handleAddToWallet = async () => {
    if (!botToken || !tokenSymbol) return;
    
    try {
      const ethereum = (window as { ethereum?: { request: (args: { method: string; params: unknown }) => Promise<unknown> } }).ethereum;
      if (!ethereum) {
        alert('MetaMask not detected');
        return;
      }

      await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: botToken,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: botMetadata?.image as string | undefined,
          },
        },
      });
    } catch (err) {
      console.error('Failed to add token to wallet:', err);
      // Don't show error - user may have rejected
    }
  };

  // Build explorer URL
  const explorerTokenUrl = botToken && appConfig.explorerAddressUrlPrefix
    ? `${appConfig.explorerAddressUrlPrefix}${botToken}`
    : botToken
    ? `https://monadvision.com/address/${botToken}`
    : null;

  // Read-only status for non-creators or already tokenized
  if (!isCreator || botToken) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-5">
        <h3 className="text-base font-semibold mb-4 text-white">Token Status</h3>
        {botToken ? (
          <div className="space-y-4">
            {/* Token Address */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Token:</span>
              <AddressLink address={botToken} />
              <CopyButton text={botToken} label="token" />
            </div>

            {/* Your Balances */}
            {address && (
              <div className="bg-white/5 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/40 font-medium">Your Balances</p>
                  <button
                    onClick={loadBalances}
                    className="text-xs text-white/60 hover:text-red-400 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">MON:</span>
                  <span className="text-white font-mono">
                    {monBalance !== null ? formatUnitsDisplay(monBalance, 18, 4) : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">{tokenSymbol || 'Token'}:</span>
                  <span className="text-white font-mono">
                    {tokenBalance !== null ? formatUnitsDisplay(tokenBalance, 18, 4) : '...'}
                  </span>
                </div>
                {tokenSymbol && (
                  <button
                    onClick={handleAddToWallet}
                    className="w-full mt-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 text-white/70 px-3 py-2 rounded transition-colors"
                  >
                    Add {tokenSymbol} to Wallet
                  </button>
                )}
              </div>
            )}

            {/* Phase Badges */}
            {tokenStats.isGraduated !== undefined && (
              <div className="flex gap-2">
                {tokenStats.isGraduated ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                    Graduated (DEX)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                    Bonding Curve
                  </span>
                )}
                {tokenStats.isLocked && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
                    Locked
                  </span>
                )}
              </div>
            )}

            {/* Progress */}
            {tokenStats.progress !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-white/50">Graduation Progress:</span>
                  <span className="text-white font-medium">{formatPercentBps(tokenStats.progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, Number(tokenStats.progress) / 100))}%` }}
                  />
                </div>
                <div className="text-xs text-white/30 text-right">
                  {tokenStats.progress.toString()} / 10,000 bps
                </div>
              </div>
            )}

            {tokenStats.reserves && (
              <div className="bg-white/5 rounded p-3 space-y-1.5">
                <p className="text-xs text-white/40 font-medium mb-2">Reserves</p>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Real MON:</span>
                  <span className="text-white font-mono">{formatUnitsDisplay(tokenStats.reserves.realMonReserve, 18, 4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Real Token:</span>
                  <span className="text-white font-mono">{formatUnitsDisplay(tokenStats.reserves.realTokenReserve, 18, 4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Target:</span>
                  <span className="text-white font-mono">{formatUnitsDisplay(tokenStats.reserves.targetTokenAmount, 18, 4)}</span>
                </div>
              </div>
            )}

            {/* Quotes */}
            {(tokenStats.buyQuote || tokenStats.sellQuote) && (
              <div className="bg-white/5 rounded p-3 space-y-1.5">
                <p className="text-xs text-white/40 font-medium mb-2">Sample Quotes</p>
                {tokenStats.buyQuote && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">0.1 MON buys:</span>
                    <span className="text-green-400 font-mono">~{formatUnitsDisplay(tokenStats.buyQuote, 18, 4)} tokens</span>
                  </div>
                )}
                {tokenStats.sellQuote && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">100 tokens sell for:</span>
                    <span className="text-red-400 font-mono">~{formatUnitsDisplay(tokenStats.sellQuote, 18, 4)} MON</span>
                  </div>
                )}
              </div>
            )}

            {tokenStats.availableBuy && (
              <div className="bg-white/5 rounded p-3 space-y-1.5">
                <p className="text-xs text-white/40 font-medium mb-2">Available Buy</p>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Tokens:</span>
                  <span className="text-white font-mono">{formatUnitsDisplay(tokenStats.availableBuy.availableBuyToken, 18, 4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Required MON:</span>
                  <span className="text-white font-mono">{formatUnitsDisplay(tokenStats.availableBuy.requiredMonAmount, 18, 4)}</span>
                </div>
              </div>
            )}

            {/* Market Cap */}
            <div className="bg-white/5 rounded p-3">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Market Cap (MON):</span>
                <span className="text-white font-mono">
                  {marketCapLoading ? (
                    'Loading...'
                  ) : marketCapMon !== null ? (
                    formatUnitsDisplay(marketCapMon, 18, 4)
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>

            {statsError && (
              <p className="text-xs text-red-400">{statsError}</p>
            )}

            {/* Trade Widget */}
            {address && !tokenStats.isLocked && (
              <div className="bg-white/5 rounded p-4 space-y-3 border border-white/10">
                <h4 className="text-sm font-medium text-white">Trade Token</h4>
                
                {/* Success Message */}
                {tradeSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                    <p className="text-xs text-green-400">{tradeSuccess}</p>
                  </div>
                )}
                
                {/* Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTradeTab('buy')}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      tradeTab === 'buy'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeTab('sell')}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      tradeTab === 'sell'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Sell
                  </button>
                </div>

                {/* Balance Display */}
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Balance:</span>
                  <span className="text-white font-mono">
                    {tradeTab === 'buy' 
                      ? monBalance !== null ? `${formatUnitsDisplay(monBalance, 18, 4)} MON` : '...'
                      : tokenBalance !== null ? `${formatUnitsDisplay(tokenBalance, 18, 4)} tokens` : '...'}
                  </span>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-xs text-white/60 mb-1 block">
                    Amount ({tradeTab === 'buy' ? 'MON' : 'Tokens'})
                  </label>
                  <input
                    type="text"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50"
                  />
                </div>

                {/* Slippage & Deadline */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Slippage %</label>
                    <input
                      type="text"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-red-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Deadline (min)</label>
                    <input
                      type="text"
                      value={deadlineMinutes}
                      onChange={(e) => setDeadlineMinutes(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-red-400/50"
                    />
                  </div>
                </div>

                {/* Quote Display */}
                {tradeQuote && tradeAmount && (
                  <div className="bg-black/20 rounded p-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">Router:</span>
                      <span className="text-white/70 font-mono">
                        {tradeQuote.router.slice(0, 6)}...{tradeQuote.router.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Expected:</span>
                      <span className="text-white font-mono">
                        ~{formatUnitsDisplay(tradeQuote.amountOut, 18, 4)} {tradeTab === 'buy' ? 'tokens' : 'MON'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Min received:</span>
                      <span className="text-white font-mono">
                        {formatUnitsDisplay(
                          (tradeQuote.amountOut * BigInt(Math.floor((100 - parseFloat(slippage || '1')) * 100))) / 10000n,
                          18,
                          4
                        )} {tradeTab === 'buy' ? 'tokens' : 'MON'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Trade Error */}
                {tradeError && (
                  <p className="text-xs text-red-400">{tradeError}</p>
                )}

                {/* Trade Button */}
                <button
                  onClick={tradeTab === 'buy' ? handleBuy : handleSell}
                  disabled={tradeLoading || !tradeAmount || !tradeQuote}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    tradeTab === 'buy'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {tradeLoading ? 'Processing...' : tradeTab === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
                </button>
              </div>
            )}

            {tokenStats.isLocked && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                <p className="text-xs text-yellow-400">Trading is locked. Token is awaiting graduation to DEX.</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={loadTokenStats}
                disabled={statsLoading}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 text-white text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {statsLoading ? 'Loading Stats...' : 'Refresh Stats'}
              </button>

              {explorerTokenUrl && (
                <a
                  href={explorerTokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 text-white/70 text-xs px-3 py-2 rounded transition-colors"
                >
                  View Token on Explorer
                  <span className="text-white/40">↗</span>
                </a>
              )}
            </div>
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
