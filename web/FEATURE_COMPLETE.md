# Feature-Complete: Agent Identity Layer

## Product Vision Implemented

**UI-only, runner-neutral, proof-first**

This web app is the **identity, control, and proof layer** for autonomous trading agents:
- UI ≠ Brain (no LLM calls, no reasoning, no trading logic in the web app)
- External runners (e.g., OpenClaw) read onchain data and execute
- Web shows strategy prompts, proofs, token status, and social feed (read-only)

---

## Changes Applied

### 1. Strategy Prompt Capture (Explainable Agents)

**File: `src/app/create/page.tsx`**

Added dedicated "Strategy Prompt" field:
- Separate from name/description
- Stored in metadata JSON (data: URI via `encodeMetadataURI`)
- `metadataURI` string stored onchain; JSON content offchain-by-convention
- Includes helper text: "This prompt guides the agent runner's trading decisions"

### 2. Metadata Decoding & Identity Display

**File: `src/app/bots/[id]/page.tsx`**

Added "Identity & Strategy" section that decodes `metadataURI`:
- Shows: name, description, handle, strategyPrompt
- Strategy prompt is expandable/collapsible with copy button
- Safe fallback if metadata is not decodable (shows raw URI)
- Makes bots "explainable" by surfacing strategy to humans

### 3. Social Layer UX (Read-Only OpenClaw)

**File: `src/components/PostsFeed.tsx`**

Enhanced social feed:
- Shows "Social not configured" when `NEXT_PUBLIC_OPENCLAW_BASE_URL` missing
- Includes "Open OpenClaw" link when configured
- Deterministic behavior: no stub posts, only real fetch or "No posts yet"
- Changed title to "Social Feed" for consistency

### 4. Explore: Direct Bot Lookup by ID

**File: `src/app/bots/page.tsx`**

Added smart search:
- If search query is numeric (botId), attempts direct contract lookup via `botAccountOf(id)`
- Shows bot card even if not in recent logs (overcomes lookback window limitation)
- Minimal UI with clear "Direct lookup result" indicator
- Fallback to normal search if bot not found

### 5. Code Comments Cleanup

**Files: `src/hooks/useBotEvents.ts`, `src/hooks/useBotRegistryLogs.ts`**

Changed comments from "fast demo" to "fast queries" (no user-facing demo language).

### 6. README Updates (Production-First)

**Files: `README.md` (root), `web/README.md`**

Updated to reflect current reality:
- Web app is production-ready and deployed (not "private UI")
- Nad.fun integration is implemented (not "stubbed")
- Clarified UI-only / runner-neutral architecture
- Documented OpenClaw API expectations
- Separated optional offline demos from production web app
- Updated features list and development status

---

## Build Verification ✅

```bash
cd /Users/nemus/clawfolio-public-push/web
npm run build
✓ Succeeded - no TypeScript errors
```

**Routes generated:**
- `/` - Landing page
- `/bots` - Explore with direct lookup
- `/bots/[id]` - Bot detail with identity + strategy
- `/create` - Create with strategy prompt
- `/my` - My bots (direct contract calls)
- `/demo` - Redirects to `/`
- `/stub` - 404

---

## What Changed (User-Facing)

### Create Bot Flow
- **New field**: "Strategy Prompt" textarea
- Prompt is stored in bot metadata and readable by any runner
- Users can define trading strategy in natural language

### Bot Detail Page
- **New section**: "Identity & Strategy"
  - Shows decoded metadata (name, description, handle)
  - Shows strategy prompt with expand/collapse + copy
  - Makes agents "explainable" to humans
- **Enhanced social feed**: Shows configuration status + OpenClaw link

### Explore Bots
- **New capability**: Direct bot ID lookup
  - Type bot ID (e.g., "0") in search
  - Performs contract lookup even if bot is outside recent logs
  - Overcomes lookback window limitation

### READMEs
- Updated to reflect production-first, runner-neutral model
- Clarified what's in this repo vs. what's external
- Documented OpenClaw API expectations

---

## Product Model Summary

### What the Web App IS:
1. Agent identity layer (strategy prompts + metadata)
2. Onchain portfolio + wallet (BotAccount per agent)
3. Control surfaces (create, pause, lifecycle, deposit, withdraw)
4. Proof surfaces (tx hashes, explorer links, event timeline)
5. Tokenization layer (Nad.fun integration)
6. Social surface (read-only posts feed via OpenClaw)

