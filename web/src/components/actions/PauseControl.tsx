'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BotAccountABI } from '@/abi/BotAccount';
import { TxLink } from '../TxLink';

export function PauseControl({ 
  botAccount, 
  currentlyPaused 
}: { 
  botAccount: `0x${string}`; 
  currentlyPaused: boolean;
}) {
  const [targetPaused, setTargetPaused] = useState<boolean | null>(null);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleToggle = (paused: boolean) => {
    setTargetPaused(paused);
    writeContract({
      address: botAccount,
      abi: BotAccountABI,
      functionName: 'setPaused',
      args: [paused],
    });
  };

  if (isSuccess && hash) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
        <p className="text-green-400 text-xs mb-2">
          Bot {targetPaused ? 'paused' : 'resumed'}!
        </p>
        <TxLink hash={hash} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">
          Currently: <span className={currentlyPaused ? 'text-orange-400' : 'text-green-400'}>
            {currentlyPaused ? 'Paused' : 'Active'}
          </span>
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleToggle(true)}
          disabled={currentlyPaused || isPending || isConfirming}
          className="flex-1 px-3 py-2 bg-orange-500/90 hover:bg-orange-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
        >
          {isPending || isConfirming ? 'Pausing...' : 'Pause'}
        </button>
        <button
          onClick={() => handleToggle(false)}
          disabled={!currentlyPaused || isPending || isConfirming}
          className="flex-1 px-3 py-2 bg-green-500/90 hover:bg-green-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
        >
          {isPending || isConfirming ? 'Resuming...' : 'Resume'}
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-400/90">
          {error.message}
        </div>
      )}
    </div>
  );
}
