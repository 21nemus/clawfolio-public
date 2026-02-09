/**
 * BotCard wrapper with avatar resolver
 * Applies global avatar fallback policy
 */

'use client';

import { BotCard } from './BotCard';
import { BotCreatedEvent } from '@/hooks/useBotRegistryLogs';
import { useAgentAvatar } from '@/hooks/useAgentAvatar';
import { loadConfig } from '@/lib/config';

interface BotCardWithAvatarProps {
  bot: BotCreatedEvent;
  name?: string;
  handle?: string;
  metadataImage?: string;
  botToken?: `0x${string}`;
  hasToken?: boolean;
}

export function BotCardWithAvatar({
  bot,
  name,
  handle,
  metadataImage,
  botToken,
  hasToken,
}: BotCardWithAvatarProps) {
  const appConfig = loadConfig();
  
  const { avatarUrl } = useAgentAvatar({
    chainId: appConfig.chainId,
    botId: bot.botId,
    metadataImage,
    botToken,
    hasToken,
  });

  return (
    <BotCard
      bot={bot}
      name={name}
      handle={handle}
      image={avatarUrl || undefined}
      hasToken={hasToken}
    />
  );
}
