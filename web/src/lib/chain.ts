import { defineChain } from 'viem';
import { loadConfig } from './config';

const config = loadConfig();

/**
 * Monad Testnet chain configuration
 */
export const monadTestnet = defineChain({
  id: config.chainId,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [config.rpcHttpUrl],
    },
    public: {
      http: [config.rpcHttpUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: config.explorerAddressUrlPrefix.replace('/address/', ''),
    },
  },
  testnet: true,
});
