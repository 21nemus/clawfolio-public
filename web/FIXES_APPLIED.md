# Fixes Applied - Hydration & Config Warnings

## Issues Fixed

### 1. React Hydration Error in ConfigBanner
**Problem:** ConfigBanner was causing hydration mismatches between server and client rendering.

**Solution:** Added mounted guard using `useState` + `useEffect` pattern.

**File:** `src/components/ConfigBanner.tsx`

**Changes:**
- Added `useState(false)` to track mounted state
- Added `useEffect` to set mounted=true on client
- Return `null` before mounted (prevents SSR/CSR mismatch)
- Config evaluation now only happens client-side after mount

**Result:** No more hydration errors in browser console.

---

### 2. BotRegistry Env Alias Precedence
**Problem:** 
- Placeholder `NEXT_PUBLIC_BOT_REGISTRY=0x000...000` blocked fallback to `_ADDR`
- Warning text only mentioned one env var name

**Solution:** Parse both env vars separately and use first non-null result.

**File:** `src/lib/config.ts`

**Changes:**
```typescript
// Before:
const botRegistry = parseAddress(getEnv('NEXT_PUBLIC_BOT_REGISTRY') || getEnv('NEXT_PUBLIC_BOT_REGISTRY_ADDR'));

// After:
const botRegistry = parseAddress(getEnv('NEXT_PUBLIC_BOT_REGISTRY')) || parseAddress(getEnv('NEXT_PUBLIC_BOT_REGISTRY_ADDR'));
```

**Why this works:**
- `parseAddress('0x000...000')` returns `null` (line 29-30)
- Then `||` evaluates second part: `parseAddress(getEnv('NEXT_PUBLIC_BOT_REGISTRY_ADDR'))`
- Real address from `.env.local` is now used correctly

---

### 3. Warning Text Updates
**Files Changed:**
- `src/lib/config.ts` (line 74)
- `src/app/create/page.tsx` (line 121)
- `src/app/dashboard/page.tsx` (line 55)

**Before:**
- "set NEXT_PUBLIC_BOT_REGISTRY"

**After:**
- "set NEXT_PUBLIC_BOT_REGISTRY or NEXT_PUBLIC_BOT_REGISTRY_ADDR"

---

### 4. WalletConnect Warning Removed
**File:** `src/lib/config.ts`

**Reason:** App now uses **injected wallets only** (no WalletConnect, no MetaMask SDK, no project IDs).

**Change:** Removed WalletConnect Project ID warning from `getConfigIssues()`.

---

## Environment Variables (Required)

### Minimal Setup:
```env
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_HTTP_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_BOT_REGISTRY_ADDR=0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
```

### Supported Aliases:
- `NEXT_PUBLIC_RPC_URL` → fallback for `NEXT_PUBLIC_RPC_HTTP_URL`
- `NEXT_PUBLIC_BOT_REGISTRY_ADDR` → alias for `NEXT_PUBLIC_BOT_REGISTRY`

---

## Verification Steps

1. **Build Test:**
   ```bash
   cd web
   npm run build
   ```
   Expected: ✓ Compiled successfully

2. **Dev Server:**
   ```bash
   npm run dev
   ```
   Expected: No hydration errors in console

3. **Dashboard Test:**
   - Visit: http://localhost:3000/dashboard
   - Expected: No "BotRegistry not configured" warning (if env vars set)
   - Expected: No hydration error overlay

4. **Wallet Connect & Write TX:**
   - Connect wallet via RainbowKit (injected: MetaMask/Rabby/Rainbow extension)
   - Navigate to bot detail page (e.g., `/bots/0`)
   - Execute write transaction:
     - `setPaused(true/false)` OR
     - `setLifecycleState(1/2/...)`
   - Expected: Transaction hash shown via TxLink component
   - Expected: MonadVision explorer link works

---

## Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/components/ConfigBanner.tsx` | Fix | Added mounted guard to prevent hydration errors |
| `src/lib/config.ts` | Fix | Parse both env vars separately for proper alias fallback |
| `src/lib/config.ts` | Update | Warning text mentions both env var names |
| `src/lib/config.ts` | Remove | WalletConnect warning (injected-only mode) |
| `src/app/create/page.tsx` | Update | Warning text mentions both env var names |
| `src/app/dashboard/page.tsx` | Update | Warning text mentions both env var names |

**Total files changed:** 4  
**Lines changed:** ~15

---

## Technical Notes

### Hydration Guard Pattern
The mounted guard pattern is React's recommended approach for client-only content:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

This ensures:
- Server renders `null` (no HTML mismatch)
- Client mounts component after hydration
- No SSR/CSR content difference

### Why Not `useLayoutEffect`?
`useLayoutEffect` fires before browser paint but still after hydration, so it doesn't prevent the mismatch. `useState(false)` + return null approach is the only reliable pattern.

### parseAddress() Placeholder Handling
The `parseAddress()` function (line 28-36) already treated all-zero addresses as `null`:
```typescript
if (!value || value === '0x0000000000000000000000000000000000000000') {
  return null;
}
```

By parsing each env var separately and using `||`, we leverage this existing logic to cleanly fall back.

---

## Next Steps (Optional)

If you want to test write transactions locally:
1. Ensure wallet has MON tokens on Monad testnet
2. Ensure you're connected to chainId 10143
3. Go to `/bots/0` (existing demo bot)
4. Try Pause/Resume or Lifecycle change
5. Check MonadVision for transaction confirmation

---

## Notes

- No refactors performed (minimal diffs only)
- No contract changes
- No secrets committed
- All changes backwards compatible
- `.env.local` remains gitignored
