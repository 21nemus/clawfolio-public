/**
 * Configuration loader with non-throwing env parsing
 * Shows UI banner if critical config is missing
 */

export interface AppConfig {
  chainId: number;
  rpcHttpUrl: string;
  botRegistry: `0x${string}` | null;
  explorerTxUrlPrefix: string;
  explorerAddressUrlPrefix: string;
  explorerBlockUrlPrefix: string;
  startBlock: bigint;
  openclawBaseUrl: string | null;
  moltbookEnabled: boolean;
  walletConnectProjectId: string | null;
  demoCreatorAddr: `0x${string}` | null;
}

function getEnv(key: string, defaultValue?: string): string | undefined {
  if (typeof window === 'undefined') {
    return process.env[key] || defaultValue;
  }
  // Client-side: only NEXT_PUBLIC_ vars are available
  return (process.env[key] as string | undefined) || defaultValue;
}

function parseAddress(value: string | undefined): `0x${string}` | null {
  if (!value || value === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    console.warn(`Invalid address format: ${value}`);
    return null;
  }
  return value as `0x${string}`;
}

export function loadConfig(): AppConfig {
  const chainId = parseInt(getEnv('NEXT_PUBLIC_CHAIN_ID', '10143') || '10143', 10);
  // Support both NEXT_PUBLIC_RPC_HTTP_URL and NEXT_PUBLIC_RPC_URL (alias)
  const rpcHttpUrl = getEnv('NEXT_PUBLIC_RPC_HTTP_URL') || getEnv('NEXT_PUBLIC_RPC_URL') || 'https://testnet-rpc.monad.xyz';
  // Support both NEXT_PUBLIC_BOT_REGISTRY and NEXT_PUBLIC_BOT_REGISTRY_ADDR (alias)
  const botRegistry = parseAddress(getEnv('NEXT_PUBLIC_BOT_REGISTRY') || getEnv('NEXT_PUBLIC_BOT_REGISTRY_ADDR'));
  const explorerTxUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX', 'https://monadvision.com/tx/') || 'https://monadvision.com/tx/';
  const explorerAddressUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX', 'https://monadvision.com/address/') || 'https://monadvision.com/address/';
  const explorerBlockUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX', 'https://monadvision.com/block/') || 'https://monadvision.com/block/';
  const startBlock = BigInt(getEnv('NEXT_PUBLIC_START_BLOCK', '0') || '0');
  const openclawBaseUrl = getEnv('NEXT_PUBLIC_OPENCLAW_BASE_URL') || null;
  const moltbookEnabled = getEnv('NEXT_PUBLIC_MOLTBOOK_ENABLED', 'false') === 'true';
  const walletConnectProjectId = getEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID') || null;
  // Demo creator address for read-only dashboard (defaults to deployer)
  const demoCreatorAddr = parseAddress(getEnv('NEXT_PUBLIC_DEMO_CREATOR_ADDR', '0xd641Fd6e02036242Da43BDa0c0fb086707EB5223'));

  return {
    chainId,
    rpcHttpUrl,
    botRegistry,
    explorerTxUrlPrefix,
    explorerAddressUrlPrefix,
    explorerBlockUrlPrefix,
    startBlock,
    openclawBaseUrl,
    moltbookEnabled,
    walletConnectProjectId,
    demoCreatorAddr,
  };
}

export function getConfigIssues(config: AppConfig): string[] {
  const issues: string[] = [];
  
  if (!config.botRegistry) {
    issues.push('BotRegistry address not configured (set NEXT_PUBLIC_BOT_REGISTRY)');
  }
  
  if (!config.rpcHttpUrl || config.rpcHttpUrl.includes('localhost')) {
    issues.push('RPC URL may be invalid or pointing to localhost');
  }
  
  if (!config.walletConnectProjectId || config.walletConnectProjectId.includes('YOUR_') || config.walletConnectProjectId === 'CLAWFOLIO_DEFAULT_ID') {
    issues.push('WalletConnect Project ID not configured - WalletConnect wallets may not work (set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)');
  }
  
  return issues;
}
