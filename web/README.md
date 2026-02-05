# Clawfolio Web UI

Production-ready web interface for Clawfolio on Monad testnet.

## Features

- **Wallet Connect**: RainbowKit integration with Monad testnet (chainId 10143)
- **Bot Explorer**: Browse all deployed trading agents with search
- **Create Bots**: Deploy new bots with configurable risk parameters
- **Bot Management**: Creator actions for pause/resume, lifecycle updates, withdrawals
- **ERC20 Deposits**: Approve + deposit flow with multi-step UX
- **Activity Feed**: Real-time event indexing from onchain logs
- **Verifiable Proofs**: All actions link to block explorer

## Quick Start

### Prerequisites

- Node.js 20+
- Wallet with Monad testnet access

### Setup

```bash
cd clawfolio-public/web
npm install
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Required:
- `NEXT_PUBLIC_CHAIN_ID`: Monad testnet chain ID (10143)
- `NEXT_PUBLIC_RPC_HTTP_URL`: Monad RPC endpoint
- `NEXT_PUBLIC_BOT_REGISTRY`: Deployed BotRegistry address

Optional:
- `NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX`: Block explorer URL prefix
- `NEXT_PUBLIC_START_BLOCK`: Start block for event indexing (reduces RPC load)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run start
```

### Deploy to Vercel

```bash
vercel
```

Set environment variables in Vercel dashboard.

## Architecture

- **Next.js App Router**: Server + client components
- **wagmi + viem**: EVM wallet connect + contract interactions
- **RainbowKit**: Beautiful wallet connection UI
- **Tailwind CSS**: Utility-first styling

## Routes

- `/` - Landing page
- `/bots` - Explorer (all bots)
- `/bots/[id]` - Bot detail with creator actions
- `/create` - Create new bot wizard
- `/my` - My bots (filtered by connected wallet)
- `/stub` - Offline stub demo explainer

## Phase 1 Scope

✅ Wallet connect + chain guard  
✅ Bot creation with EIP-712 metadata  
✅ Real-time event indexing  
✅ Creator actions (pause, lifecycle, withdraw)  
✅ ERC20 deposit/withdraw flows  
✅ Proof-oriented UX with explorer links

## Phase 2 (Not Implemented Yet)

❌ Nad.fun token launch integration  
❌ Moltbook social posting  
❌ Risk parameter updates (UI exists, not enabled)  
❌ Allowed path management (UI exists, not enabled)

## Security Notes

- No secrets in client code
- All transactions are user-wallet-signed
- Config validation with UI warnings
- Read-only mode works without wallet
- Creator-only actions are gated onchain and in UI

## Troubleshooting

### "BotRegistry address not configured"
Set `NEXT_PUBLIC_BOT_REGISTRY` in `.env`

### "Wrong network"
Switch to Monad testnet (chainId 10143) in your wallet

### "Failed to fetch logs"
Check `NEXT_PUBLIC_RPC_HTTP_URL` and ensure RPC is accessible

## Contributing

This is a hackathon project. For issues or questions, see the main repo README.
