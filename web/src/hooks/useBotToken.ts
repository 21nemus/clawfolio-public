import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BOT_REGISTRY_ABI } from '@/lib/abi';
import { loadConfig } from '@/lib/config';

const appConfig = loadConfig();

export function useBotToken(botId: bigint | null | undefined) {
  const [token, setToken] = useState<`0x${string}` | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!botId || !appConfig.botRegistry) {
      setToken(null);
      setLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        setLoading(true);
        const tokenAddress = (await publicClient.readContract({
          address: appConfig.botRegistry!,
          abi: BOT_REGISTRY_ABI,
          functionName: 'botTokenOf',
          args: [botId],
        })) as `0x${string}`;
        // Check if it's zero address
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          setToken(null);
        } else {
          setToken(tokenAddress);
        }
      } catch (err) {
        console.error('Failed to fetch bot token:', err);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [botId]);

  return { token, loading };
}
