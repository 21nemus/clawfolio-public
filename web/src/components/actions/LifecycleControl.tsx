'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BotAccountABI } from '@/abi/BotAccount';
import { LIFECYCLE_STATES } from '@/hooks/useBotDetails';
import { TxLink } from '../TxLink';

export function LifecycleControl({ 
  botAccount, 
  currentState 
}: { 
  botAccount: `0x${string}`; 
  currentState: number;
}) {
  const [targetState, setTargetState] = useState<number>(currentState);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleChange = () => {
    writeContract({
      address: botAccount,
      abi: BotAccountABI,
      functionName: 'setLifecycleState',
      args: [targetState],
    });
  };

  if (isSuccess && hash) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
        <p className="text-green-400 text-xs mb-2">
          Updated to {LIFECYCLE_STATES[targetState as keyof typeof LIFECYCLE_STATES]}!
        </p>
        <TxLink hash={hash} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-2">New State</label>
        <select
          value={targetState}
          onChange={(e) => setTargetState(Number(e.target.value))}
          disabled={isPending || isConfirming}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50"
        >
          <option value={0}>Draft (no trading)</option>
          <option value={1}>Stealth (trading, not public)</option>
          <option value={2}>Public (trading + leaderboard)</option>
          <option value={3}>Graduated (curve closed)</option>
          <option value={4}>Retired (archived)</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400/90">
          {error.message}
        </div>
      )}

      <button
        onClick={handleChange}
        disabled={targetState === currentState || isPending || isConfirming}
        className="w-full px-3 py-2 bg-red-500/90 hover:bg-red-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
      >
        {isPending || isConfirming ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
}
