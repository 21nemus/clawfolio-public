'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { injected } from 'wagmi/connectors';
import { monadTestnet } from '@/lib/chain';
import { loadConfig } from '@/lib/config';
import { ReactNode, useState } from 'react';

const appConfig = loadConfig();

const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(appConfig.rpcHttpUrl),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={({ size }) => (
            <img
              src="/brand/monad.png"
              alt="Monad"
              width={size}
              height={size}
              style={{ borderRadius: 9999 }}
            />
          )}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
