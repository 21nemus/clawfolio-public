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
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <p className="text-green-400 mb-2">
          Bot {targetPaused ? 'paused' : 'resumed'} successfully!
        </p>
        <TxLink hash={hash} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Bot Status</p>
          <p className="text-sm text-white/60">
            Currently: <span className={currentlyPaused ? 'text-orange-400' : 'text-green-400'}>
              {currentlyPaused ? 'Paused' : 'Active'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleToggle(true)}
            disabled={currentlyPaused || isPending || isConfirming}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            {isPending || isConfirming ? 'Pausing...' : 'Pause'}
          </button>
          <button
            onClick={() => handleToggle(false)}
            disabled={!currentlyPaused || isPending || isConfirming}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            {isPending || isConfirming ? 'Resuming...' : 'Resume'}
          </button>
        </div>
      </div>
      {error && (
        <div className="text-sm text-red-400">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
