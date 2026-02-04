# Molt Mode D — Integration Layer

This directory contains the **Molt Mode D** integration layer for Clawfolio agents.

---

## Purpose

Enable agents to:
1. Post social updates to Moltbook
2. Launch tokens on Nad.fun
3. Interact with tokens onchain
4. Remain safe (no execution bypass)

---

## Structure

```
molt/
├── templates/          # Moltbook post templates
│   ├── introduction.md
│   ├── strategy.md
│   └── update.md
├── nadfun/            # Nad.fun token launch (to be implemented)
│   └── README.md
└── README.md          # This file
```

---

## Moltbook Templates

Templates define **what agents post** at each lifecycle stage:
- **Introduction**: Agent identity, strategy summary, capabilities
- **Strategy**: Detailed disclosure, risk params, allowed pairs
- **Update**: Recent actions, proofs, next steps

### Template Variables
- `{agentName}`: Agent display name
- `{strategyPrompt}`: Strategy description
- `{tokenSymbol}`: Nad.fun token ticker
- `{tokenAddress}`: Token contract address
- `{stage}`: Current lifecycle (draft, stealth, public, graduated)
- `{recentAction}`: Last significant event
- `{proofLink}`: Tx hash link (if available)

### Output Format (Stub Mode)
```json
{
  "stub": true,
  "type": "introduction",
  "agent": "agent-slug",
  "content": "Post content...",
  "timestamp": "2026-02-01T12:00:00Z"
}
```

---

## Nad.fun Integration

### Token Launch Flow (4 Steps)
Per `https://moltiverse.dev/agents.md`:
1. Upload image → `POST /agent/token/image` → `image_uri`
2. Upload metadata → `POST /agent/token/metadata` → `metadata_uri`
3. Mine salt → `POST /agent/salt` → `salt` + vanity address
4. Create onchain → Call `BondingCurveRouter.create(...)`

### Stub Mode (Soft Submission)
- Token launch is **described** only
- No network calls
- No credentials required

### Real Mode (Final Submission)
- Execute all 4 steps via Nad.fun API
- Deploy token on Monad testnet
- Include token address in submission

---

## Security

### Safe by Default
- **No secrets in code**: All credentials via env vars only
- **No network by default**: Stub mode is default
- **No execution bypass**: Social outputs are read-only

### Validation
Before posting or launching:
- Templates are static (no user input injection)
- Token metadata is validated (schema)
- No private keys or signatures in outputs

---

## Usage

### Soft Submission (Stub Mode)
```bash
cd ../demo
./run-demo.sh
# Outputs written to demo/out/posts/*.json
```

### Final Submission (Real Mode)
```bash
cd ../demo
cp env.example .env
# Edit .env with real credentials
STUB_MODE=false ./run-demo.sh
# Outputs include real API responses + tx hashes
```

---

## API References

- **Moltbook**: https://moltbook.com/skill.md
- **Nad.fun Testnet**: https://dev-api.nad.fun
- **Nad.fun Token Creation**: https://nad.fun/create.md
- **Moltiverse Agents**: https://moltiverse.dev/agents.md

---

## Next Steps

1. Implement Moltbook HTTP client (real mode)
2. Implement Nad.fun 4-step launcher
3. Add agent-token interaction logic
4. Test with real testnet credentials
