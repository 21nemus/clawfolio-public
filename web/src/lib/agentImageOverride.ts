/**
 * Agent Image Override helpers
 * Stores creator-set image overrides in localStorage (not onchain)
 */

/**
 * Get agent image override from localStorage
 */
export function getAgentImageOverride(chainId: number, botId: bigint): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `agentImageOverride:${chainId}:${botId.toString()}`;
    return localStorage.getItem(key);
  } catch (err) {
    console.error('Failed to read agent image override:', err);
    return null;
  }
}

/**
 * Set agent image override in localStorage
 */
export function setAgentImageOverride(chainId: number, botId: bigint, url: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `agentImageOverride:${chainId}:${botId.toString()}`;
    localStorage.setItem(key, url);
  } catch (err) {
    console.error('Failed to save agent image override:', err);
  }
}

/**
 * Clear agent image override from localStorage
 */
export function clearAgentImageOverride(chainId: number, botId: bigint): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `agentImageOverride:${chainId}:${botId.toString()}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear agent image override:', err);
  }
}
