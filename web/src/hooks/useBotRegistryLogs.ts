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

const CHUNK_SIZE = 500n; // Increased from 100n for fewer requests
const MAX_EVENTS = 200;
const MAX_CHUNKS = 50; // safety cap
const LOOKBACK_WINDOW = 5000n; // recent block lookback for fast queries

export function useBotRegistryLogs(filterAddress?: `0x${string}`) {
  const [logs, setLogs] = useState<BotCreatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      const config = loadConfig();
      
      if (!config.botRegistry) {
        if (!cancelled) {
          setError('BotRegistry address not configured');
          setLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }

        // Get latest block number
        const latestBlock = await publicClient.getBlockNumber();
        if (cancelled) return;
        
        // Calculate lookback start (recent window for fast queries)
        const lookbackStart = latestBlock - LOOKBACK_WINDOW;
        const effectiveStartBlock = lookbackStart > config.startBlock ? lookbackStart : config.startBlock;
        
        let allRawLogs: any[] = [];

        // Try single getLogs first (faster if RPC supports it)
        try {
          allRawLogs = await publicClient.getLogs({
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
            fromBlock: effectiveStartBlock,
            toBlock: latestBlock,
          });
          if (cancelled) return;
        } catch (singleCallError) {
          // Single call failed (range too large), fallback to chunking
          console.log('Single getLogs failed, using chunked scan:', singleCallError);
          if (cancelled) return;

          let endBlock = latestBlock;
          let chunksProcessed = 0;

          while (chunksProcessed < MAX_CHUNKS && allRawLogs.length < MAX_EVENTS && !cancelled) {
            const fromBlock = endBlock - CHUNK_SIZE + 1n > effectiveStartBlock 
              ? endBlock - CHUNK_SIZE + 1n 
              : effectiveStartBlock;

            if (fromBlock > endBlock) break;

            const chunkLogs = await publicClient.getLogs({
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
              fromBlock,
              toBlock: endBlock,
            });

            if (cancelled) return;
            allRawLogs.push(...chunkLogs);
            chunksProcessed++;

            // Stop if we reached effective start block
            if (fromBlock <= effectiveStartBlock) break;

            // Move to next chunk
            endBlock = fromBlock - 1n;
          }
        }

        if (cancelled) return;

        let parsedLogs = allRawLogs.map((log) => ({
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

        // Limit to MAX_EVENTS
        if (parsedLogs.length > MAX_EVENTS) {
          parsedLogs = parsedLogs.slice(0, MAX_EVENTS);
        }

        if (!cancelled) {
          setLogs(parsedLogs);
        }
      } catch (err) {
        console.error('Failed to fetch BotCreated logs:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch logs');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [filterAddress, refetchCounter]);

  return { logs, loading, error, refetch: () => setRefetchCounter((c) => c + 1) };
}
