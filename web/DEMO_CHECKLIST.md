# Clawfolio Live Demo Checklist

## Environment Variables

Create `/Users/nemus/clawfolio-public-push/web/.env.local` with:

```bash
# Required
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd

# Recommended (for faster log queries)
NEXT_PUBLIC_START_BLOCK=10841090

# Optional (for demo bot display)
NEXT_PUBLIC_DEMO_CREATOR_ADDR=0xd641Fd6e02036242Da43BDa0c0fb086707EB5223

# Optional (for posts feed integration)
# NEXT_PUBLIC_OPENCLAW_BASE_URL=

# NOTE: No WalletConnect Project ID needed (injected-wallet-only mode)
```

## Quick Start

```bash
cd /Users/nemus/clawfolio-public-push/web
npm install
npm run build
npm run dev
```

Open http://localhost:3000

## Judge Demo Flow (3 Minutes)

### 1. Configuration Check
- Visit `/demo` page
- Verify chainId, RPC, BotRegistry displayed
- Confirm no configuration warnings

### 2. Inspect Demo Bot
- Click link to Bot #0 or navigate to `/bots/0`
- Review:
  - Creator address
  - Operator address
  - Lifecycle state
  - Paused status
  - Risk params (max trade size, cooldown)
  - Metadata URI

### 3. Execute Onchain Action
- Connect wallet (injected: MetaMask/Rabby/Rainbow extension)
- Switch to Monad testnet (chainId 10143)
- As creator, perform one action:
  - **Pause/Resume**: Toggle bot pause state
  - **Update Lifecycle**: Change lifecycle state (Draft → Stealth → Public → Graduated → Retired)
  - **Withdraw**: Withdraw funds (if deposited)
- Capture transaction hash
- Show explorer link (click to verify)

### 4. Tokenize on Nad.fun (5-Step Flow)

On Bot #0 detail page, scroll to "🪙 Tokenize on Nad.fun" panel.

**Step 1: Upload Image**
- Select image file
- Upload → receive `image_uri`

**Step 2: Upload Metadata**
- Enter: Name, Symbol, Description
- Optional: Website, Twitter, Telegram
- Upload → receive `metadata_uri`

**Step 3: Mine Salt**
- Click "Mine Salt"
- Receive `salt` and predicted token address

**Step 4: Onchain Create**
- Optional: Enter initial buy amount (MON, e.g. "0.1")
- Click "Create Token"
- Approve transaction (deploy fee + initial buy)
- Capture tx hash
- Show CurveCreate event parsed from receipt
- Display: Token address, Pool address

**Step 5: Link Token to Bot**
- Click "Link Token to Bot"
- Approve `BotRegistry.setBotToken(botId, token, pool)` tx
- Capture tx hash
- Page auto-refreshes, token now linked

### 5. Proof & Verification

All actions display:
- ✅ Transaction hash with explorer link
- 📋 Copy-to-clipboard buttons for addresses/hashes
- 🏷️ Status chips (Paused, Lifecycle label, Token status)
- 📊 Nad.fun progress: Market cap, graduation %
- 🔗 Links to Nad.fun token page

## Key Features Implemented

### A) Live-First UI
- ✅ Removed "Stub Demo" from navbar
- ✅ Removed stub demo CTA from landing page
- ✅ `/stub` route still accessible (not promoted)

### B) Wallet: Injected Only
- ✅ RainbowKit UI with injected connector only
- ✅ No WalletConnect (no project ID required)
- ✅ No MetaMask SDK
- ✅ App runs without wallet service env vars

### C) Nad.fun Deep Integration
- ✅ Constants, ABIs, client helpers (`/src/lib/nadfun/`)
- ✅ Proxy API routes (`/api/nadfun/{image,metadata,salt}`)
- ✅ Tokenize panel with 5-step stepper on bot detail page
- ✅ CurveCreate event parsing
- ✅ BotRegistry.setBotToken integration
- ✅ LENS.getProgress for token status

