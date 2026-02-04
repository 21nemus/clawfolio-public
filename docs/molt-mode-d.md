# Molt Mode D — Specification

**Molt Mode D** is Clawfolio's social+tokenized agent operating mode for the Moltiverse Hackathon.

---

## Definition

Molt Mode D enables agents to:
1. **Post social updates** to Moltbook at lifecycle transitions
2. **Launch tokens** on Nad.fun (testnet) representing the agent
3. **Interact** with their token onchain (proof: tx hash)
4. **Remain safe** (all execution still constrained by onchain rules)

---

## Configuration

Enable via agent config:
```json
{
  "moltMode": true,
  "moltbook": {
    "handle": "@agent-handle",
    "postingEnabled": true
  },
  "token": {
    "enabled": true,
    "name": "Agent Token",
    "symbol": "AGENT"
  }
}
```

---

## Behavior in STUB_MODE (Soft Submission)

When `STUB_MODE=true` (default):
- Agent generates social outputs (introduction, strategy, updates)
- Outputs are written to `demo/out/posts/` as JSON
- **No network calls** (Moltbook, Nad.fun, Monad RPC)
- **No real token launches**
- **No real trades**

Purpose: Deterministic demo for judges without requiring credentials or network access.

---

## Behavior in Live Mode (Final Submission)

When `STUB_MODE=false` and env vars are set:
- Agent posts to Moltbook via HTTP API
- Agent launches token on Nad.fun (4-step flow + onchain create tx)
- Agent interacts with token (balance read or transfer)
- Agent executes trades onchain (constrained by RiskGuard)

---

## Social Output Stages

### Stage 1: Introduction
**Trigger**: Agent created
**Content**:
- Agent identity
- Strategy summary
- Token info (if launched)
- Capabilities

### Stage 2: Strategy Deep Dive
**Trigger**: Agent enabled for trading (Stealth mode)
**Content**:
- Full strategy disclosure
- Risk parameters
- Allowed trading pairs
- Execution model

### Stage 3: Performance Updates
**Trigger**: After significant lifecycle events (trades, token interactions)
**Content**:
- Recent actions
- Proof links (tx hashes)
- Next steps

---

## Safety Guarantees

Molt Mode D **never weakens** the security model:
- Social posts are **read-only outputs** (never inputs to execution)
- Token interactions are **optional** and **non-critical**
- All trading execution remains constrained by:
  - Remote signer validation (EIP-712)
  - Onchain RiskGuard (allowlists, caps, cooldowns)
  - BotAccount custody (funds never leave contract)

---

## Stub vs Real Mode

| Feature | Stub Mode (Default) | Real Mode (Env Vars Set) |
|---------|---------------------|--------------------------|
| Moltbook posts | JSON files | HTTP POST to API |
| Token launch | Described only | 4-step API + onchain tx |
| Token interaction | Described only | Onchain tx (balance/transfer) |
| Trade execution | Simulated | Onchain (if STUB_MODE=false) |
| Network access | None | HTTPS only |

---

## Output Format (Stub Mode)

All outputs written as JSON with schema:
```json
{
  "stub": true,
  "type": "introduction" | "strategy" | "update",
  "agent": "agent-slug",
  "content": "...",
  "timestamp": "ISO-8601",
  "stage": "draft" | "stealth" | "public" | "graduated",
  "proofAvailable": boolean,
  "proofLink": "https://..." (if available)
}
```

**Security**: Never include private keys, signatures, or full EIP-712 typedData in outputs.

---

## Hackathon Compliance (Agent + Token Track)

Molt Mode D satisfies track requirements:
- ✅ Agent works and is demonstrable
- ✅ Token launch plan documented (soft) / implemented (final)
- ✅ Agent interacts with token (final submission)
- ✅ Clear demo and documentation

---

## Future: Real Moltbook Integration

Post-hackathon, Molt Mode D can be extended with:
- **Signal reading** (agent reacts to Moltbook mentions/hashtags)
- **Engagement tracking** (reputation from likes/reposts)
- **Community coordination** (governance via token + Moltbook polls)

For now: **one-way posting only** (agent → Moltbook).
