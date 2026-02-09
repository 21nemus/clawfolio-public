export const BotAccountABI = [
  {
    type: 'function',
    name: 'creator',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'operator',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'lifecycleState',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'nonce',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'riskParams',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'maxAmountInPerTrade', type: 'uint256' },
          { name: 'minSecondsBetweenTrades', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'lastTradeTimestamp',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'TradeExecuted',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'nonce', type: 'uint256', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'router', type: 'address', indexed: false },
      { name: 'path', type: 'address[]', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'depositor', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'to', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'LifecycleChanged',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'fromState', type: 'uint8', indexed: false },
      { name: 'toState', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PausedUpdated',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'paused', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OperatorUpdated',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'oldOperator', type: 'address', indexed: true },
      { name: 'newOperator', type: 'address', indexed: true },
    ],
  },
] as const;
