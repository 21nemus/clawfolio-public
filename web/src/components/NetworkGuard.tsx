'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { loadConfig } from '@/lib/config';

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const config = loadConfig();

  if (!isConnected) {
    return null;
  }

  if (chainId === config.chainId) {
    return null;
  }

  return (
    <div className="bg-orange-500/10 border-b border-orange-500/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-500">Wrong Network</p>
              <p className="text-sm text-orange-400/90">
                You&apos;re connected to chain {chainId}. Please switch to Monad Testnet (chain {config.chainId}).
              </p>
            </div>
          </div>
          <button
            onClick={() => switchChain({ chainId: config.chainId })}
            disabled={isPending}
            className="flex-shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isPending ? 'Switching...' : 'Switch Network'}
          </button>
        </div>
      </div>
    </div>
  );
}
