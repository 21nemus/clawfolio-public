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
  runnerBaseUrl: string | null;
  moltbookEnabled: boolean;
  moltbookApiBase: string;
  moltbookSubmolt: string;
  walletConnectProjectId: string | null;
  demoCreatorAddr: `0x${string}` | null;
}

function getEnv(key: string, defaultValue?: string): string | undefined {
  if (typeof window === 'undefined') {
    return process.env[key] || defaultValue;
  }
  /**
   * Client-side: Next.js inlines `process.env.NEXT_PUBLIC_*` at build-time.
   * Dynamic access like `process.env[key]` can be undefined in the browser,
   * so we map the small set of supported keys to static references.
   */
  switch (key) {
    case 'NEXT_PUBLIC_CHAIN_ID':
      return process.env.NEXT_PUBLIC_CHAIN_ID || defaultValue;
    case 'NEXT_PUBLIC_RPC_HTTP_URL':
      return process.env.NEXT_PUBLIC_RPC_HTTP_URL || defaultValue;
    case 'NEXT_PUBLIC_RPC_URL':
      return process.env.NEXT_PUBLIC_RPC_URL || defaultValue;
    case 'NEXT_PUBLIC_BOT_REGISTRY':
      return process.env.NEXT_PUBLIC_BOT_REGISTRY || defaultValue;
    case 'NEXT_PUBLIC_BOT_REGISTRY_ADDR':
      return process.env.NEXT_PUBLIC_BOT_REGISTRY_ADDR || defaultValue;
    case 'NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX':
      return process.env.NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX || defaultValue;
    case 'NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX':
      return process.env.NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX || defaultValue;
    case 'NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX':
      return process.env.NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX || defaultValue;
    case 'NEXT_PUBLIC_START_BLOCK':
      return process.env.NEXT_PUBLIC_START_BLOCK || defaultValue;
    case 'NEXT_PUBLIC_OPENCLAW_BASE_URL':
      return process.env.NEXT_PUBLIC_OPENCLAW_BASE_URL || defaultValue;
    case 'NEXT_PUBLIC_RUNNER_BASE_URL':
      return process.env.NEXT_PUBLIC_RUNNER_BASE_URL || defaultValue;
    case 'NEXT_PUBLIC_MOLTBOOK_ENABLED':
      return process.env.NEXT_PUBLIC_MOLTBOOK_ENABLED || defaultValue;
    case 'NEXT_PUBLIC_MOLTBOOK_API_BASE':
      return process.env.NEXT_PUBLIC_MOLTBOOK_API_BASE || defaultValue;
    case 'NEXT_PUBLIC_MOLTBOOK_SUBMOLT':
      return process.env.NEXT_PUBLIC_MOLTBOOK_SUBMOLT || defaultValue;
    case 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID':
      return process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || defaultValue;
    case 'NEXT_PUBLIC_DEMO_CREATOR_ADDR':
      return process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDR || defaultValue;
    default:
      return defaultValue;
  }
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
  const rawBotRegistry = getEnv('NEXT_PUBLIC_BOT_REGISTRY');
  const rawBotRegistryAddr = getEnv('NEXT_PUBLIC_BOT_REGISTRY_ADDR');
  const parsedBotRegistry = parseAddress(rawBotRegistry);
  const parsedBotRegistryAddr = parseAddress(rawBotRegistryAddr);
  const botRegistry = parsedBotRegistry || parsedBotRegistryAddr;
  const explorerTxUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX', 'https://monadvision.com/tx/') || 'https://monadvision.com/tx/';
  const explorerAddressUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX', 'https://monadvision.com/address/') || 'https://monadvision.com/address/';
  const explorerBlockUrlPrefix = getEnv('NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX', 'https://monadvision.com/block/') || 'https://monadvision.com/block/';
  const startBlock = BigInt(getEnv('NEXT_PUBLIC_START_BLOCK', '0') || '0');
  const openclawBaseUrl = getEnv('NEXT_PUBLIC_OPENCLAW_BASE_URL') || null;
  const runnerBaseUrl = getEnv('NEXT_PUBLIC_RUNNER_BASE_URL') || null;
  const moltbookEnabled = getEnv('NEXT_PUBLIC_MOLTBOOK_ENABLED', 'false') === 'true';
  const moltbookApiBase = getEnv('NEXT_PUBLIC_MOLTBOOK_API_BASE', 'https://www.moltbook.com/api/v1') || 'https://www.moltbook.com/api/v1';
  const moltbookSubmolt = getEnv('NEXT_PUBLIC_MOLTBOOK_SUBMOLT', 'moltiversehackathon') || 'moltiversehackathon';
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
    runnerBaseUrl,
    moltbookEnabled,
    moltbookApiBase,
    moltbookSubmolt,
    walletConnectProjectId,
    demoCreatorAddr,
  };
}

export function getConfigIssues(config: AppConfig): string[] {
  const issues: string[] = [];
  
  if (!config.botRegistry) {
    issues.push('BotRegistry address not configured (set NEXT_PUBLIC_BOT_REGISTRY or NEXT_PUBLIC_BOT_REGISTRY_ADDR)');
  }
  
  if (!config.rpcHttpUrl || config.rpcHttpUrl.includes('localhost')) {
    issues.push('RPC URL may be invalid or pointing to localhost');
  }

  if (config.moltbookEnabled && (!config.moltbookApiBase || !config.moltbookApiBase.startsWith('https://www.moltbook.com'))) {
    issues.push('Moltbook enabled but API base is invalid (must start with https://www.moltbook.com)');
  }
  
  // Skip WalletConnect warning - injected wallets only mode
  
  return issues;
}
