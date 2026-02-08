'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { BotAccountABI } from '@/abi/BotAccount';
import { ERC20ABI } from '@/abi/ERC20';
import { TxLink } from '../TxLink';

export function DepositControl({ 
  botAccount,
  userAddress
}: { 
  botAccount: `0x${string}`;
  userAddress: `0x${string}`;
}) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'deposit'>('input');

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

  const handleApprove = () => {
    if (!tokenAddress || !amount || !decimals) return;
    
    const amountBigInt = parseUnits(amount, decimals);
    
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [botAccount, amountBigInt],
    });
  };

  const handleDeposit = () => {
    if (!tokenAddress || !amount || !decimals) return;
    
    const amountBigInt = parseUnits(amount, decimals);
    
    writeContract({
      address: botAccount,
      abi: BotAccountABI,
      functionName: 'deposit',
      args: [tokenAddress as `0x${string}`, amountBigInt],
    });
  };

  if (isSuccess && hash) {
    if (step === 'approve') {
      return (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
            <p className="text-green-400 text-xs mb-2">Approved!</p>
            <TxLink hash={hash} />
          </div>
          <button
            onClick={() => {
              setStep('deposit');
              handleDeposit();
            }}
            className="w-full px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white font-medium rounded transition-colors text-sm"
          >
            Step 2: Deposit
          </button>
        </div>
      );
    }
    
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
        <p className="text-green-400 text-xs mb-2">Deposit successful!</p>
        <TxLink hash={hash} />
        <button
          onClick={() => {
            setStep('input');
            setTokenAddress('');
            setAmount('');
          }}
          className="mt-3 text-xs text-white/60 hover:text-white"
        >
          Deposit again →
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
          disabled={step !== 'input'}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-2">Amount</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          disabled={step !== 'input'}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 disabled:opacity-50"
        />
        {decimals !== undefined && (
          <p className="text-xs text-white/40 mt-1">Decimals: {decimals}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400/90">
          {error.message}
        </div>
      )}

      {step === 'input' && (
        <button
          onClick={() => {
            setStep('approve');
            handleApprove();
          }}
          disabled={!tokenAddress || !amount || !decimals || isPending}
          className="w-full px-3 py-2 bg-red-500/90 hover:bg-red-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
        >
          {isPending || isConfirming ? 'Approving...' : 'Approve'}
        </button>
      )}
    </div>
  );
}
