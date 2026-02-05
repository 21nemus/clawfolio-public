import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BotRegistryABI } from '@/abi/BotRegistry';
import { loadConfig } from '@/lib/config';

export interface BotCreatedEvent {
  botId: bigint;
  botAccount: `0x${string}`;
  creator: `0x${string}`;
  operator: `0x${string}`;
  metadataURI: string;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

export function useBotRegistryLogs(filterAddress?: `0x${string}`) {
  const [logs, setLogs] = useState<BotCreatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      const config = loadConfig();
      
      if (!config.botRegistry) {
        setError('BotRegistry address not configured');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const rawLogs = await publicClient.getLogs({
          address: config.botRegistry,
          event: {
            type: 'event',
            name: 'BotCreated',
            inputs: [
              { name: 'botId', type: 'uint256', indexed: true },
              { name: 'botAccount', type: 'address', indexed: true },
              { name: 'creator', type: 'address', indexed: true },
              { name: 'operator', type: 'address', indexed: false },
              { name: 'metadataURI', type: 'string', indexed: false },
            ],
          },
          fromBlock: config.startBlock,
          toBlock: 'latest',
        });

        let parsedLogs = rawLogs.map((log) => ({
          botId: log.args.botId!,
          botAccount: log.args.botAccount!,
          creator: log.args.creator!,
          operator: log.args.operator!,
          metadataURI: log.args.metadataURI!,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
        }));

        // Filter by creator if specified
        if (filterAddress) {
          parsedLogs = parsedLogs.filter(
            (log) => log.creator.toLowerCase() === filterAddress.toLowerCase()
          );
        }

        // Sort by block number descending (newest first)
        parsedLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setLogs(parsedLogs);
      } catch (err) {
        console.error('Failed to fetch BotCreated logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filterAddress, refetchCounter]);

  return { logs, loading, error, refetch: () => setRefetchCounter((c) => c + 1) };
}
