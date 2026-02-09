/**
 * Token registry for Monad Testnet
 * Resolves token symbols to contract addresses
 */

import { isAddress, getAddress } from 'viem';

/**
 * Official Monad Testnet token addresses from Kuru docs
 * @see https://docs.kuru.io/contracts/Contract-addresses
 */
export const TOKEN_SYMBOL_TO_ADDRESS: Record<string, `0x${string}`> = {
  // Native MON represented as zero address (common pattern for native tokens in DEX UIs)
  'MON': '0x0000000000000000000000000000000000000000',
  
  // Kuru official testnet tokens
  'USDC': '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea',
  'kUSDC': '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', // Same as USDC
  'USDT': '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D',
  'DAK': '0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714',
  'CHOG': '0xE0590015A873bF326bd645c3E1266d4db41C4E6B',
  'YAKI': '0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50',
};

/**
 * Reverse lookup: address -> symbol (for display)
 */
export const ADDRESS_TO_SYMBOL: Record<string, string> = Object.entries(
  TOKEN_SYMBOL_TO_ADDRESS
).reduce((acc, [symbol, address]) => {
  // Normalize to lowercase for case-insensitive lookup
  const normalizedAddr = address.toLowerCase();
  // Prefer non-prefixed symbols (MON over kUSDC)
  if (!acc[normalizedAddr] || symbol.length < acc[normalizedAddr].length) {
    acc[normalizedAddr] = symbol;
  }
  return acc;
}, {} as Record<string, string>);

export interface TokenResolution {
  address: `0x${string}`;
  label: string; // Display label (e.g., "MON", "USDC", or checksummed address)
}

export interface TokenError {
  error: string;
}

export type TokenResolveResult = TokenResolution | TokenError;

/**
 * Resolve a token input (symbol or address) to a validated address
 * 
 * @param input - Token symbol (case-insensitive) or 0x address
 * @returns Resolved address + label, or error
 * 
 * @example
 * resolveTokenInput('mon')     // => { address: '0x000...000', label: 'MON' }
 * resolveTokenInput('USDC')    // => { address: '0xf817...E5Ea', label: 'USDC' }
 * resolveTokenInput('0xf817...') // => { address: '0xf817...E5Ea', label: '0xf817...E5Ea' }
 * resolveTokenInput('invalid') // => { error: 'Unknown token symbol: invalid' }
 */
export function resolveTokenInput(input: string): TokenResolveResult {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { error: 'Token input is required' };
  }

  // Case 1: Input looks like an address (starts with 0x)
  if (trimmed.startsWith('0x')) {
    if (!isAddress(trimmed)) {
      return { 
        error: 'Invalid address format. Must be a hex value of 20 bytes (40 hex characters)' 
      };
    }
    
    // Normalize to checksum format
    const checksummed = getAddress(trimmed);
    
    // Try to find a symbol for display
    const symbol = ADDRESS_TO_SYMBOL[checksummed.toLowerCase()];
    const label = symbol || checksummed;
    
    return {
      address: checksummed,
      label,
    };
  }

  // Case 2: Input is a symbol
  const upperSymbol = trimmed.toUpperCase();
  const address = TOKEN_SYMBOL_TO_ADDRESS[upperSymbol];
  
  if (!address) {
    const knownSymbols = Object.keys(TOKEN_SYMBOL_TO_ADDRESS)
      .filter(s => s !== 'kUSDC') // Don't show aliases
      .join(', ');
    return { 
      error: `Unknown token symbol: ${trimmed}. Known symbols: ${knownSymbols}` 
    };
  }

  return {
    address,
    label: upperSymbol,
  };
}

/**
 * Get a display-friendly label for an address
 */
export function getTokenLabel(address: `0x${string}`): string {
  return ADDRESS_TO_SYMBOL[address.toLowerCase()] || address;
}
