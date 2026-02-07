# Vercel Deployment Checklist

## Pre-Deployment (Completed ✅)

### Code Changes
- [x] Removed demo link from homepage (`src/app/page.tsx`)
- [x] Converted `/demo` to redirect to `/` (`src/app/demo/page.tsx`)
- [x] Converted `/stub` to 404 (`src/app/stub/page.tsx`)
- [x] Verified PostsFeed has no stub fallback (already correct)
- [x] Verified Navbar has no demo/stub links (already correct)
- [x] Verified event log hooks use 100-block chunking (already correct)

### Build Verification
- [x] `npm run build` succeeds (no TypeScript errors)
- [x] `npm run build` output shows all expected routes
- [x] No linter errors

### Local Testing
- [x] Dev server runs on port 3000
- [x] `/` loads without demo links
- [x] `/demo` redirects to `/`
- [x] `/stub` returns 404
- [x] `/bots` loads without errors

---

## Vercel Deployment Steps

### 1. Push Code to GitHub
```bash
cd /Users/nemus/clawfolio-public-push
git add web/
git commit -m "feat: production-first deployment (remove demo/stub UX)"
git push
```

### 2. Import to Vercel
- [ ] Go to https://vercel.com/new
- [ ] Import GitHub repo: `clawfolio-public-push`
- [ ] **Set Root Directory to: `web`** ⚠️ CRITICAL
- [ ] Framework: Next.js (should auto-detect)
- [ ] Do NOT click Deploy yet

### 3. Set Environment Variables
In Vercel → Project Settings → Environment Variables:

**Apply to: Production + Preview + Development** ⚠️

#### Required
```
NEXT_PUBLIC_CHAIN_ID
Value: 10143

NEXT_PUBLIC_RPC_HTTP_URL
Value: https://testnet-rpc.monad.xyz

NEXT_PUBLIC_BOT_REGISTRY
Value: 0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
```

#### Recommended
```
NEXT_PUBLIC_START_BLOCK
Value: 10841090

NEXT_PUBLIC_DEMO_CREATOR_ADDR
Value: 0xd641Fd6e02036242Da43BDa0c0fb086707EB5223
```

#### Optional (Explorer URLs - defaults work fine)
```
NEXT_PUBLIC_EXPLORER_TX_URL_PREFIX
Value: https://monadvision.com/tx/

NEXT_PUBLIC_EXPLORER_ADDRESS_URL_PREFIX
Value: https://monadvision.com/address/

NEXT_PUBLIC_EXPLORER_BLOCK_URL_PREFIX
Value: https://monadvision.com/block/
```

#### Optional (Posts Feed - only if you have OpenClaw)
```
NEXT_PUBLIC_OPENCLAW_BASE_URL
Value: <your-openclaw-url>
```

- [ ] All required env vars added
- [ ] All recommended env vars added
- [ ] Env scope set to: Production + Preview + Development

### 4. Deploy
- [ ] Click "Deploy" button
- [ ] Wait ~2-3 minutes for build
- [ ] Deployment succeeds
- [ ] Note production URL: `https://_____.vercel.app`

---

## Post-Deployment Smoke Tests

### Quick Checks (5 minutes)
On production URL:

- [ ] `/` - Loads, no config warnings, no demo/stub links
- [ ] `/bots` - Loads, no RPC errors, shows bots or empty state
- [ ] `/create` - Loads, form visible
- [ ] `/my` - Loads, "Connect wallet" prompt visible
- [ ] `/demo` - Redirects to `/`
- [ ] `/stub` - Shows 404

### Wallet-Connected Tests (10 minutes)

#### My Bots Page
- [ ] Connect wallet (injected, e.g., MetaMask/Rabby)
- [ ] Switch to Monad testnet (chainId 10143)
- [ ] Open `/my`
- [ ] Bots appear immediately (if creator)
- [ ] Can click bot to view detail

#### Bot Detail Page
- [ ] Open `/bots/1` (or your bot ID)
- [ ] Bot details load: creator, operator, paused, lifecycle, risk params
- [ ] Status chips visible
- [ ] Explorer links work
- [ ] Copy-to-clipboard buttons work

