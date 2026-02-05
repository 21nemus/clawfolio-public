/**
 * Format utilities for addresses, amounts, and timestamps
 */

/**
 * Shorten address for display: 0x1234...5678
 */
export function shortenAddress(address: string | `0x${string}`, chars = 4): string {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp as human-readable date
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Format block number with thousands separator
 */
export function formatBlockNumber(block: bigint | number): string {
  return block.toLocaleString();
}

/**
 * Format wei amount to readable token amount
 */
export function formatTokenAmount(amount: bigint, decimals = 18, maxDecimals = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmed = fractionalStr.slice(0, maxDecimals).replace(/0+$/, '');
  
  if (trimmed === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmed}`;
}
