'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { monadTestnet } from '@/lib/chain';
import { loadConfig } from '@/lib/config';
import { ReactNode, useState } from 'react';

const appConfig = loadConfig();

const config = getDefaultConfig({
  appName: 'Clawfolio',
  projectId: appConfig.walletConnectProjectId || 'CLAWFOLIO_DEFAULT_ID',
  chains: [monadTestnet],
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
