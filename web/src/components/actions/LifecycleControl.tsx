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
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <p className="text-green-400 mb-2">
          Lifecycle updated to {LIFECYCLE_STATES[targetState as keyof typeof LIFECYCLE_STATES]}!
        </p>
        <TxLink hash={hash} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">New Lifecycle State</label>
        <select
          value={targetState}
          onChange={(e) => setTargetState(Number(e.target.value))}
          disabled={isPending || isConfirming}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-400/50 disabled:opacity-50"
        >
          <option value={0}>Draft (no trading)</option>
          <option value={1}>Stealth (trading, not public)</option>
          <option value={2}>Public (trading + leaderboard)</option>
          <option value={3}>Graduated (trading, curve closed)</option>
          <option value={4}>Retired (archived, no trading)</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <button
        onClick={handleChange}
        disabled={targetState === currentState || isPending || isConfirming}
        className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isPending || isConfirming ? 'Updating...' : 'Update Lifecycle'}
      </button>
    </div>
  );
}
