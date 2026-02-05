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
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <p className="text-green-400 mb-2">Withdrawal successful!</p>
        <TxLink hash={hash} />
        <button
          onClick={() => {
            setTokenAddress('');
            setAmount('');
            setToAddress(creatorAddress);
          }}
          className="mt-4 text-sm text-white/60 hover:text-white"
        >
          Make another withdrawal →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Withdraw ERC20 tokens from the bot. Only the creator can withdraw.
      </p>
      
      <div>
        <label className="block text-sm font-medium mb-2">Token Address</label>
        <input
          type="text"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Amount</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50"
        />
        {decimals !== undefined && (
          <p className="text-xs text-white/40 mt-1">Decimals: {decimals}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">To Address</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400/50 font-mono text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={!tokenAddress || !amount || !toAddress || !decimals || isPending || isConfirming}
        className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isPending || isConfirming ? 'Withdrawing...' : 'Withdraw'}
      </button>
    </div>
  );
}
