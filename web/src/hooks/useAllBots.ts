import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';
import { decodeMetadataURI } from '@/lib/encoding';

export interface BotWithMetadata {
  botId: bigint;
  botAccount: `0x${string}`;
  creator?: `0x${string}`;
  name?: string;
  handle?: string;
  image?: string;
  description?: string;
  hasToken: boolean;
  tokenAddress?: `0x${string}`;
}

export function useAllBots() {
  const [bots, setBots] = useState<BotWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAllBots = async () => {
      const config = loadConfig();
      
      if (!config.botRegistry) {
        if (!cancelled) {
          setError('BotRegistry not configured');
          setLoading(false);
        }
        return;
      }

      try {
        // Read botCount
        const botCount = await publicClient.readContract({
          address: config.botRegistry,
          abi: BOT_REGISTRY_ABI,
          functionName: 'botCount',
        }) as bigint;

        if (cancelled) return;

        const allBots: BotWithMetadata[] = [];
        const CONCURRENCY = 5;

        // Iterate bot IDs in batches (starting from 0)
        for (let i = 0n; i < botCount; i++) {
          if (cancelled) break;

          const batch: Promise<void>[] = [];
          const batchSize = Math.min(Number(CONCURRENCY), Number(botCount - i));

          for (let j = 0; j < batchSize && i + BigInt(j) < botCount; j++) {
            const botId = i + BigInt(j);
            
            batch.push((async () => {
              try {
                const [botAccount, metadataURI, tokenAddress] = await Promise.all([
                  publicClient.readContract({
                    address: config.botRegistry!,
                    abi: BOT_REGISTRY_ABI,
                    functionName: 'botAccountOf',
                    args: [botId],
                  }) as Promise<`0x${string}`>,
                  publicClient.readContract({
                    address: config.botRegistry!,
                    abi: BOT_REGISTRY_ABI,
                    functionName: 'metadataURI',
                    args: [botId],
                  }) as Promise<string>,
                  publicClient.readContract({
                    address: config.botRegistry!,
                    abi: BOT_REGISTRY_ABI,
                    functionName: 'botTokenOf',
                    args: [botId],
                  }) as Promise<`0x${string}`>,
                ]);

                // Skip zero address (deleted/invalid bot)
                if (botAccount === '0x0000000000000000000000000000000000000000') {
                  return;
                }

                // Decode metadata
                const metadata = decodeMetadataURI(metadataURI);
                const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';

                if (!cancelled) {
                  allBots.push({
                    botId,
                    botAccount,
                    name: metadata?.name as string | undefined,
                    handle: metadata?.handle as string | undefined,
                    image: metadata?.image as string | undefined,
                    description: metadata?.description as string | undefined,
                    hasToken,
                    tokenAddress: hasToken ? tokenAddress : undefined,
                  });
                }
              } catch (err) {
                console.error(`Failed to fetch bot ${botId}:`, err);
              }
            })());
          }

          await Promise.all(batch);
          i += BigInt(batchSize - 1); // Adjust loop counter

          // Update UI incrementally
          if (!cancelled && allBots.length > 0) {
            setBots([...allBots]);
          }
        }

        if (!cancelled) {
          setBots([...allBots]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch all bots:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch bots');
          setLoading(false);
        }
      }
    };

    fetchAllBots();

    return () => {
      cancelled = true;
    };
  }, []);

  return { bots, loading, error };
}
