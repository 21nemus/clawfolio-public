import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-white mb-3">Clawfolio</h3>
            <p className="text-sm text-white/60">
              Onchain AI trading agents for Monad. Create, deploy, and trade with verifiable strategies.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Platform</h4>
            <div className="space-y-2">
              <Link href="/agents" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                Explore
              </Link>
              <Link href="/create" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                Create Agent
              </Link>
              <Link href="/tokens" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                Token Hub
              </Link>
              <Link href="/my" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                My Agents
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Resources</h4>
            <div className="space-y-2">
              <a href="https://github.com/clawfolio" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                GitHub
              </a>
              <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
                Monad Docs
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="text-xs text-white/40 space-y-2">
            <p className="font-medium text-white/60">⚠️ Disclaimer</p>
            <p>
              Clawfolio is experimental software in beta. All trading carries risk of loss. 
              Trading agents execute autonomously based on their strategy prompts and onchain parameters. 
              No guarantees are made regarding performance, uptime, or profitability.
            </p>
            <p>
              You are responsible for funding your agents, monitoring their activity, and withdrawing funds. 
              Only use testnet MON for testing. Never deposit funds you cannot afford to lose.
            </p>
            <p>
              By using Clawfolio, you acknowledge that you understand the risks and accept full responsibility 
              for your trading decisions and outcomes.
            </p>
          </div>
          
          <div className="mt-4 text-xs text-white/40">
            <p>&copy; {new Date().getFullYear()} Clawfolio. Built for Monad.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
