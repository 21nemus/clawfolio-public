import { createPublicClient, http } from 'viem';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RunnerConfig } from './config.js';
import { BotRegistryABI } from './abi/BotRegistry.js';
import { BotAccountABI } from './abi/BotAccount.js';
import { decodeMetadataURI, retry } from './utils.js';

export async function runBot(config: RunnerConfig, botId: number): Promise<void> {
  console.log(`\n🤖 DRY-RUN for bot ${botId}\n`);

  const client = createPublicClient({
    transport: http(config.rpcHttpUrl),
  });

  // Fetch bot account
  const botAccount = await retry(() =>
    client.readContract({
      address: config.botRegistry,
      abi: BotRegistryABI,
      functionName: 'botAccountOf',
      args: [BigInt(botId)],
    })
  ) as `0x${string}`;

  if (botAccount === '0x0000000000000000000000000000000000000000') {
    console.log('❌ Bot does not exist');
    return;
  }

  console.log(`Bot account: ${botAccount}`);

  // Fetch metadata URI
  const metadataURI = await retry(() =>
    client.readContract({
      address: config.botRegistry,
      abi: BotRegistryABI,
      functionName: 'metadataURI',
      args: [BigInt(botId)],
    })
  ) as string;

  const metadata = decodeMetadataURI(metadataURI);
  const strategyPrompt = metadata?.strategyPrompt as string | undefined;

  console.log(`\nStrategy Prompt: ${strategyPrompt || '(none)'}\n`);

  // Fetch bot state
  const [paused, lifecycleState, riskParams] = await Promise.all([
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
    retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'riskParams',
      })
    ) as Promise<{ maxAmountInPerTrade: bigint; minSecondsBetweenTrades: bigint }>,
  ]);

  console.log(`Paused: ${paused}`);
  console.log(`Lifecycle state: ${lifecycleState}`);
  console.log(`Risk params: maxTrade=${riskParams.maxAmountInPerTrade}, cooldown=${riskParams.minSecondsBetweenTrades}s`);

  // Check if bot can trade
  if (paused) {
    console.log('\n⏸  Bot is paused, skipping');
    return;
  }

  if (lifecycleState === 0) {
    console.log('\n⏸  Bot is not active (lifecycle=0), skipping');
    return;
  }

  // Fetch last trade timestamp
  let lastTradeTimestamp: bigint | null = null;
  try {
    lastTradeTimestamp = await retry(() =>
      client.readContract({
        address: botAccount,
        abi: BotAccountABI,
        functionName: 'lastTradeTimestamp',
      })
    ) as bigint;
  } catch (error) {
    console.log('⚠️  Could not fetch lastTradeTimestamp (contract may not expose it)');
  }

  if (lastTradeTimestamp !== null) {
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const timeSinceLastTrade = nowSeconds - lastTradeTimestamp;
    const cooldown = riskParams.minSecondsBetweenTrades;

    console.log(`\nTime since last trade: ${timeSinceLastTrade}s`);
    console.log(`Required cooldown: ${cooldown}s`);

    if (timeSinceLastTrade < cooldown) {
      console.log(`\n⏳ Cooldown not elapsed, skipping (need ${cooldown - timeSinceLastTrade}s more)`);
      return;
    }
  }

  // Dry-run decision logic
  console.log('\n🧠 Making trading decision (DRY-RUN)...\n');

  // Simple deterministic logic (no LLM)
  const decision = makeSimpleDecision(strategyPrompt);

  console.log(`Decision: ${decision.action}`);
  console.log(`Reason: ${decision.reason}`);

  if (decision.action !== 'HOLD') {
    console.log('\n⚠️  NOTE: Actual trade execution is DISABLED (DRY-RUN mode)');
    console.log('Real execution requires EIP-712 TradeIntent typed-data specification.');
  }

  console.log('\n✅ Dry-run complete');
}

export async function runAllBots(config: RunnerConfig): Promise<void> {
  console.log('🤖 DRY-RUN for all bots\n');

  const client = createPublicClient({
    transport: http(config.rpcHttpUrl),
  });

  const botCount = await retry(() =>
    client.readContract({
      address: config.botRegistry,
      abi: BotRegistryABI,
      functionName: 'botCount',
    })
  ) as bigint;

  const maxBots = config.maxBots ? Math.min(Number(botCount), config.maxBots) : Number(botCount);

  for (let botId = 0; botId < maxBots; botId++) {
    try {
      await runBot(config, botId);
    } catch (error) {
      console.error(`❌ Failed to run bot ${botId}:`, error);
    }
  }

  console.log('\n✅ All bots processed');
}

interface Decision {
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

function makeSimpleDecision(strategyPrompt?: string): Decision {
  if (!strategyPrompt) {
    return {
      action: 'HOLD',
      reason: 'No strategy prompt configured',
    };
  }

  const lowerPrompt = strategyPrompt.toLowerCase();

  // Simple heuristic: if "momentum" in prompt, simulate a BUY signal
  if (lowerPrompt.includes('momentum')) {
    return {
      action: 'BUY',
      reason: 'Momentum strategy detected (simulated positive signal)',
    };
  }

  // If "mean revert" in prompt, simulate a BUY on dip
  if (lowerPrompt.includes('mean') || lowerPrompt.includes('revert')) {
    return {
      action: 'BUY',
      reason: 'Mean reversion strategy detected (simulated dip signal)',
    };
  }

  // If "dca" or "dollar cost", simulate periodic BUY
  if (lowerPrompt.includes('dca') || lowerPrompt.includes('dollar cost')) {
    return {
      action: 'BUY',
      reason: 'DCA strategy detected (simulated periodic buy)',
    };
  }

  // If "range" or "grid", simulate HOLD (waiting for range boundaries)
  if (lowerPrompt.includes('range') || lowerPrompt.includes('grid')) {
    return {
      action: 'HOLD',
      reason: 'Range strategy detected (waiting for range boundaries)',
    };
  }

  // Default: HOLD
  return {
    action: 'HOLD',
    reason: 'No specific signal detected',
  };
}
