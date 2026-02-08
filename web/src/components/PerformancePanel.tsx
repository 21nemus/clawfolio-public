'use client';

import { useState, useEffect } from 'react';
import { BotEvent } from '@/hooks/useBotEvents';
import { analyzeEvents } from '@/lib/perf/analytics';
import { publicClient } from '@/lib/clients';
import { ERC20ABI } from '@/abi/ERC20';
import { formatTokenAmount, shortenAddress } from '@/lib/format';
import { AddressLink } from './AddressLink';
import { TxLink } from './TxLink';

interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
}

interface PerformancePanelProps {
  botAccount: `0x${string}`;
  events: BotEvent[];
  explorerAddressUrlPrefix: string;
}

export function PerformancePanel({ botAccount, events, explorerAddressUrlPrefix }: PerformancePanelProps) {
  const [nativeBalance, setNativeBalance] = useState<bigint | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const analytics = analyzeEvents(events);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b5d49497-3c0d-4821-bca6-8ae27b698a6c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'debug1',
        hypothesisId: 'H2',
        location: 'web/src/components/PerformancePanel.tsx:35',
        message: 'PerformancePanel mounted',
        data: {
          botAccount,
          eventsCount: events.length,
          uniqueTokensCount: analytics.uniqueTokens.size,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const fetchBalances = async () => {
      try {
        setLoading(true);

        // Fetch native MON balance
        const native = await publicClient.getBalance({ address: botAccount });
        setNativeBalance(native);

        // Fetch ERC20 balances for unique tokens
        const tokenAddresses = Array.from(analytics.uniqueTokens);
        
        if (tokenAddresses.length === 0) {
          setTokenBalances([]);
          return;
        }

        const balancePromises = tokenAddresses.map(async (tokenAddr) => {
          try {
            const [balance, symbol, decimals] = await Promise.all([
              publicClient.readContract({
                address: tokenAddr as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'balanceOf',
                args: [botAccount],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: tokenAddr as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'symbol',
              }).catch(() => shortenAddress(tokenAddr, 4)) as Promise<string>,
              publicClient.readContract({
                address: tokenAddr as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'decimals',
              }).catch(() => 18) as Promise<number>,
            ]);

            return {
              address: tokenAddr,
              symbol,
              decimals,
              balance,
            };
          } catch (err) {
            console.error(`Failed to fetch balance for ${tokenAddr}:`, err);
            return {
              address: tokenAddr,
              symbol: shortenAddress(tokenAddr, 4),
              decimals: 18,
              balance: 0n,
            };
          }
        });

        const balances = await Promise.all(balancePromises);
        setTokenBalances(balances);

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/b5d49497-3c0d-4821-bca6-8ae27b698a6c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'debug1',
            hypothesisId: 'H2',
            location: 'web/src/components/PerformancePanel.tsx:92',
            message: 'PerformancePanel balances fetched',
            data: {
              tokenAddressesCount: tokenAddresses.length,
              nonZeroBalancesCount: balances.filter((b) => b.balance > 0n).length,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (err) {
        console.error('Failed to fetch balances:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [botAccount, analytics.uniqueTokens]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-4 text-red-400">📊 Performance Dashboard</h3>

      {loading && (
        <p className="text-white/60 text-sm">Loading portfolio data...</p>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Portfolio Snapshot */}
          <div>
            <h4 className="text-md font-semibold text-white mb-3">Portfolio Snapshot</h4>
            <div className="space-y-2">
              {/* Native MON */}
              <div className="flex items-center justify-between bg-white/5 rounded p-3">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">MON (native)</span>
                </div>
                <span className="text-white/80 font-mono">
                  {nativeBalance !== null ? formatTokenAmount(nativeBalance) : '...'}
                </span>
              </div>

              {/* ERC20 tokens */}
              {tokenBalances.map((token) => (
                <div key={token.address} className="flex items-center justify-between bg-white/5 rounded p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{token.symbol}</span>
                    <AddressLink address={token.address as `0x${string}`} />
                  </div>
                  <span className="text-white/80 font-mono">
                    {formatTokenAmount(token.balance, token.decimals)}
                  </span>
                </div>
              ))}

              {tokenBalances.length === 0 && nativeBalance === 0n && (
                <p className="text-white/40 text-sm">No tokens in portfolio yet</p>
              )}
            </div>
          </div>

          {/* Net Flows */}
          {Object.keys(analytics.netFlowsByToken).length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-white mb-3">Net Flows (Deposits - Withdrawals)</h4>
              <div className="space-y-2">
                {Object.entries(analytics.netFlowsByToken).map(([tokenAddr, netFlow]) => {
                  const tokenInfo = tokenBalances.find((t) => t.address.toLowerCase() === tokenAddr);
                  const symbol = tokenInfo?.symbol || shortenAddress(tokenAddr, 4);
                  const decimals = tokenInfo?.decimals || 18;
                  const isPositive = netFlow > 0n;
                  const isZero = netFlow === 0n;

                  return (
                    <div key={tokenAddr} className="flex items-center justify-between bg-white/5 rounded p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{symbol}</span>
                        <AddressLink address={tokenAddr as `0x${string}`} />
                      </div>
                      <span className={`font-mono ${isZero ? 'text-white/60' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{formatTokenAmount(netFlow, decimals)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trading Summary */}
          <div>
            <h4 className="text-md font-semibold text-white mb-3">Trading Summary</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total Trades</span>
                <span className="text-white font-semibold">{analytics.tradeStats.tradeCount}</span>
              </div>

              {analytics.tradeStats.lastTrade && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Last Trade</span>
                  <TxLink hash={analytics.tradeStats.lastTrade.transactionHash} />
                </div>
              )}

              {analytics.tradeStats.tradeCount === 0 && (
                <p className="text-white/40 text-sm">No trades executed yet</p>
              )}

              {/* Top trading paths */}
              {Object.keys(analytics.tradeStats.volumeByPath).length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-white/60 mb-2">Trading Paths</div>
                  <div className="space-y-2">
                    {Object.entries(analytics.tradeStats.volumeByPath)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 5)
                      .map(([path, stats]) => (
                        <div key={path} className="bg-white/5 rounded p-2 text-sm">
                          <div className="text-white/80 font-mono text-xs mb-1 break-all">
                            {path.split(' > ').map((addr, idx, arr) => (
                              <span key={idx}>
                                {shortenAddress(addr, 4)}
                                {idx < arr.length - 1 && <span className="text-white/40"> → </span>}
                              </span>
                            ))}
                          </div>
                          <div className="text-white/60 text-xs">
                            {stats.count} trade{stats.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Volume breakdown by token */}
              {Object.keys(analytics.tradeStats.volumeInByToken).length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-white/60 mb-2">Volume Traded</div>
                  <div className="space-y-2">
                    {Array.from(
                      new Set([
                        ...Object.keys(analytics.tradeStats.volumeInByToken),
                        ...Object.keys(analytics.tradeStats.volumeOutByToken),
                      ])
                    ).map((tokenAddr) => {
                      const tokenInfo = tokenBalances.find((t) => t.address.toLowerCase() === tokenAddr);
                      const symbol = tokenInfo?.symbol || shortenAddress(tokenAddr, 4);
                      const decimals = tokenInfo?.decimals || 18;
                      const volumeIn = analytics.tradeStats.volumeInByToken[tokenAddr] || 0n;
                      const volumeOut = analytics.tradeStats.volumeOutByToken[tokenAddr] || 0n;

                      return (
                        <div key={tokenAddr} className="bg-white/5 rounded p-2 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{symbol}</span>
                            <AddressLink address={tokenAddr as `0x${string}`} />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">
                              In: {formatTokenAmount(volumeIn, decimals)}
                            </span>
                            <span className="text-white/60">
                              Out: {formatTokenAmount(volumeOut, decimals)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
