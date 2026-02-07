# Vercel Deployment Guide - Production-First

## Overview

This guide covers deploying the Clawfolio Next.js app to Vercel for production use on **Monad Testnet** (chainId 10143). The deployment is configured for real onchain interactions with injected-wallet-only connection (no WalletConnect/MetaMask SDK).

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository pushed with latest code
- Local testing completed successfully

## Quick Start Commands

```bash
# Kill any existing dev server on port 3000
lsof -ti:3000 | xargs kill -9

# Verify build works locally
cd /Users/nemus/clawfolio-public-push/web
npm run build

# Start dev server
npm run dev
# Visit http://localhost:3000
```

---

## Step 1: Import GitHub Repository to Vercel

1. Go to https://vercel.com/new
2. Select **Import Git Repository**
3. Choose your GitHub repo: `clawfolio-public-push`
4. **Important**: Set **Root Directory** to `web`
   - Click "Edit" next to Root Directory
   - Enter: `web`
5. **Framework Preset**: Next.js (auto-detected)
6. **Build Command**: `npm run build` (default)
7. **Output Directory**: `.next` (default)
8. **Install Command**: `npm install` (default)

**Do NOT click Deploy yet** - we need to set environment variables first.

---

## Step 2: Configure Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add the following:

### Required Variables

```bash
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
```

### Recommended Variables

```bash
NEXT_PUBLIC_START_BLOCK=10841090
NEXT_PUBLIC_DEMO_CREATOR_ADDR=0xd641Fd6e02036242Da43BDa0c0fb086707EB5223
```

### Optional Variables (Explorer URLs - defaults are fine)

```bash
NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX=https://monadvision.com/tx/
NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX=https://monadvision.com/address/
NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX=https://monadvision.com/block/
```

### Optional (Posts Feed)

```bash
NEXT_PUBLIC_OPENCLAW_BASE_URL=<your-openclaw-url>
```
*Only set this if you have an OpenClaw instance. Otherwise, posts will show "No posts yet".*

### Important Notes

- **Environment Scope**: Set variables for **Production + Preview + Development**
  - This ensures preview deployments work correctly
  - Prevents config warnings on preview URLs
- **No quotes needed** in Vercel UI (just paste the values)
- **Do NOT set** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (app uses injected wallets only)
- **Do NOT commit** secrets like private keys

---

## Step 3: Deploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click **"Deploy"** (or **"Redeploy"** if there's a failed deployment)
3. Wait for deployment to complete (~2-3 minutes)
4. You'll get a production URL like: `https://your-project.vercel.app`

---

## Step 4: Post-Deployment Smoke Tests

Visit the following pages on your production URL and verify:

### 1. Homepage (/)
- ✅ No config warnings
- ✅ No demo/stub/judge links visible
- ✅ "Create Bot" and "Explore Bots" CTAs work
- ✅ "My Bots" link in footer

### 2. Explore Bots (/bots)
- ✅ No RPC errors (`eth_getLogs` 413 range limit should not occur)
- ✅ Shows empty state or lists bots
- ✅ Can click a bot to view details

### 3. My Bots (/my)
- ✅ Loads quickly without hanging
- ✅ Connect wallet → shows creator's bots immediately
- ✅ Uses `getBotsByCreator(address)` (not log scanning)

### 4. Create Bot (/create)
- ✅ Form loads without errors
- ✅ Can connect wallet and submit (optional test)

### 5. Bot Detail (/bots/0 or /bots/1)
- ✅ Bot details load (creator, operator, paused, lifecycle, risk params)
- ✅ Token status displays if linked
- ✅ Can execute 1 write transaction (pause/resume/lifecycle)
- ✅ Transaction hash and explorer link appear
- ✅ Copy-to-clipboard buttons work
- ✅ Nad.fun tokenization panel available (if creator)

### 6. Nad.fun Tokenization Flow (End-to-End)
On `/bots/0` (as creator):
1. Upload image → gets image URL
2. Submit metadata → gets metadata URI
3. Mine salt → gets predicted address
4. Create onchain → decode `CurveCreate` event → get token + curve addresses
5. Link token → `setBotToken(botId, token)` tx succeeds
6. Verify: `botTokenOf(0)` is non-zero
7. Verify: `LENS.getProgress(token)` renders market cap / graduation %

### 7. Removed Routes (should not be accessible)
- `/demo` → redirects to `/` ✅
- `/stub` → 404 ✅

---

## Step 5: Mainnet Readiness (Future)

The app is designed to switch from testnet to mainnet by **changing environment variables only**:

