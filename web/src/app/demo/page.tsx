'use client';

import { loadConfig } from '@/lib/config';
import { AddressLink } from '@/components/AddressLink';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DemoPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const config = loadConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
        🎯 Judge Demo Guide
      </h1>

      <div className="space-y-6">
        {/* Configuration Status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">⚙️ Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Chain ID:</span>
              <span className="text-white font-mono">{config.chainId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">RPC URL:</span>
              <span className="text-white font-mono text-xs">{config.rpcHttpUrl}</span>
            </div>
            {config.botRegistry ? (
              <div className="flex justify-between items-center">
                <span className="text-white/60">BotRegistry:</span>
                <AddressLink address={config.botRegistry} />
              </div>
            ) : (
              <div className="text-red-400 text-xs">⚠️ BotRegistry not configured</div>
            )}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
              <p className="text-blue-400 text-xs">
                💡 Recommended: Set <span className="font-mono">NEXT_PUBLIC_START_BLOCK=10841090</span> for faster log queries.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Flow */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">🚀 3-Minute Demo Flow</h2>
          <ol className="space-y-4 list-decimal list-inside text-white/80">
            <li>
              <span className="font-semibold">Inspect Demo Bot</span>
              <div className="ml-6 mt-2">
                <Link
                  href="/bots/0"
                  className="inline-block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                >
                  View Bot #0 →
                </Link>
                <p className="text-xs text-white/60 mt-2">
                  Check bot details, creator, operator, lifecycle state, risk params.
                </p>
              </div>
            </li>

            <li>
              <span className="font-semibold">Execute Onchain Action</span>
              <div className="ml-6 mt-2">
                <p className="text-sm text-white/60 mb-2">
                  Connect wallet (as creator) and perform one of:
                </p>
                <ul className="text-xs text-white/60 space-y-1 ml-4">
                  <li>• Pause/Resume the bot</li>
                  <li>• Change lifecycle state</li>
                  <li>• Withdraw funds (if any deposited)</li>
                </ul>
                <p className="text-xs text-white/60 mt-2">
                  ✅ Capture tx hash and show explorer link.
                </p>
              </div>
            </li>

            <li>
              <span className="font-semibold">Tokenize on Nad.fun</span>
              <div className="ml-6 mt-2">
                <p className="text-sm text-white/60 mb-2">
                  On Bot #0 detail page, scroll to "Tokenize on Nad.fun" section.
                </p>
                <p className="text-xs text-white/60">
                  Complete 5-step flow: Image → Metadata → Salt → Onchain Create → Link Token
                </p>
                <p className="text-xs text-white/60 mt-2">
                  ✅ Show CurveCreate tx hash, token address, and Nad.fun progress.
                </p>
              </div>
            </li>

            <li>
              <span className="font-semibold">Proof & Verification</span>
              <div className="ml-6 mt-2 text-xs text-white/60">
                <p>All actions display:</p>
                <ul className="space-y-1 ml-4 mt-1">
                  <li>• Transaction hash with explorer link</li>
                  <li>• Copy-to-clipboard buttons</li>
                  <li>• Status chips (Paused, Lifecycle, Token status)</li>
                  <li>• Nad.fun progress (market cap, graduation %)</li>
                </ul>
              </div>
            </li>
          </ol>
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm rounded-lg border border-red-500/20 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">🔗 Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/bots"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Explore All Bots
            </Link>
            <Link
              href="/bots/0"
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Demo Bot #0
            </Link>
            <Link
              href="/create"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Create New Bot
            </Link>
            <a
              href="https://testnet.monad.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Monad Explorer ↗
            </a>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">💡 Tips</h2>
          <ul className="space-y-2 text-sm text-white/60">
            <li>• Connect wallet with MetaMask, Rabby, or Rainbow extension (injected only)</li>
            <li>• Switch to Monad testnet (chainId 10143) in your wallet</li>
            <li>• Keep tx hashes ready for judges (copy buttons available)</li>
            <li>• Token progress loads via LENS.getProgress(token) after creation</li>
            <li>• Posts feed shows if NEXT_PUBLIC_OPENCLAW_BASE_URL is set</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
