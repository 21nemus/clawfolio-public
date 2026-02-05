import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/clients';
import { BotAccountABI } from '@/abi/BotAccount';

export interface BotDetails {
  creator: `0x${string}`;
  operator: `0x${string}`;
  lifecycleState: number;
  paused: boolean;
  nonce: bigint;
  riskParams: {
    maxAmountInPerTrade: bigint;
    minSecondsBetweenTrades: bigint;
  };
}

export const LIFECYCLE_STATES = {
  0: 'Draft',
  1: 'Stealth',
  2: 'Public',
  3: 'Graduated',
  4: 'Retired',
} as const;

export function useBotDetails(botAccountAddress: `0x${string}` | null | undefined) {
  const [details, setDetails] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  useEffect(() => {
    if (!botAccountAddress) {
      setDetails(null);
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const [creator, operator, lifecycleState, paused, nonce, riskParams] = await Promise.all([
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'creator',
          }),
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'operator',
          }),
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'lifecycleState',
          }),
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'paused',
          }),
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'nonce',
          }),
          publicClient.readContract({
            address: botAccountAddress,
            abi: BotAccountABI,
            functionName: 'riskParams',
          }),
        ]);

        setDetails({
          creator,
          operator,
          lifecycleState,
          paused,
          nonce,
          riskParams,
        });
      } catch (err) {
        console.error('Failed to fetch bot details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bot details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [botAccountAddress, refetchCounter]);

  return { details, loading, error, refetch: () => setRefetchCounter((c) => c + 1) };
}