**Testnet (current):**
```bash
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
```

**Mainnet (when ready):**
```bash
NEXT_PUBLIC_CHAIN_ID=<monad-mainnet-chain-id>
NEXT_PUBLIC_RPC_HTTP_URL=<monad-mainnet-rpc>
NEXT_PUBLIC_BOT_REGISTRY=<mainnet-bot-registry-address>
NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX=<mainnet-explorer-tx-url>
NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX=<mainnet-explorer-address-url>
NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX=<mainnet-explorer-block-url>
```

**No code changes required** - the app is fully env-driven.

---

## Troubleshooting

### Build Fails
1. Check Vercel build logs for specific errors
2. Verify `npm run build` works locally
3. Ensure all dependencies are in `package.json`
4. Check TypeScript errors: `npm run build` locally

### Runtime Errors (500)
1. Check Vercel Function Logs (Deployments → Function Logs)
2. Verify env vars are set correctly (no typos)
3. Ensure env vars are set for correct environment scope

### Config Warnings Appear
1. Double-check env var names in Vercel dashboard
2. Verify values match local `.env.local`
3. Ensure env scope includes Production + Preview + Development
4. Redeploy after changing env vars

### eth_getLogs Range Errors
- Should be fixed with bounded 100-block chunking in `useBotRegistryLogs` and `useBotEvents`
- If still occurring, check browser console for details
- Verify `NEXT_PUBLIC_START_BLOCK` is set (reduces lookback window)

### /my Page Hangs or Shows "No Bots"
- Verify wallet is connected and is the creator address
- The page now uses direct contract call `getBotsByCreator(address)` (not log scanning)
- Check browser console for contract read errors

### Nad.fun Tokenization Fails
1. Verify Nad.fun API is accessible: `https://dev-api.nad.fun`
2. Check browser console for proxy route errors (`/api/nadfun/...`)
3. Ensure wallet has enough testnet funds for onchain create tx
4. Verify contract addresses in `src/lib/nadfun/constants.ts`:
   - BONDING_CURVE_ROUTER: `0x865054F0F6A288adaAc30261731361EA7E908003`
   - CURVE: `0x1228b0dc9481C11D3071E7A924B794CfB038994e`
   - LENS: `0xB056d79CA5257589692699a46623F901a3BB76f1`

---

## Production URLs

After successful deployment:
- **Production**: https://your-project.vercel.app
- **Preview** (per-branch): https://your-project-git-branch.vercel.app
- **Custom Domain** (if configured): https://yourdomain.com

---

## Environment Variables Reference (Complete Set)

Copy these exact values to Vercel for Production + Preview + Development:

```bash
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
NEXT_PUBLIC_START_BLOCK=10841090
NEXT_PUBLIC_DEMO_CREATOR_ADDR=0xd641Fd6e02036242Da43BDa0c0fb086707EB5223
NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX=https://monadvision.com/tx/
NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX=https://monadvision.com/address/
NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX=https://monadvision.com/block/
```

Optional (only if you have OpenClaw):
```bash
NEXT_PUBLIC_OPENCLAW_BASE_URL=<your-openclaw-url>
```

---

## Acceptance Criteria

Before considering deployment complete:

- [ ] Production URL accessible
- [ ] No config warnings on any page
- [ ] No demo/stub/judge links visible
- [ ] `/bots` loads without RPC errors
- [ ] `/my` shows creator bots immediately when wallet connected
- [ ] `/bots/1` (or any bot detail) displays correctly
- [ ] Can execute 1 write transaction (pause/resume/lifecycle) and see tx hash + explorer link
- [ ] Nad.fun tokenization flow works end-to-end
- [ ] `botTokenOf(botId)` is non-zero after tokenization
- [ ] `LENS.getProgress(token)` renders market cap/graduation %
- [ ] No console errors in browser
- [ ] All explorer links work (tx, address, block)
- [ ] Copy-to-clipboard buttons work

---

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment Guide: https://nextjs.org/docs/deployment
- Monad Testnet Explorer: https://monadvision.com
- Nad.fun API Docs: https://nad.fun/create.md

---

## Summary

This deployment is **production-first**:
- Real onchain reads/writes on Monad testnet
- Injected wallet only (no WalletConnect)
- No demo/stub/judge artifacts in UX
- Reliable event log fetching (100-block chunking)
- Direct contract calls for "My Bots" page
- Nad.fun deep integration (Phase 2)
- Mainnet-ready (env-only switch)

All changes are minimal diffs with no refactoring.
