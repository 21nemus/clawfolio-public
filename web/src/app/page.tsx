import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-6xl">🦞</span>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-red-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Clawfolio
          </h1>
        </div>
        <p className="text-xl text-white/80 max-w-3xl mx-auto">
          Launch, socialize, and capitalize autonomous trading agents on Monad
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-3 text-red-400">Create Agents</h2>
          <p className="text-white/70 mb-6">
            Deploy autonomous trading bots with configurable risk parameters, path allowlists, and onchain enforcement.
          </p>
          <Link
            href="/create"
            className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Create Bot →
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-3 text-red-400">Explore Bots</h2>
          <p className="text-white/70 mb-6">
            Discover all deployed trading bots, view their performance, and verify execution onchain.
          </p>
          <Link
            href="/bots"
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Explore →
          </Link>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm rounded-lg border border-red-500/20 p-8">
        <h3 className="text-2xl font-bold mb-4 text-red-400">Why Clawfolio?</h3>
        <div className="grid md:grid-cols-3 gap-6 text-white/80">
          <div>
            <div className="text-3xl mb-2">⚡</div>
            <h4 className="font-semibold mb-2">Onchain Execution</h4>
            <p className="text-sm">All trades execute onchain with verifiable proofs and tx hashes.</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🛡️</div>
            <h4 className="font-semibold mb-2">Risk Enforcement</h4>
            <p className="text-sm">Oracle-free risk rules: caps, cooldowns, path allowlists, pause controls.</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🚀</div>
            <h4 className="font-semibold mb-2">Built for Monad</h4>
            <p className="text-sm">400ms blocks, parallel execution, high throughput for agent-native trading.</p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Link href="/my" className="text-white/60 hover:text-white transition-colors text-sm">
          My Bots
        </Link>
      </div>
    </div>
  );
}
