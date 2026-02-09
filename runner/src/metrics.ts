import { createPublicClient, http } from 'viem';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RunnerConfig } from './config.js';
import { BotRegistryABI } from './abi/BotRegistry.js';
import { BotAccountABI } from './abi/BotAccount.js';
import { ERC20ABI } from './abi/ERC20.js';
import { BotEvent, BotMetrics } from './types.js';
import { formatAmount, shortenAddress, retry } from './utils.js';

export async function generateMetrics(config: RunnerConfig): Promise<void> {
  console.log('📈 Generating metrics...\n');

  const client = createPublicClient({
    transport: http(config.rpcHttpUrl),
  });

  const indexDir = join(config.outDir, 'index');
  const metricsDir = join(config.outDir, 'metrics');
  mkdirSync(metricsDir, { recursive: true });

  try {
    const files = readdirSync(indexDir).filter((f) => f.endsWith('.json'));
    
    for (const file of files) {
      const botId = parseInt(file.replace('.json', ''));
      try {
        console.log(`📊 Computing metrics for bot ${botId}...`);
        await generateBotMetrics(client, config, botId);
      } catch (error) {
        console.error(`❌ Failed to generate metrics for bot ${botId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ No indexed data found. Run npm run index first.');
    return;
  }

  console.log('\n✅ Metrics generation complete!');
}

async function generateBotMetrics(
  client: ReturnType<typeof createPublicClient>,
  config: RunnerConfig,
  botId: number
): Promise<void> {
  // Load indexed events
  const indexPath = join(config.outDir, 'index', `${botId}.json`);
  const indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));
  const events = indexData.events as BotEvent[];
  const botAccount = indexData.botAccount as `0x${string}`;

  // Fetch bot state
  const [creator, operator, paused, lifecycleState] = await Promise.all([
    retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'creator',
      })
    ) as Promise<`0x${string}`>,
    retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'operator',
      })
    ) as Promise<`0x${string}`>,
    retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'paused',
      })
    ) as Promise<boolean>,
    retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'lifecycleState',
      })
    ) as Promise<number>,
  ]);

  // Compute trade count and last activity
  const tradeEvents = events.filter((e) => e.type === 'TradeExecuted');
  const tradeCount = tradeEvents.length;
  
  const lastActivity = events.length > 0 ? {
    blockNumber: Number(events[0].blockNumber),
    tx: events[0].transactionHash,
    type: events[0].type,
  } : null;

  // Extract unique tokens
  const tokenSet = new Set<string>();
  events.forEach((event) => {
    if (event.type === 'Deposited' || event.type === 'Withdrawn') {
      tokenSet.add(event.token.toLowerCase());
    } else if (event.type === 'TradeExecuted') {
      event.path.forEach((token) => tokenSet.add(token.toLowerCase()));
    }
  });

  // Compute net flows
  const flowsMap: Record<string, bigint> = {};
  events.forEach((event) => {
    if (event.type === 'Deposited') {
      const token = event.token.toLowerCase();
      flowsMap[token] = (flowsMap[token] || 0n) + event.amount;
    } else if (event.type === 'Withdrawn') {
      const token = event.token.toLowerCase();
      flowsMap[token] = (flowsMap[token] || 0n) - event.amount;
    }
  });

  // Fetch current balances
  const monBalance = await retry(() => client.getBalance({ address: botAccount }));
  
  const balances: BotMetrics['balances'] = [
    {
      token: 'MON',
      symbol: 'MON',
      decimals: 18,
      raw: monBalance.toString(),
      formatted: formatAmount(monBalance, 18),
    },
  ];

  const flows: BotMetrics['flows'] = [];

  for (const tokenAddr of Array.from(tokenSet)) {
    if (tokenAddr === '0x0000000000000000000000000000000000000000') continue;

    try {
      const [balance, symbol, decimals] = await Promise.all([
        retry(() =>
          client.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [botAccount],
          })
        ) as Promise<bigint>,
        retry(() =>
          client.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'symbol',
          }).catch(() => shortenAddress(tokenAddr))
        ) as Promise<string>,
        retry(() =>
          client.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'decimals',
          }).catch(() => 18)
        ) as Promise<number>,
      ]);

      balances.push({
        token: tokenAddr,
        symbol,
        decimals,
        raw: balance.toString(),
        formatted: formatAmount(balance, decimals),
      });

      if (flowsMap[tokenAddr] !== undefined) {
        flows.push({
          token: tokenAddr,
          symbol,
          decimals,
          netRaw: flowsMap[tokenAddr].toString(),
          netFormatted: formatAmount(flowsMap[tokenAddr], decimals),
        });
      }
    } catch (error) {
      console.error(`  ⚠️  Failed to fetch token data for ${tokenAddr}`);
    }
  }

  // PnL (stub for now)
  const pnl: BotMetrics['pnl'] = {
    mode: 'none',
    baseSymbol: config.quoteBaseToken,
    currentValueBase: null,
    netDepositsBase: null,
    pnlBase: null,
    note: `PnL not available (RUNNER_QUOTE_MODE=${config.quoteMode})`,
  };

  // Assemble metrics
  const metrics: BotMetrics = {
    botId,
    botAccount,
    updatedAt: new Date().toISOString(),
    paused,
    lifecycleState,
    operator,
    creator,
    tradeCount,
    lastActivity,
    balances,
    flows,
    pnl,
  };

  // Save metrics
  const metricsPath = join(config.outDir, 'metrics', `${botId}.json`);
  writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  
  console.log(`  ✓ Metrics saved to ${metricsPath}`);
}