### D) Posts Feed
- ✅ Read-only component
- ✅ Fetches from `NEXT_PUBLIC_OPENCLAW_BASE_URL` if set
- ✅ Shows empty state if not configured or no posts

### E) Judge Flow Page
- ✅ `/demo` page with configuration status
- ✅ Quick links to Bot #0, create, explorer
- ✅ Step-by-step judge script
- ✅ Tips for wallet connection and testnet setup

### F) Config Consistency
- ✅ All config reads use `loadConfig()`
- ✅ Env var alias support (NEXT_PUBLIC_BOT_REGISTRY / NEXT_PUBLIC_BOT_REGISTRY_ADDR)
- ✅ Placeholder-aware parsing
- ✅ Informative warnings

## Build Verification

```bash
cd /Users/nemus/clawfolio-public-push/web
rm -rf node_modules .next package-lock.json
npm install
npm run build  # ✅ Exit code 0
```

**Result**: ✅ Build successful with 0 errors, 0 warnings, 0 vulnerabilities

## Routes Overview

- `/` - Landing page
- `/bots` - Explore all bots
- `/bots/[id]` - Bot detail with tokenization
- `/create` - Create new bot
- `/my` - User's bots
- `/dashboard` - Read-only dashboard (botCount, creator bots)
- `/demo` - Judge demo guide
- `/stub` - Stub demo (hidden from nav)

## Nad.fun Testnet Constants

Per https://nad.fun/create.md + https://nad.fun/abi.md:

```typescript
API_BASE = https://dev-api.nad.fun
BONDING_CURVE_ROUTER = 0x865054F0F6A288adaAc30261731361EA7E908003
CURVE = 0x1228b0dc9481C11D3071E7A924B794CfB038994e
LENS = 0xB056d79CA5257589692699a46623F901a3BB76f1
```

Proxy API routes forward to:
- `POST ${API_BASE}/agent/token/image` (raw bytes, Content-Type: image/*)
- `POST ${API_BASE}/agent/token/metadata` (JSON)
- `POST ${API_BASE}/agent/salt` (JSON)

## Deployment Notes

**Vercel:**
1. Deploy `/Users/nemus/clawfolio-public-push/web`
2. Set environment variables in Vercel dashboard (use `.env.example` as template)
3. Verify deployed URL works: check `/demo`, connect wallet, test one write tx

**Local Testing:**
- Use injected wallet (MetaMask/Rabby/Rainbow extension)
- Ensure wallet is on Monad testnet (chainId 10143)
- Creator address must match to see Creator Actions and Tokenize panel

## Troubleshooting

**"BotRegistry not configured" warning:**
- Check `.env.local` has `NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd`
- Restart dev server

**Wallet not connecting:**
- Ensure using injected provider (not WalletConnect)
- Switch to Monad testnet in wallet
- Refresh page

**Token progress not loading:**
- Click "Load Progress" button after tokenization
- Requires token to be non-zero address

**Posts feed empty:**
- Normal if `NEXT_PUBLIC_OPENCLAW_BASE_URL` not set
- No stub posts shown by default

## Success Criteria ✅

- [x] Stub demo hidden from navigation
- [x] Wallet connects via injected provider only
- [x] Nad.fun tokenization flow (5 steps) works end-to-end
- [x] CurveCreate event parsed correctly
- [x] BotRegistry.setBotToken links token to bot
- [x] All tx hashes have explorer links
- [x] Copy-to-clipboard buttons work
- [x] Token progress displays via LENS.getProgress
- [x] Posts feed integrates with NEXT_PUBLIC_OPENCLAW_BASE_URL
- [x] `/demo` judge flow page complete
- [x] Clean build with 0 errors

---

**Last Updated**: 2026-02-06
**Build Status**: ✅ Passing
**Deployment Ready**: ✅ Yes
