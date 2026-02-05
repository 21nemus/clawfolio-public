export const BotRegistryABI = [
  {
    type: 'function',
    name: 'createBot',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_metadataURI', type: 'string' },
      { name: '_operator', type: 'address' },
      {
        name: '_riskParams',
        type: 'tuple',
        components: [
          { name: 'maxAmountInPerTrade', type: 'uint256' },
          { name: 'minSecondsBetweenTrades', type: 'uint256' },
        ],
      },
      { name: '_allowedPaths', type: 'address[][]' },
      { name: '_initialState', type: 'uint8' },
    ],
    outputs: [
      { name: 'botId', type: 'uint256' },
      { name: 'botAccount', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'botCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'botAccountOf',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'metadataURI',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'isRouterAllowlisted',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'BotCreated',
    inputs: [
      { name: 'botId', type: 'uint256', indexed: true },
      { name: 'botAccount', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'operator', type: 'address', indexed: false },
      { name: 'metadataURI', type: 'string', indexed: false },
    ],
  },
] as const;
