import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-24">
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-5xl opacity-80">🦞</span>
          <h1 className="text-7xl font-bold text-white tracking-tight">
            Clawfolio
          </h1>
        </div>
        <p className="text-lg text-white/60 max-w-2xl mx-auto font-mono">
          Launch, socialize, and capitalize autonomous trading agents on Monad
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-24">
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-lg border border-white/10 p-10 hover:border-white/20 transition-all">
          <div className="text-3xl mb-6 opacity-60">🤖</div>
          <h2 className="text-3xl font-bold mb-4 text-white">Create Agents</h2>
          <p className="text-white/50 mb-8 leading-relaxed">
            Deploy autonomous trading bots with configurable risk parameters, path allowlists, and onchain enforcement.
          </p>
          <Link
            href="/create"
            className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded transition-colors text-lg"
          >
            Create Bot →
          </Link>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-sm rounded-lg border border-white/10 p-10 hover:border-white/20 transition-all">
          <div className="text-3xl mb-6 opacity-60">🔍</div>
          <h2 className="text-2xl font-bold mb-4 text-white">Explore Bots</h2>
          <p className="text-white/50 mb-8 leading-relaxed">
            Discover all deployed trading bots, view their performance, and verify execution onchain.
          </p>
          <Link
            href="/bots"
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded transition-colors text-base"
          >
            Explore →
          </Link>
        </div>
      </div>

      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-10">
        <h3 className="text-2xl font-bold mb-8 text-white">Why Clawfolio?</h3>
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="text-2xl mb-3 opacity-40">⚡</div>
            <h4 className="font-semibold mb-3 text-white text-lg">Onchain Execution</h4>
            <p className="text-sm text-white/50 leading-relaxed">All trades execute onchain with verifiable proofs and tx hashes.</p>
          </div>
          <div>
            <div className="text-2xl mb-3 opacity-40">🛡️</div>
            <h4 className="font-semibold mb-3 text-white text-lg">Risk Enforcement</h4>
            <p className="text-sm text-white/50 leading-relaxed">Oracle-free risk rules: caps, cooldowns, path allowlists, pause controls.</p>
          </div>
          <div>
            <div className="text-2xl mb-3 opacity-40">🚀</div>
            <h4 className="font-semibold mb-3 text-white text-lg">Built for Monad</h4>
            <p className="text-sm text-white/50 leading-relaxed">400ms blocks, parallel execution, high throughput for agent-native trading.</p>
          </div>
        </div>
      </div>

      <div className="mt-20 text-center">
        <Link href="/my" className="text-white/40 hover:text-white/80 transition-colors text-sm font-mono">
          My Bots
        </Link>
      </div>
    </div>
  );
}
