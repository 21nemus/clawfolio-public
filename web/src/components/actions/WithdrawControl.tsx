'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { BotAccountABI } from '@/abi/BotAccount';
import { ERC20ABI } from '@/abi/ERC20';
import { TxLink } from '../TxLink';

export function WithdrawControl({ 
  botAccount,
  creatorAddress
}: { 
  botAccount: `0x${string}`;
  creatorAddress: `0x${string}`;
}) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState<string>(creatorAddress);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read token decimals if address is valid
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: {
      enabled: /^0x[0-9a-fA-F]{40}$/.test(tokenAddress),
    },
  });

  const handleWithdraw = () => {
    if (!tokenAddress || !amount || !toAddress || !decimals) return;
    
    const amountBigInt = parseUnits(amount, decimals);
    
    writeContract({
      address: botAccount,
      abi: BotAccountABI,
      functionName: 'withdraw',
      args: [tokenAddress as `0x${string}`, amountBigInt, toAddress as `0x${string}`],
    });
  };

  if (isSuccess && hash) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
        <p className="text-green-400 text-xs mb-2">Withdrawal successful!</p>
        <TxLink hash={hash} />
        <button
          onClick={() => {
            setTokenAddress('');
            setAmount('');
            setToAddress(creatorAddress);
          }}
          className="mt-3 text-xs text-white/60 hover:text-white"
        >
          Withdraw again →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-2">Token Address</label>
        <input
          type="text"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-2">Amount</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
        />
        {decimals !== undefined && (
          <p className="text-xs text-white/40 mt-1">Decimals: {decimals}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-2">To Address</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400/90">
          {error.message}
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={!tokenAddress || !amount || !toAddress || !decimals || isPending || isConfirming}
        className="w-full px-3 py-2 bg-red-500/90 hover:bg-red-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
      >
        {isPending || isConfirming ? 'Withdrawing...' : 'Withdraw'}
      </button>
    </div>
  );
}
