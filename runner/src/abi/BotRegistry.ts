export const BotRegistryABI = [
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
    name: 'botTokenOf',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
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
