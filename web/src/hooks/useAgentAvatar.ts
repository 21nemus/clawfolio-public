/**
 * Shared hook for resolving agent avatar with fallback policy:
 * displayedAvatar = localOverride > onchainMetadataImage > tokenImage > null
 */

import { useState } from 'react';
import { getAgentImageOverride } from '@/lib/agentImageOverride';
import { useNadfunTokenImage } from './useNadfunTokenImage';

interface UseAgentAvatarOptions {
  chainId: number;
  botId: bigint;
  metadataImage?: string | null;
  botToken?: `0x${string}`;
  hasToken?: boolean;
  disableLocalOverride?: boolean;
}

export function useAgentAvatar({
  chainId,
  botId,
  metadataImage,
  botToken,
  hasToken,
  disableLocalOverride = false,
}: UseAgentAvatarOptions) {
  // Initialize override directly from localStorage (runs once on mount)
  const [localOverride, setLocalOverride] = useState<string | null>(() => {
    if (disableLocalOverride) return null;
    return getAgentImageOverride(chainId, botId);
  });

  // Only attempt token fallback if:
  // - bot hasToken true
  // - no override (or override disabled)
  // - no metadataImage
  const shouldFetchTokenImage = hasToken && !localOverride && !metadataImage && botToken;
  const { tokenImageUrl } = useNadfunTokenImage(shouldFetchTokenImage ? botToken : undefined);

  // Return first available in priority order
  const avatarUrl = localOverride || metadataImage || tokenImageUrl || null;

  return {
    avatarUrl,
    hasOverride: !!localOverride,
    refreshOverride: () => {
      const override = getAgentImageOverride(chainId, botId);
      setLocalOverride(override);
    },
  };
}
