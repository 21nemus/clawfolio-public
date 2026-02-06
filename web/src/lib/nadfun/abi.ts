/**
 * Nad.fun Minimal ABIs
 * Source: https://nad.fun/abi.md
 */

export const bondingCurveRouterAbi = [
  {
    type: 'function',
    name: 'create',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IBondingCurveRouter.TokenCreationParams',
        components: [
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'symbol', type: 'string', internalType: 'string' },
          { name: 'tokenURI', type: 'string', internalType: 'string' },
          { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
          { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
          { name: 'actionId', type: 'uint8', internalType: 'uint8' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'pool', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'payable',
  },
] as const;

export const curveAbi = [
  {
    type: 'event',
    name: 'CurveCreate',
    inputs: [
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'pool', type: 'address', indexed: true, internalType: 'address' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      { name: 'symbol', type: 'string', indexed: false, internalType: 'string' },
      { name: 'tokenURI', type: 'string', indexed: false, internalType: 'string' },
      { name: 'virtualMon', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'virtualToken', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'feeConfig',
    inputs: [],
    outputs: [
      { name: 'deployFeeAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'graduateFeeAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'protocolFee', type: 'uint24', internalType: 'uint24' },
    ],
    stateMutability: 'view',
  },
] as const;

export const lensAbi = [
  {
    type: 'function',
    name: 'getProgress',
    inputs: [{ name: '_token', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'progress', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getInitialBuyAmountOut',
    inputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
