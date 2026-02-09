/**
 * Hook to fetch token image from Nad.fun tokenURI metadata
 * Scans CURVE CurveCreate logs to find tokenURI, then fetches metadata
 */

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { CURVE } from '@/lib/nadfun/constants';
import { curveAbi } from '@/lib/nadfun/abi';

const BLOCK_RANGE = 100; // Monad RPC constraint
const LOOKBACK_BLOCKS = 10_000; // Reasonable lookback window

// In-memory cache to avoid repeat scans
const tokenImageCache = new Map<string, string | null>();

interface TokenMetadata {
  image?: string;
  image_uri?: string;
  image_url?: string;
  [key: string]: unknown;
}

export function useNadfunTokenImage(token?: `0x${string}`) {
  const [tokenImageUrl, setTokenImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!token || !publicClient) {
      setTokenImageUrl(null);
      setLoading(false);
      return;
    }

    const cacheKey = `${publicClient.chain.id}:${token.toLowerCase()}`;

    // Check cache first
    if (tokenImageCache.has(cacheKey)) {
      setTokenImageUrl(tokenImageCache.get(cacheKey) || null);
      setLoading(false);
      return;
    }

    const fetchTokenImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock = currentBlock > LOOKBACK_BLOCKS ? currentBlock - BigInt(LOOKBACK_BLOCKS) : 0n;

        let tokenURI: string | null = null;

        // Scan backwards in chunks
        for (let toBlock = currentBlock; toBlock > startBlock; toBlock -= BigInt(BLOCK_RANGE)) {
          const fromBlock = toBlock - BigInt(BLOCK_RANGE) > startBlock 
            ? toBlock - BigInt(BLOCK_RANGE) 
            : startBlock;

          const logs = await publicClient.getLogs({
            address: CURVE,
            event: curveAbi[0], // CurveCreate event
            fromBlock,
            toBlock,
          });

          // Find the log matching our token
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: curveAbi,
                data: log.data,
                topics: log.topics,
              });

              if (decoded.eventName === 'CurveCreate') {
                const args = decoded.args as {
                  token: `0x${string}`;
                  tokenURI: string;
                };

                if (args.token.toLowerCase() === token.toLowerCase()) {
                  tokenURI = args.tokenURI;
                  break;
                }
              }
            } catch (decodeErr) {
              // Skip malformed logs
              continue;
            }
          }

          if (tokenURI) break;
        }

        if (!tokenURI) {
          tokenImageCache.set(cacheKey, null);
          setTokenImageUrl(null);
          setLoading(false);
          return;
        }

        // Handle data URI (base64 encoded JSON)
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonStr = atob(base64Data);
          const metadata: TokenMetadata = JSON.parse(jsonStr);
          const imageUrl = metadata.image || metadata.image_uri || metadata.image_url || null;
          tokenImageCache.set(cacheKey, imageUrl);
          setTokenImageUrl(imageUrl);
          setLoading(false);
          return;
        }

        // Fetch from URL via proxy
        if (tokenURI.startsWith('http')) {
          const res = await fetch(`/api/nadfun/fetch-json?url=${encodeURIComponent(tokenURI)}`);
          if (!res.ok) {
            throw new Error('Failed to fetch tokenURI metadata');
          }
          const metadata: TokenMetadata = await res.json();
          const imageUrl = metadata.image || metadata.image_uri || metadata.image_url || null;
          tokenImageCache.set(cacheKey, imageUrl);
          setTokenImageUrl(imageUrl);
          setLoading(false);
          return;
        }

        // Unknown format
        tokenImageCache.set(cacheKey, null);
        setTokenImageUrl(null);
        setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch token image';
        setError(message);
        setLoading(false);
        tokenImageCache.set(cacheKey, null);
      }
    };

    fetchTokenImage();
  }, [token, publicClient]);

  return { tokenImageUrl, loading, error };
}
