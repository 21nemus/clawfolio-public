# Production-First Deployment - Ready ✅

## Changes Applied (Minimal Diffs)

### 1. Removed Demo/Stub Artifacts
**Files modified:**
- `src/app/page.tsx` - Removed "Judge Demo Guide" link from homepage
- `src/app/demo/page.tsx` - Now redirects to `/` (homepage)
- `src/app/stub/page.tsx` - Returns 404

**Result:**
- No demo/stub/judge links visible anywhere in the UI
- Users cannot access demo or stub pages
- Clean production-first UX

### 2. Verified Production-Ready Features

#### Already Correct (No Changes Needed)
- ✅ **PostsFeed** - Shows "No posts yet" if `NEXT_PUBLIC_OPENCLAW_BASE_URL` missing (no stub fallback)
- ✅ **Navbar** - No demo/stub links
- ✅ **useBotRegistryLogs** - Uses bounded 100-block chunking (no RPC range errors)
- ✅ **useBotEvents** - Uses bounded 100-block chunking (no RPC range errors)
- ✅ **Nad.fun Integration** - Phase 2 deep integration complete (image/metadata/salt/create/setBotToken)
- ✅ **Wallet Config** - Injected wallets only (no WalletConnect/MetaMask SDK)
- ✅ **Config** - Fully env-driven (chainId/RPC/explorer/BotRegistry)

---

## Local Verification (Completed)

### Build
```bash
npm run build
# ✅ Succeeded - no errors
```

### Routes Tested
- `/` - 200 ✅ (no demo/stub links visible)
- `/demo` - redirects to `/` ✅
- `/stub` - 404 ✅
- `/bots` - 200 ✅

### Dev Server
```bash
# Kill any existing dev on port 3000
lsof -ti:3000 | xargs kill -9

# Start fresh
npm run dev
# ✅ Running on http://localhost:3000
```

---

## Vercel Deployment Steps

### Step 1: Import to Vercel
1. Go to https://vercel.com/new
2. Import GitHub repo: `clawfolio-public-push`
3. **Root Directory**: `web` (IMPORTANT!)
4. Framework: Next.js (auto-detected)

### Step 2: Set Environment Variables
Apply to: **Production + Preview + Development**

**Required:**
```
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
```

**Recommended:**
```
NEXT_PUBLIC_START_BLOCK=10841090
NEXT_PUBLIC_DEMO_CREATOR_ADDR=0xd641Fd6e02036242Da43BDa0c0fb086707EB5223
```

**Optional (Explorer - defaults work):**
```
NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX=https://monadvision.com/tx/
NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX=https://monadvision.com/address/
NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX=https://monadvision.com/block/
```

**Optional (Posts Feed):**
```
NEXT_PUBLIC_OPENCLAW_BASE_URL=<your-openclaw-url>
```

### Step 3: Deploy
Click "Deploy" and wait ~2-3 minutes.

---

## Post-Deploy Acceptance Tests

On production URL (e.g., `https://your-project.vercel.app`):

### Critical Tests
1. **Homepage (/)**: No config warnings, no demo/stub links
2. **Explore Bots (/bots)**: No RPC errors, shows bots or empty state
3. **My Bots (/my)**: Connect wallet → bots appear immediately
4. **Bot Detail (/bots/1)**: Details load, can execute 1 write TX
5. **Nad.fun Flow**: Complete image → metadata → salt → create → setBotToken
6. **Removed Routes**: `/demo` redirects to `/`, `/stub` is 404

### Success Criteria
- ✅ All pages load without errors
- ✅ No "demo"/"stub"/"judge" text visible
- ✅ No RPC `eth_getLogs` range errors
- ✅ Write transactions work (pause/resume/lifecycle)
- ✅ Nad.fun tokenization works end-to-end
- ✅ Explorer links work (tx, address, block)
- ✅ Copy-to-clipboard buttons work

---

## Mainnet Readiness (Future)

**No code changes required** to switch to mainnet. Just update env vars:

```bash
# Change these 3 (+ optional explorer URLs):
NEXT_PUBLIC_CHAIN_ID=<monad-mainnet-chain-id>
NEXT_PUBLIC_RPC_HTTP_URL=<monad-mainnet-rpc>
NEXT_PUBLIC_BOT_REGISTRY=<mainnet-bot-registry-address>
```

---

## What Changed vs. Previous Demo Mode

| Aspect | Before (Demo Mode) | After (Production-First) |
|--------|-------------------|--------------------------|
| `/demo` page | Visible, judge guide | Redirects to `/` |
| `/stub` page | Offline demo content | 404 |
| Landing page | Link to demo/judge | No demo links |
| Navbar | No links (already clean) | No links (unchanged) |
| Posts feed | Already production-ready | Unchanged ✅ |
| Event logs | Already chunked | Unchanged ✅ |
| My Bots | Already uses direct calls | Unchanged ✅ |
| Nad.fun | Already integrated | Unchanged ✅ |

---

## Files Changed (Summary)

1. `src/app/page.tsx` - Removed demo link section
2. `src/app/demo/page.tsx` - Replaced with redirect
3. `src/app/stub/page.tsx` - Replaced with 404
4. `VERCEL_DEPLOY.md` - Updated for production-first
5. `PRODUCTION_READY.md` - This file (new)

**Total: 5 files, all minimal diffs.**

---

## Next Steps

1. **Push to GitHub:**
   ```bash
   cd /Users/nemus/clawfolio-public-push
   git add web/
   git commit -m "feat: production-first deployment (remove demo/stub UX)"
   git push
   ```

2. **Deploy to Vercel:**
   - Follow steps in `VERCEL_DEPLOY.md`
   - Import repo → Set root dir to `web` → Add env vars → Deploy

3. **Run Acceptance Tests:**
   - Open production URL
   - Test all pages per `VERCEL_DEPLOY.md` checklist
   - Execute 1 write TX + Nad.fun flow
   - Capture tx hashes for proof

---

## Support

See `VERCEL_DEPLOY.md` for detailed troubleshooting and deployment instructions.
