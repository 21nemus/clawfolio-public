'use client';

import { DepositControl } from './DepositControl';
import { WithdrawControl } from './WithdrawControl';
import { PauseControl } from './PauseControl';
import { LifecycleControl } from './LifecycleControl';

interface QuickActionsPanelProps {
  botId: bigint;
  botAccount: `0x${string}`;
  creator: `0x${string}`;
  operator: `0x${string}`;
  lifecycleState: number;
  paused: boolean;
  isCreator: boolean;
  isOperator: boolean;
  userAddress?: `0x${string}`;
}

export function QuickActionsPanel({
  botId,
  botAccount,
  creator,
  operator,
  lifecycleState,
  paused,
  isCreator,
  isOperator,
  userAddress,
}: QuickActionsPanelProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-2 border-b border-white/10">
        <span className="text-lg">⚡</span>
        <h3 className="text-lg font-bold">Quick Actions</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Deposit Section */}
        {(isCreator || isOperator) && userAddress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">💰 Deposit Funds</span>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Step 1: Approve token (if ERC20) | Step 2: Deposit to bot account
            </p>
            <DepositControl 
              botAccount={botAccount} 
              userAddress={userAddress}
            />
          </div>
        )}

        {/* Withdraw Section */}
        {(isCreator || isOperator) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">💸 Withdraw Funds</span>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Withdraw native MON or ERC20 tokens from bot account
            </p>
            <WithdrawControl 
              botAccount={botAccount} 
              creatorAddress={creator}
            />
          </div>
        )}

        {/* Pause Control */}
        {(isCreator || isOperator) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">
                {paused ? '▶️ Resume Bot' : '⏸️ Pause Bot'}
              </span>
            </div>
            <p className="text-xs text-white/50 mb-3">
              {paused 
                ? 'Resume bot operations and allow trading' 
                : 'Temporarily pause all bot operations'}
            </p>
            <PauseControl 
              botAccount={botAccount}
              currentlyPaused={paused}
            />
          </div>
        )}

        {/* Lifecycle Control */}
        {isCreator && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">🔄 Change Lifecycle</span>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Update bot visibility: Draft → Stealth → Public → Graduated → Retired
            </p>
            <LifecycleControl 
              botAccount={botAccount}
              currentState={lifecycleState}
            />
          </div>
        )}
      </div>
    </div>
  );
}
