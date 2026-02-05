import { createPublicClient, http } from 'viem';
import { monadTestnet } from './chain';
import { loadConfig } from './config';

const config = loadConfig();

/**
 * Public client for onchain reads
 */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(config.rpcHttpUrl),
});

/**
 * Format tx hash with explorer link
 */
export function getTxUrl(hash: `0x${string}`): string {
  return `${config.explorerTxUrlPrefix}${hash}`;
}

/**
 * Format address with explorer link
 */
export function getAddressUrl(address: `0x${string}`): string {
  return `${config.explorerAddressUrlPrefix}${address}`;
}

/**
 * Format block number with explorer link
 */
export function getBlockUrl(blockNumber: bigint): string {
  return `${config.explorerBlockUrlPrefix}${blockNumber}`;
}
