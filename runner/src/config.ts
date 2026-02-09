import { config } from 'dotenv';
import { isAddress } from 'viem';

config();

export interface RunnerConfig {
  chainId: number;
  rpcHttpUrl: string;
  botRegistry: `0x${string}`;
  startBlock: bigint;
  outDir: string;
  maxBots: number | null;
  quoteMode: 'none' | 'uniswapV2';
  quoteRouter: `0x${string}` | null;
  quoteBaseToken: string;
}

function getEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

function parseAddress(value: string, name: string): `0x${string}` {
  if (!value || !isAddress(value)) {
    throw new Error(`Invalid ${name}: ${value}. Must be a valid 0x address.`);
  }
  return value as `0x${string}`;
}

export function loadConfig(): RunnerConfig {
  const chainId = parseInt(getEnv('RUNNER_CHAIN_ID', '10143'), 10);
  const rpcHttpUrl = getEnv('RUNNER_RPC_HTTP_URL', 'https://testnet-rpc.monad.xyz');
  const botRegistry = parseAddress(getEnv('RUNNER_BOT_REGISTRY'), 'RUNNER_BOT_REGISTRY');
  const startBlock = BigInt(getEnv('RUNNER_START_BLOCK', '0'));
  const outDir = getEnv('RUNNER_OUT_DIR', 'out');
  const maxBotsStr = getEnv('RUNNER_MAX_BOTS');
  const maxBots = maxBotsStr ? parseInt(maxBotsStr, 10) : null;
  
  const quoteMode = getEnv('RUNNER_QUOTE_MODE', 'none') as 'none' | 'uniswapV2';
  let quoteRouter: `0x${string}` | null = null;
  const quoteBaseToken = getEnv('RUNNER_QUOTE_BASE_TOKEN', 'USDC');

  if (quoteMode === 'uniswapV2') {
    const routerAddr = getEnv('RUNNER_QUOTE_ROUTER');
    if (routerAddr && isAddress(routerAddr)) {
      quoteRouter = routerAddr as `0x${string}`;
    } else {
      console.warn('RUNNER_QUOTE_MODE=uniswapV2 but RUNNER_QUOTE_ROUTER is invalid. PnL will be unavailable.');
    }
  }

  return {
    chainId,
    rpcHttpUrl,
    botRegistry,
    startBlock,
    outDir,
    maxBots,
    quoteMode,
    quoteRouter,
    quoteBaseToken,
  };
}
