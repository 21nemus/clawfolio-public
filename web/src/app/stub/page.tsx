import Link from 'next/link';
import introductionPost from '@/stub/posts/introduction.json';
import strategyPost from '@/stub/posts/strategy.json';
import updatePost from '@/stub/posts/update.json';

const posts = [introductionPost, strategyPost, updatePost];

export default function StubPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Stub Demo</h1>
        <p className="text-white/60">Offline, deterministic demo mode</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-3 text-red-400">Rendered Demo Outputs</h2>
          <p className="text-white/70 mb-4">
            These are the deterministic stub outputs from the offline demo, rendered for judge review.
          </p>
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <div key={idx} className="bg-black/50 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-400 uppercase">{post.type}</span>
                  <span className="text-xs text-white/40">{post.timestamp}</span>
                </div>
                <div className="text-white/80 whitespace-pre-wrap text-sm">
                  {post.content}
                </div>
                {post.stub && (
                  <div className="mt-2 text-xs text-orange-400/60 flex items-center gap-1">
                    <span>🏷️</span>
                    <span>STUB MODE (no network calls)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-3 text-red-400">What is the Stub Demo?</h2>
          <p className="text-white/70 mb-4">
            The stub demo is a fully offline, deterministic simulation of Clawfolio's Molt Mode D 
            (social + token integration). It generates realistic agent outputs without requiring 
            network access, deployed contracts, or API keys.
          </p>
          <p className="text-white/70">
            This is useful for quick presentations, testing, and demonstrating the system's 
            capabilities when the live testnet is unavailable.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-3 text-red-400">Running the Stub Demo</h2>
          <p className="text-white/70 mb-4">
            The stub demo lives in the <code className="bg-white/10 px-2 py-1 rounded text-sm">clawfolio-public/demo</code> folder.
          </p>
          
          <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-2 mb-4">
            <div className="text-white/60"># From repo root:</div>
            <div className="text-red-400">cd clawfolio-public/demo</div>
            <div className="text-red-400">./run-demo.sh</div>
            <div className="text-white/60 mt-4"># Generate UI:</div>
            <div className="text-red-400">cd .. && node ui/render.mjs</div>
            <div className="text-red-400">open ui/out/index.html</div>
          </div>

          <p className="text-white/70">
            This generates deterministic JSON outputs and a standalone HTML page showcasing the agent's 
            social posts, strategy, and performance updates.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-3 text-red-400">Live vs Stub</h2>
          <div className="space-y-3 text-white/70">
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <strong className="text-white">Live (this UI):</strong> Real wallet connect, real transactions 
                on Monad testnet, actual onchain execution.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">📄</span>
              <div>
                <strong className="text-white">Stub:</strong> No network, no keys, no blockchain. Purely 
                deterministic outputs for demos and testing.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm rounded-lg border border-red-500/20 p-6">
          <h2 className="text-xl font-semibold mb-3 text-red-400">Why Keep Both?</h2>
          <p className="text-white/70">
            The stub demo serves as a <strong className="text-white">fallback</strong> when you need to 
            present the system without live testnet access. It's also useful for rapid iteration on UI 
            and messaging without waiting for transactions.
          </p>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            ← Back to Live UI
          </Link>
        </div>
      </div>
    </div>
  );
}
