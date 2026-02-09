import { createPublicClient, http } from 'viem';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RunnerConfig } from './config.js';
import { BotRegistryABI } from './abi/BotRegistry.js';
import { BotAccountABI } from './abi/BotAccount.js';
import { BotEvent } from './types.js';
import { deduplicateEvents, retry } from './utils.js';

const CHUNK_SIZE = 100n;

export async function indexAllBots(config: RunnerConfig): Promise<void> {
  console.log('🔍 Starting bot indexer...\n');
  
  const client = createPublicClient({
    transport: http(config.rpcHttpUrl),
  });

  // Fetch bot count
  const botCount = await retry(() =>
    client.readContract({
      address: config.botRegistry,
      abi: BotRegistryABI,
      functionName: 'botCount',
    })
  ) as bigint;

  console.log(`Found ${botCount} bot(s) in registry\n`);

  const maxBots = config.maxBots ? Math.min(Number(botCount), config.maxBots) : Number(botCount);

  for (let botId = 0n; botId < BigInt(maxBots); botId++) {
    try {
      console.log(`\n📊 Indexing bot ${botId}...`);
      await indexBot(client, config, botId);
    } catch (error) {
      console.error(`❌ Failed to index bot ${botId}:`, error);
      // Continue with next bot
    }
  }

  console.log('\n✅ Indexing complete!');
}

async function indexBot(
  client: ReturnType<typeof createPublicClient>,
  config: RunnerConfig,
  botId: bigint
): Promise<void> {
  // Fetch bot account address
  const botAccount = await retry(() =>
    client.readContract({
      address: config.botRegistry,
      abi: BotRegistryABI,
      functionName: 'botAccountOf',
      args: [botId],
    })
  ) as `0x${string}`;

  if (botAccount === '0x0000000000000000000000000000000000000000') {
    console.log(`  Bot ${botId} has no account, skipping`);
    return;
  }

  console.log(`  Bot account: ${botAccount}`);

  // Fetch latest block
  const latestBlock = await retry(() => client.getBlockNumber());

  // Fetch logs in chunks
  const events = await fetchLogsChunked(client, botAccount, config.startBlock, latestBlock);

  console.log(`  Indexed ${events.length} event(s)`);

  // Save indexed events
  const indexDir = join(config.outDir, 'index');
  mkdirSync(indexDir, { recursive: true });
  
  writeFileSync(
    join(indexDir, `${botId}.json`),
    JSON.stringify(
      {
        botId: Number(botId),
        botAccount,
        indexedAt: new Date().toISOString(),
        startBlock: Number(config.startBlock),
        endBlock: Number(latestBlock),
        eventCount: events.length,
        events,
      },
      null,
      2
    )
  );
}

async function fetchLogsChunked(
  client: ReturnType<typeof createPublicClient>,
  botAccount: `0x${string}`,
  startBlock: bigint,
  endBlock: bigint
): Promise<BotEvent[]> {
  const allEvents: BotEvent[] = [];
  let currentEnd = endBlock;

  while (currentEnd >= startBlock) {
    const fromBlock = currentEnd - CHUNK_SIZE + 1n > startBlock
      ? currentEnd - CHUNK_SIZE + 1n
      : startBlock;

    if (fromBlock > currentEnd) break;

    // Fetch all event types in parallel for this chunk
    const [tradeExecutedLogs, depositedLogs, withdrawnLogs, lifecycleChangedLogs, pausedUpdatedLogs, operatorUpdatedLogs] = await Promise.all([
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'TradeExecuted')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'Deposited')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'Withdrawn')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'LifecycleChanged')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'PausedUpdated')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
      retry(() =>
        client.getLogs({
          address: botAccount,
          event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'OperatorUpdated')!,
          fromBlock,
          toBlock: currentEnd,
        })
      ),
    ]);

    // Parse events
    tradeExecutedLogs.forEach((log) => {
      allEvents.push({
        type: 'TradeExecuted',
        botId: log.args.botId!,
        nonce: log.args.nonce!,
        operator: log.args.operator!,
        router: log.args.router!,
        path: [...log.args.path!] as `0x${string}`[],
        amountIn: log.args.amountIn!,
        amountOut: log.args.amountOut!,
        timestamp: log.args.timestamp!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    depositedLogs.forEach((log) => {
      allEvents.push({
        type: 'Deposited',
        botId: log.args.botId!,
        token: log.args.token!,
        amount: log.args.amount!,
        depositor: log.args.depositor!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    withdrawnLogs.forEach((log) => {
      allEvents.push({
        type: 'Withdrawn',
        botId: log.args.botId!,
        token: log.args.token!,
        amount: log.args.amount!,
        to: log.args.to!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    lifecycleChangedLogs.forEach((log) => {
      allEvents.push({
        type: 'LifecycleChanged',
        botId: log.args.botId!,
        fromState: log.args.fromState!,
        toState: log.args.toState!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    pausedUpdatedLogs.forEach((log) => {
      allEvents.push({
        type: 'PausedUpdated',
        botId: log.args.botId!,
        paused: log.args.paused!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    operatorUpdatedLogs.forEach((log) => {
      allEvents.push({
        type: 'OperatorUpdated',
        botId: log.args.botId!,
        oldOperator: log.args.oldOperator!,
        newOperator: log.args.newOperator!,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex!,
      });
    });

    if (fromBlock <= startBlock) break;
    currentEnd = fromBlock - 1n;
  }

  // Deduplicate and sort
  return deduplicateEvents(allEvents).sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
