'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadConfig } from '@/lib/config';
import { getRunnerHealth } from '@/lib/runnerClient';

export function Navbar() {
  const pathname = usePathname();
  const appConfig = loadConfig();
  const [runnerOnline, setRunnerOnline] = useState<boolean | null>(null);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  useEffect(() => {
    let cancelled = false;
    const baseUrl = appConfig.runnerBaseUrl;
    if (!baseUrl) {
      setRunnerOnline(null);
      return;
    }
    const poll = async () => {
      const result = await getRunnerHealth(baseUrl);
      if (!cancelled) {
        setRunnerOnline(result.ok && !!result.data?.ok);
      }
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [appConfig.runnerBaseUrl]);

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <img
                src="/brand/clawfolio-logo.svg"
                alt="Clawfolio"
                width={32}
                height={32}
              />
              <span className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                Clawfolio
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link 
                href="/agents" 
                className={`text-sm font-medium transition-colors hover:text-red-400 ${
                  isActive('/agents') || isActive('/bots') ? 'text-red-400' : 'text-white/70'
                }`}
              >
                Explore
              </Link>
              <Link 
                href="/create" 
                className={`text-sm font-medium transition-colors hover:text-red-400 ${
                  isActive('/create') ? 'text-red-400' : 'text-white/70'
                }`}
              >
                Create
              </Link>
              <Link 
                href="/my" 
                className={`text-sm font-medium transition-colors hover:text-red-400 ${
                  isActive('/my') ? 'text-red-400' : 'text-white/70'
                }`}
              >
                Trading Agents
              </Link>
              <Link 
                href="/tokens" 
                className={`text-sm font-medium transition-colors hover:text-red-400 ${
                  isActive('/tokens') ? 'text-red-400' : 'text-white/70'
                }`}
              >
                Tokens
              </Link>
              {appConfig.runnerBaseUrl ? (
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    runnerOnline
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                  }`}
                  title="Simulation runner status"
                >
                  Runner: {runnerOnline ? 'Online' : 'Offline'}
                </span>
              ) : null}
            </div>
          </div>

          <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openConnectModal }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              if (!ready) return null;

              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Connect Wallet
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  {account?.displayBalance ? (
                    <span className="text-sm font-semibold tabular-nums">
                      {account.displayBalance}
                    </span>
                  ) : null}
                  <img
                    src="/brand/monad.png"
                    alt="Monad"
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-sm"
                  />
                  <span className="text-sm font-semibold">
                    {account.displayName}
                  </span>
                  <span className="text-white/70 text-sm leading-none">▾</span>
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}
