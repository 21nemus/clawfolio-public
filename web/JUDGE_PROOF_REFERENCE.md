# Judge Demo Proof - Quick Reference

## Already Completed ✅

### Bot #1 Creation
- **Bot ID**: 1
- **Bot Account**: `0x6F1DDaA07f9F09c5434D63bbA6a2a2e4F94e9C00`
- **Creator**: `0xd641Fd6e02036242Da43BDa0c0fb086707EB5223`
- **Creation Tx**: `0x941f412d13a211168b4801c7fe0cc34202c7bbfd94c502eaf7c446a4292c6a80`
- **Explorer**: https://monadvision.com/tx/0x941f412d13a211168b4801c7fe0cc34202c7bbfd94c502eaf7c446a4292c6a80
- **Status**: ✅ Deployed onchain

---

## Remaining E2E Steps

### 1. One Write Transaction (Choose One)

**Option A: Pause/Resume Bot**
- Navigate to: `http://localhost:3000/bots/1`
- Connect wallet (as creator: 0xd641...)
- Click "Pause Bot" or "Resume Bot"
- Approve transaction
- **Copy tx hash**
- Verify on MonadVision explorer

**Option B: Change Lifecycle State**
- Navigate to: `http://localhost:3000/bots/1`
- Connect wallet (as creator)
- Expand "Update Lifecycle" section
- Select new state (e.g., Draft → Stealth)
- Click "Update Lifecycle"
- Approve transaction
- **Copy tx hash**
- Verify on explorer

---

### 2. Nad.fun Tokenization Flow (5 Steps)

Navigate to: `http://localhost:3000/bots/1`
Scroll to "🪙 Tokenize on Nad.fun" section

**Step 1: Upload Image**
- Choose any PNG/JPG (ideally square, e.g., 512x512)
- Click "Upload Image"
- Wait for success ✅

**Step 2: Upload Metadata**
- **Token Name**: `ClawBot` (or any name)
- **Symbol**: `CLAW` (or any symbol)
- **Description**: `Tokenized trading agent on Monad (Clawfolio demo)`
- Leave social links empty (optional)
- Click "Upload Metadata"
- Wait for success ✅

**Step 3: Mine Salt**
- Click "Mine Salt"
- Wait for **predicted token address** to appear ✅

**Step 4: Create Token Onchain**
- **Initial Buy Amount**: `0.1` (MON) - or lower if you want
- Click "Create Token"
- Approve transaction in wallet
- **COPY THIS TX HASH** ← Important for proof!
- Wait for success
- **Copy Token Address** (displayed after success)
- **Copy Pool Address** (displayed after success)

**Step 5: Link Token to Bot**
- Click "Link Token to Bot"
- Approve `setBotToken` transaction
- **COPY THIS TX HASH** ← Important for proof!
- Page refreshes
- Verify:
  - Token status shows "Token Launched" chip
  - Nad.fun progress displays (market cap, graduation %)

---

## Judge Proof Summary (Copy this after E2E)

### Transaction Hashes Collected

**1. Bot Creation** ✅
```
Bot ID: 1
Bot Account: 0x6F1DDaA07f9F09c5434D63bbA6a2a2e4F94e9C00
Tx Hash: 0x941f412d13a211168b4801c7fe0cc34202c7bbfd94c502eaf7c446a4292c6a80
Explorer: https://monadvision.com/tx/0x941f41...6a80
```

**2. Write Transaction** (Pause/Lifecycle)
```
Action: [Pause/Resume/Lifecycle Change]
Tx Hash: [TO BE FILLED]
Explorer: https://monadvision.com/tx/[HASH]
```

**3. Nad.fun Token Creation**
```
Token Address: [TO BE FILLED]
Pool Address: [TO BE FILLED]
CurveCreate Tx: [TO BE FILLED]
Explorer: https://monadvision.com/tx/[HASH]
```

**4. Link Token to Bot**
```
Function: BotRegistry.setBotToken(1, tokenAddr, poolAddr)
Tx Hash: [TO BE FILLED]
Explorer: https://monadvision.com/tx/[HASH]
```

---

## Verification Points for Judges

### Onchain Proofs
- ✅ Bot deployed via BotRegistry contract
- ✅ Bot Account address matches emitted event
- ✅ All transactions verifiable on MonadVision explorer
- ✅ Token creation via Nad.fun contracts (BondingCurveRouter)
- ✅ Token linked to bot via `setBotToken` call

### UI Features Demonstrated
- ✅ Wallet connection (injected: MetaMask/Rabby)
- ✅ Network switching (Monad testnet, chainId 10143)
- ✅ Create bot flow with metadata
- ✅ Bot detail page with full info
- ✅ Creator-only actions (pause, lifecycle)
- ✅ Nad.fun integration (full 5-step flow)
- ✅ Real-time status updates (chips, progress bars)
- ✅ Copy-to-clipboard for hashes/addresses
- ✅ Explorer links for verification

### Technical Highlights
- 🦞 Built for Monad (400ms blocks, parallel execution)
- ⚡ Onchain execution with verifiable proofs
- 🛡️ Risk enforcement (caps, cooldowns, allowlists)
- 🪙 Social tokenization via Nad.fun
- 📊 Event timeline and activity tracking

---

## 20-Second Judge Pitch (Use during demo)

> "Clawfolio is a social launchpad for autonomous trading agents on Monad. 
> 
> Here's Bot #1 deployed onchain with configurable risk params and lifecycle states. 
> 
> [Show pause transaction] All actions execute onchain with verifiable tx hashes.
> 
> [Show Nad.fun flow] Agents can be tokenized via Nad.fun's bonding curve, creating social-financial alignment.
> 
> [Show token status] The token is now linked to the bot onchain, with real-time progress tracking via Nad.fun's Lens contract.
> 
> Everything verifiable on MonadVision explorer. Built for Monad's high-throughput parallel execution."

---

## Troubleshooting

### If something doesn't load:
- Hard refresh (Cmd+Shift+R)
- Check wallet is on Monad testnet (chainId 10143)
- Check console for errors

### If transaction fails:
- Ensure you have testnet MON for gas
- Check you're the bot creator for creator-only actions
- Wait a few seconds and retry

### If Nad.fun step fails:
- Check console for API errors
- Retry the specific step (state is preserved)
- Ensure wallet has MON for initial buy amount + gas

---

## Post-Demo Checklist

After completing E2E locally:
- [ ] Collected all 4 tx hashes
- [ ] Verified all hashes on MonadVision
- [ ] Screenshots taken (optional but nice)
- [ ] Ready for Vercel deployment
- [ ] Vercel env vars prepared
- [ ] Deploy and re-test on production URL

---

## Contact Info (If needed during judging)

- **Project**: Clawfolio
- **Deployed on**: Monad testnet (chainId 10143)
- **Contract**: BotRegistry @ 0xeAFEAc4Ae71822E574B768b7d831144ed0b060fd
- **Demo**: Available at http://localhost:3000 (local) or Vercel URL (production)

Good luck! 🚀🦞
