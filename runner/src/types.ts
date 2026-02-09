export type BotEvent =
  | {
      type: 'TradeExecuted';
      botId: bigint;
      nonce: bigint;
      operator: `0x${string}`;
      router: `0x${string}`;
      path: `0x${string}`[];
      amountIn: bigint;
      amountOut: bigint;
      timestamp: bigint;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }
  | {
      type: 'Deposited';
      botId: bigint;
      token: `0x${string}`;
      amount: bigint;
      depositor: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }
  | {
      type: 'Withdrawn';
      botId: bigint;
      token: `0x${string}`;
      amount: bigint;
      to: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }
  | {
      type: 'LifecycleChanged';
      botId: bigint;
      fromState: number;
      toState: number;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }
  | {
      type: 'PausedUpdated';
      botId: bigint;
      paused: boolean;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }
  | {
      type: 'OperatorUpdated';
      botId: bigint;
      oldOperator: `0x${string}`;
      newOperator: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    };

export interface BotMetrics {
  botId: number;
  botAccount: string;
  updatedAt: string;
  paused: boolean;
  lifecycleState: number;
  operator: string;
  creator: string;
  tradeCount: number;
  lastActivity: {
    blockNumber: number;
    tx: string;
    type: string;
  } | null;
  balances: Array<{
    token: string;
    symbol: string;
    decimals: number;
    raw: string;
    formatted: string;
  }>;
  flows: Array<{
    token: string;
    symbol: string;
    decimals: number;
    netRaw: string;
    netFormatted: string;
  }>;
  pnl: {
    mode: 'none' | 'estimated';
    baseSymbol: string;
    currentValueBase: { raw: string; formatted: string } | null;
    netDepositsBase: { raw: string; formatted: string } | null;
    pnlBase: { raw: string; formatted: string } | null;
    note: string;
  };
}