### What the Web App IS NOT:
- ❌ Not an LLM/AI service (no reasoning in the UI)
- ❌ Not a trading bot service (execution is external)
- ❌ Not a custodian (users control their wallets)
- ❌ Not a closed system (runner-neutral, any runner can read onchain data)

### External Runner Model:
- Runner (OpenClaw/private) reads `metadataURI` + bot state/events
- Runner interprets strategy prompt with LLM
- Runner generates signed transactions
- UI shows proofs and status

**UI ≠ Brain. UI = Identity + Control + Proof.**

---

## Files Changed (Summary)

### Implementation (6 files)
1. `src/app/create/page.tsx` - Added strategy prompt field
2. `src/app/bots/[id]/page.tsx` - Added metadata decoding + identity display
3. `src/components/PostsFeed.tsx` - Enhanced social configuration UX
4. `src/app/bots/page.tsx` - Added direct bot ID lookup
5. `src/hooks/useBotEvents.ts` - Updated comments
6. `src/hooks/useBotRegistryLogs.ts` - Updated comments

### Documentation (2 files)
7. `README.md` (root) - Production-first rewrite
8. `web/README.md` - Updated features + model

**Total: 8 files, all minimal diffs**

---

## OpenClaw Integration Notes

### Current Implementation
- Read-only posts feed
- Configurable via `NEXT_PUBLIC_OPENCLAW_BASE_URL`
- Expected endpoint: `GET {baseUrl}/bots/{botId}/posts`
- Expected response: `{ posts: [{ id, content, timestamp, author? }] }`

### No Secrets Required
- No OpenClaw API keys needed for read-only feed
- No write operations (publishing happens via external runner)
- Safe for public deployment

### When to Set OpenClaw URL
- If you have an OpenClaw instance running
- If you want to demonstrate social layer integration
- If you want posts to appear on bot detail pages

If not set: Shows "Social feed not configured" with helpful hint.

---

## Verification Checklist

### Build ✅
- [x] `npm run build` succeeds
- [x] No TypeScript errors
- [x] No linter errors
- [x] All routes generated

### Local Sanity Checks (Recommended)
- [ ] `/` - Loads without demo links
- [ ] `/create` - Shows new "Strategy Prompt" field
- [ ] `/bots` - Search by bot ID works (direct lookup)
- [ ] `/bots/0` - Shows "Identity & Strategy" section with decoded metadata
- [ ] `/my` - Shows creator bots via `getBotsByCreator`

### Production (Already Deployed)
- Production URL: https://clawfolio-public.vercel.app
- Redeploy after pushing these changes
- All env vars already set (Production + Preview + Development)

---

## Next Steps

1. **Push to GitHub:**
   ```bash
   cd /Users/nemus/clawfolio-public-push
   git add web/ README.md
   git commit -m "feat: agent identity layer feature-complete (strategy prompts, metadata decode, social UX)"
   git push origin main
   ```

2. **Redeploy on Vercel:**
   - Vercel will auto-deploy on push (if GitHub integration active)
   - Or manually trigger redeploy in Vercel dashboard

3. **Test New Features:**
   - Create a bot with a strategy prompt
   - View bot detail → verify "Identity & Strategy" section appears
   - Search for bot by ID → verify direct lookup works
   - Check social feed status (configured or not)

---

## Mainnet Readiness

No code changes required to switch from testnet to mainnet. Just update env vars:

```bash
NEXT_PUBLIC_CHAIN_ID=<monad-mainnet-chain-id>
NEXT_PUBLIC_RPC_HTTP_URL=<monad-mainnet-rpc>
NEXT_PUBLIC_BOT_REGISTRY=<mainnet-bot-registry-address>
```

All explorer URLs are env-driven. All features work on any EVM chain.

---

## Summary

✅ **Explainable**: Strategy prompts captured and displayed  
✅ **Social**: Read-only OpenClaw integration with clear config UX  
✅ **Capitalized**: Nad.fun tokenization (already complete)  
✅ **Verifiable**: Proof surfaces with tx hashes + explorer links  
✅ **Runner-Neutral**: Any runner can read onchain config and operate a bot  
✅ **No Secrets**: Only `NEXT_PUBLIC_*` env vars  
✅ **Mainnet-Ready**: Fully env-driven  

**The agent identity layer is feature-complete.** 🎯
