# Nad.fun Token Launch Integration

**Scaffolding for Agent + Token Track compliance**

---

## Purpose

Enable Clawfolio agents to launch tokens on Nad.fun (Monad testnet).

---

## Token Launch Flow

Per `https://moltiverse.dev/agents.md`, the flow is:

### Step 1: Upload Image
```bash
POST https://dev-api.nad.fun/agent/token/image
Content-Type: multipart/form-data
Body: image file

Response:
{
  "image_uri": "ipfs://..."
}
```

### Step 2: Upload Metadata
```bash
POST https://dev-api.nad.fun/agent/token/metadata
Content-Type: application/json
Body:
{
  "name": "Agent Token",
  "symbol": "AGENT",
  "description": "...",
  "image": "ipfs://...",
  "twitter": "...",
  "telegram": "...",
  "website": "..."
}

Response:
{
  "metadata_uri": "ipfs://..."
}
```

### Step 3: Mine Salt
```bash
POST https://dev-api.nad.fun/agent/salt
Content-Type: application/json
Body:
{
  "targetDigits": "7777",
  "metadataUri": "ipfs://..."
}

Response:
{
  "salt": "0x...",
  "tokenAddress": "0x...7777"
}
```

### Step 4: Create On-Chain
```solidity
// Call BondingCurveRouter.create()
function create(
    string name,
    string symbol,
    string uri,
    bytes32 salt
) external payable returns (address token, address curve)
```

**Deploy fee**: ~10 MON (check `Curve.feeConfig()[0]`)

---

## Implementation Status

### Soft Submission
- **Status**: Stubbed (described only)
- **Demo**: Script outputs a stub token launch payload
- **Real launch**: Manual via Nad.fun UI (acceptable fallback)

### Final Submission
- **Status**: To be implemented
- **Requirements**:
  - Implement 4-step API flow
  - Handle onchain create tx
  - Return token address
  - Execute agent-token interaction (proof: tx hash)

---

## Agent-Token Interaction

For Agent + Token Track compliance, agent must interact with token at least once.

### Acceptable Interactions
1. **Read balance** + post proof:
   ```solidity
   uint256 balance = IERC20(tokenAddress).balanceOf(agentAddress);
   // Post to Moltbook: "My token balance: {balance}"
   ```

2. **Minimal transfer**:
   ```solidity
   IERC20(tokenAddress).transfer(agentAddress, 1);
   // Proof: tx hash
   ```

3. **Metadata query**:
   ```solidity
   string name = IERC20Metadata(tokenAddress).name();
   // Post to Moltbook: "Token: {name}"
   ```

---

## Security

- **Keys**: Never commit deployer keys
- **Fees**: ~10 MON per token (testnet faucet: https://faucet.monad.xyz)
- **Validation**: All metadata is validated before API calls
- **Stub mode**: Default behavior (no network, no credentials)

---

## Testnet Configuration

```bash
# Monad Testnet
CHAIN_ID=10143
RPC_URL=https://testnet-rpc.monad.xyz
EXPLORER=https://monadvision.com

# Nad.fun Testnet
API_BASE=https://dev-api.nad.fun

# Contract (Mainnet reference, testnet TBD)
BONDING_CURVE_ROUTER=0x6F6B8F1a20703309951a5127c45B49b1CD981A22
```

---

## Next Steps

1. Implement HTTP client for 4-step flow
2. Add error handling and retry logic
3. Test with testnet credentials
4. Document token address in submission
