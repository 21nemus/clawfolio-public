# Judge E2E Run - Step-by-Step

## Setup Complete ✅
- Dev server running on: http://localhost:3000
- Config fix applied (client-side env loading)
- Explore Bots fix applied (100-block chunked log scanning)

## Your Action Items

### Step 1: Verify Pages Load Without Errors

Open in browser and verify no red error messages:
- http://localhost:3000/demo
- http://localhost:3000/bots
- http://localhost:3000/bots/0
- http://localhost:3000/create

Expected:
- No "BotRegistry not configured" warnings
- No "eth_getLogs 413 range limit" errors
- All pages render properly

### Step 2: Execute One Write Transaction

Navigate to: http://localhost:3000/bots/0

1. Click "Connect Wallet" (use injected wallet: MetaMask/Rabby/etc.)
2. Switch network to Monad testnet (chainId 10143)
3. Choose one action:
   - **Option A: Pause/Resume Bot**
     - Click "Pause Bot" or "Resume Bot" button
     - Approve transaction
   - **Option B: Change Lifecycle State**
     - Select new lifecycle state from dropdown
     - Click "Update Lifecycle"
     - Approve transaction

4. **Capture the transaction hash** (copy it)
5. Click the explorer link to verify

### Step 3: Complete Nad.fun Tokenization Flow

Still on http://localhost:3000/bots/0, scroll to "🪙 Tokenize on Nad.fun" section.

#### Step 3.1: Upload Image
- Click "Choose File" and select an image (PNG/JPG, ideally square)
- Click "Upload Image"
- Wait for success message

#### Step 3.2: Upload Metadata
- Fill in:
  - Name: (e.g., "ClawBot Token")
  - Symbol: (e.g., "CLAW")
  - Description: (short text)
- Click "Upload Metadata"
- Wait for success message

#### Step 3.3: Mine Salt
- Click "Mine Salt"
- Wait for predicted address to appear

#### Step 3.4: Create Token Onchain
- (Optional) Enter initial buy amount (e.g., "0.1" MON)
- Click "Create Token"
- Approve transaction
- **Capture the transaction hash** (copy it)
- Wait for CurveCreate event to be parsed
- Note the displayed Token Address and Pool Address

#### Step 3.5: Link Token to Bot
- Click "Link Token to Bot"
- Approve `setBotToken` transaction
- **Capture the transaction hash** (copy it)
- Page should refresh and show token is linked
- Verify Nad.fun progress is displayed (market cap, graduation %)

### Step 4: Provide Transaction Hashes

After completing the above, provide these transaction hashes:
1. **Write TX hash** (from Step 2: Pause/Resume or Lifecycle change)
2. **CurveCreate TX hash** (from Step 3.4: Create Token)
3. **setBotToken TX hash** (from Step 3.5: Link Token)

### Step 5: Verify Final State

On http://localhost:3000/bots/0, confirm:
- ✅ Token address is displayed (non-zero)
- ✅ Nad.fun progress section shows market cap and graduation %
- ✅ All status chips render correctly (Paused/Active, Lifecycle state, Token status)
- ✅ Copy buttons work for addresses and hashes

---

## Next Steps After E2E Verification

Once you've completed the above and confirmed everything works:
1. We'll prepare the Vercel deployment
2. Set the same `NEXT_PUBLIC_*` env vars in Vercel
3. Deploy to production
4. Re-run the smoke test on the deployed URL

---

## If You Encounter Issues

- **Wallet won't connect**: Make sure you're using an injected wallet (MetaMask, Rabby, Rainbow extension)
- **Wrong network**: Switch to Monad testnet (chainId 10143) in your wallet
- **Transaction fails**: Check you have testnet MON and gas
- **Nad.fun steps fail**: Check browser console for API errors
- **Page doesn't update after tx**: Hard refresh (Cmd+Shift+R)

---

**Current dev server**: http://localhost:3000
**PID**: 49873 (if you need to restart: `kill 49873` then `npm run dev`)
