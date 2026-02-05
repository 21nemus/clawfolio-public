import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BotAccountABI } from '@/abi/BotAccount';
import { loadConfig } from '@/lib/config';

export type BotEvent =
  | {
      type: 'TradeExecuted';
      botId: bigint;
      nonce: bigint;
      operator: `0x${string}`;
      router: `0x${string}`;
      path: `0x${string}`[];
      amountIn: bigint;
      amountOut: bigint;
      timestamp: bigint;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    }
  | {
      type: 'Deposited';
      botId: bigint;
      token: `0x${string}`;
      amount: bigint;
      depositor: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    }
  | {
      type: 'Withdrawn';
      botId: bigint;
      token: `0x${string}`;
      amount: bigint;
      to: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    }
  | {
      type: 'LifecycleChanged';
      botId: bigint;
      fromState: number;
      toState: number;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    }
  | {
      type: 'PausedUpdated';
      botId: bigint;
      paused: boolean;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    }
  | {
      type: 'OperatorUpdated';
      botId: bigint;
      oldOperator: `0x${string}`;
      newOperator: `0x${string}`;
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    };

export function useBotEvents(botAccountAddress: `0x${string}` | null | undefined) {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  useEffect(() => {
    if (!botAccountAddress) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const config = loadConfig();

        // Fetch multiple event types in parallel
        const [
          tradeExecutedLogs,
          depositedLogs,
          withdrawnLogs,
          lifecycleChangedLogs,
          pausedUpdatedLogs,
          operatorUpdatedLogs,
        ] = await Promise.all([
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'TradeExecuted')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'Deposited')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'Withdrawn')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'LifecycleChanged')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'PausedUpdated')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: botAccountAddress,
            event: BotAccountABI.find((item) => item.type === 'event' && item.name === 'OperatorUpdated')!,
            fromBlock: config.startBlock,
            toBlock: 'latest',
          }),
        ]);

        const parsedEvents: BotEvent[] = [];

        tradeExecutedLogs.forEach((log) => {
          parsedEvents.push({
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
          });
        });

        depositedLogs.forEach((log) => {
          parsedEvents.push({
            type: 'Deposited',
            botId: log.args.botId!,
            token: log.args.token!,
            amount: log.args.amount!,
            depositor: log.args.depositor!,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        });

        withdrawnLogs.forEach((log) => {
          parsedEvents.push({
            type: 'Withdrawn',
            botId: log.args.botId!,
            token: log.args.token!,
            amount: log.args.amount!,
            to: log.args.to!,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        });

        lifecycleChangedLogs.forEach((log) => {
          parsedEvents.push({
            type: 'LifecycleChanged',
            botId: log.args.botId!,
            fromState: log.args.fromState!,
            toState: log.args.toState!,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        });

        pausedUpdatedLogs.forEach((log) => {
          parsedEvents.push({
            type: 'PausedUpdated',
            botId: log.args.botId!,
            paused: log.args.paused!,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        });

        operatorUpdatedLogs.forEach((log) => {
          parsedEvents.push({
            type: 'OperatorUpdated',
            botId: log.args.botId!,
            oldOperator: log.args.oldOperator!,
            newOperator: log.args.newOperator!,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        });

        // Sort by block number descending (newest first)
        parsedEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setEvents(parsedEvents);
      } catch (err) {
        console.error('Failed to fetch bot events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [botAccountAddress, refetchCounter]);

  return { events, loading, error, refetch: () => setRefetchCounter((c) => c + 1) };
}