#### Write Transaction Test
On bot detail page (as creator):
- [ ] Execute 1 write action (Pause/Resume or Lifecycle change)
- [ ] Wallet prompts for signature
- [ ] Transaction submits
- [ ] Success message appears
- [ ] Transaction hash visible with explorer link
- [ ] Click explorer link → tx appears on MonadVision

#### Nad.fun Tokenization Flow (as creator)
On bot detail page:
1. [ ] Nad.fun panel visible
2. [ ] Step 1: Upload image → success
3. [ ] Step 2: Submit metadata → success
4. [ ] Step 3: Mine salt → predicted address shown
5. [ ] Step 4: Create onchain → tx succeeds, token address shown
6. [ ] Step 5: Link token → `setBotToken` tx succeeds
7. [ ] Token status updates: address visible
8. [ ] Nad.fun progress renders: market cap, graduation %
9. [ ] All tx hashes have explorer links
10. [ ] All copy-to-clipboard buttons work

---

## Acceptance Criteria (All Must Pass)

### UX
- [x] No demo/stub/judge text visible anywhere
- [x] No broken links
- [x] Clean, professional appearance

### Functionality
- [ ] All pages load without errors
- [ ] No RPC `eth_getLogs` range errors
- [ ] Wallet connection works (injected only)
- [ ] Network switching works (to chainId 10143)
- [ ] My Bots shows creator bots immediately
- [ ] Bot details display correctly
- [ ] Write transactions execute successfully
- [ ] Nad.fun tokenization works end-to-end
- [ ] Posts feed shows "No posts yet" if no OpenClaw URL set

### Technical
- [ ] No console errors
- [ ] No hydration errors
- [ ] No 404s (except `/stub` which is intentional)
- [ ] All explorer links work
- [ ] All copy buttons work
- [ ] Token status updates after tokenization
- [ ] Nad.fun progress renders after tokenization

---

## Proof Collection (For Judges/Team)

Capture screenshots/tx hashes of:

1. **Homepage** - Clean, no demo links
2. **Explore Bots** - Bot list or empty state
3. **My Bots** - Creator bots visible
4. **Bot Detail** - Full bot info display
5. **Write TX** - Transaction hash + explorer link
6. **Nad.fun Flow** - All 5 steps + final token status
7. **Explorer Links** - MonadVision pages showing txs

Transaction hashes to save:
- [ ] Create bot tx: `0x...`
- [ ] Pause/Resume tx: `0x...`
- [ ] Lifecycle change tx: `0x...`
- [ ] Nad.fun create tx: `0x...`
- [ ] setBotToken tx: `0x...`

---

## Troubleshooting

If any test fails, see `VERCEL_DEPLOY.md` troubleshooting section.

Common issues:
- **Config warnings**: Check env vars in Vercel dashboard
- **RPC errors**: Verify `NEXT_PUBLIC_START_BLOCK` is set
- **My Bots hangs**: Should be fixed (uses `getBotsByCreator` now)
- **Write TX fails**: Check wallet is connected and on correct chain
- **Nad.fun fails**: Check browser console for API errors

---

## Next Steps After Successful Deploy

1. Share production URL with team
2. Test on different browsers (Chrome, Firefox, Safari)
3. Test on mobile (MetaMask mobile, Rainbow)
4. Document any issues found
5. Consider custom domain (optional)

---

## Mainnet Migration (Future)

When ready for mainnet:
1. Deploy new BotRegistry contract on Monad mainnet
2. Update 3 env vars in Vercel:
   - `NEXT_PUBLIC_CHAIN_ID`
   - `NEXT_PUBLIC_RPC_HTTP_URL`
   - `NEXT_PUBLIC_BOT_REGISTRY`
3. Optionally update explorer URL prefixes
4. Redeploy (or auto-deploy if GitHub integration active)

**No code changes required!** The app is fully env-driven.

---

## Summary

This deployment is **production-first**:
- Real onchain interactions on Monad testnet
- Injected wallet only (no WalletConnect)
- No demo/stub artifacts in UX
- Reliable data fetching (chunked logs, direct contract calls)
- Nad.fun deep integration
- Mainnet-ready (env-only switch)

Total code changes: **3 files, minimal diffs**
- `src/app/page.tsx` (removed demo link)
- `src/app/demo/page.tsx` (redirect)
- `src/app/stub/page.tsx` (404)

Everything else was already production-ready! ✅
