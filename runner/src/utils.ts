import { formatUnits } from 'viem';

/**
 * Format a bigint amount with decimals, limiting to maxDecimals
 */
export function formatAmount(amount: bigint, decimals: number, maxDecimals: number = 4): string {
  const formatted = formatUnits(amount, decimals);
  const [whole, fraction] = formatted.split('.');
  
  if (!fraction) return whole;
  
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

/**
 * Deduplicate events by txHash + logIndex
 */
export function deduplicateEvents<T extends { transactionHash: string; logIndex: number }>(
  events: T[]
): T[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.transactionHash}-${event.logIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Simple exponential backoff retry
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}

/**
 * Decode data:application/json;base64 metadata URI
 */
export function decodeMetadataURI(uri: string): Record<string, unknown> | null {
  try {
    if (uri.startsWith('data:application/json;base64,')) {
      const base64 = uri.replace('data:application/json;base64,', '');
      const json = Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(json);
    }
    return null;
  } catch (error) {
    console.error('Failed to decode metadata URI:', error);
    return null;
  }
}
