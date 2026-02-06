'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">🦞</span>
              <span className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                Clawfolio
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link 
                href="/bots" 
                className={`text-sm font-medium transition-colors hover:text-red-400 ${
                  isActive('/bots') ? 'text-red-400' : 'text-white/70'
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
                My Bots
              </Link>
            </div>
          </div>

          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
