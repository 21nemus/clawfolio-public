# Clawfolio Architecture

**Public + Private Separation for Moltiverse Hackathon**

---

## System Overview

Clawfolio is built as a **two-tier architecture**:
- **Public tier**: Social integration, token launch, verifiable execution scaffolding
- **Private tier**: Proprietary strategy engine, live execution, production infrastructure

```
┌─────────────────────────────────────────────────────┐
│  Public Tier (This Repo)                            │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Agent Config │  │ Molt Mode D  │  │ Nad.fun   │ │
│  │   (JSON)     │─▶│  Templates   │  │ Launcher  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│         │                  │                │       │
│         └──────────────────┴────────────────┘       │
│                            │                        │
└────────────────────────────┼────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │   Integration Layer     │
                │   (EIP-712 shaping)     │
                └────────────┬────────────┘
                             │
┌────────────────────────────┼────────────────────────┐
│  Private Tier (Not in Repo)                         │
│                            │                        │
│  ┌──────────────┐  ┌───────▼────────┐  ┌─────────┐ │
│  │  Strategy    │─▶│ Agent Runner   │─▶│ Remote  │ │
│  │  Engine      │  │  (Execution)   │  │ Signer  │ │
│  └──────────────┘  └────────────────┘  └─────────┘ │
│                            │                        │
│                            ▼                        │
│                    ┌──────────────┐                 │
│                    │ BotAccount   │                 │
│                    │  (Onchain)   │                 │
│                    └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## Public Tier Components

### 1. Agent Configuration (`agents/`)
- **JSON schemas** for agent parameters
- **Example configs** with strategy prompts
- **Risk presets** mapped to onchain RiskGuard params
- **Allowed pairs** (token address arrays)

**Public**: Schema + examples  
**Private**: Strategy engine that interprets prompts

### 2. Molt Mode D Integration (`molt/`)
- **Templates** for Moltbook posts (introduction, strategy, updates)
- **Stub client** for deterministic demo outputs
- **Real client** (optional, env-gated) for HTTP posting

**Public**: Templates + client interface  
**Private**: Signal processing and decision logic

### 3. Nad.fun Token Launcher (`molt/nadfun/` - to be added)
- **4-step flow** from moltiverse.dev/agents.md
- **Stub mode**: Describes token launch without network calls
- **Real mode**: Calls Nad.fun API + onchain create tx

**Public**: API wrapper + flow orchestration  
**Private**: Capital allocation and token strategy

### 4. Demo Scripts (`demo/`)
- **run-demo.sh**: Runs in stub mode (no network)
- **env.example**: Configuration template
- **out/**: Deterministic JSON outputs

**Public**: Complete and runnable  
**Private**: None (demo is fully public)

---

## Private Tier Components (Not in This Repo)

### 1. Strategy Engine
- Interprets strategy prompts
- Processes market data
- Generates candidate trades
- **Why private**: Competitive advantage, alpha sources

### 2. Agent Runner
- Reads onchain state (BotAccount, RiskGuard)
- Decides trades offchain
- Produces EIP-712 TradeIntents
- Submits via relayer
- **Why private**: Execution optimizations, production hardening

### 3. Remote Signer
- Validates EIP-712 typedData
- Signs TradeIntents only
- Isolated in Docker container
- **Why private**: Key management, security posture

### 4. Production UI
- Agent management dashboard
- Trade monitoring
- Performance analytics
- **Why private**: UX polish, proprietary features

---

## Integration Points (Public ↔ Private)

### Agent Config → Strategy Engine
- **Public**: JSON schema + example prompts
- **Private**: Prompt parsing + strategy instantiation
- **Handoff**: Config file loaded by private runner

### Molt Mode D → Agent Runner
- **Public**: Post templates + output format
- **Private**: Lifecycle hooks trigger posting
- **Handoff**: Private runner calls public templates

### Token Launch → Nad.fun
- **Public**: API wrapper + flow scaffolding
- **Private**: Deploy keys + monitoring
- **Handoff**: Private runner triggers public launcher with credentials

---

## Trust Model

Even with private strategy logic, **all safety guarantees are public and verifiable**:

### Layer 1: Remote Signer (Public Spec, Private Deployment)
- Validates domain: `name="MonadAgentBot"`, `version="1"`, `chainId`, `verifyingContract`
- Validates recipient: `recipient == BotAccount`
- Validates structure: Exact TradeIntent field ordering
- **Rejects** anything that deviates

### Layer 2: Onchain Contracts (Public)
- `BotAccount`: Custody + execution + lifecycle gating
- `RiskGuard`: Allowlists, caps, cooldowns, deadlines
- Router calls: Only allowed routers with allowed paths

### Layer 3: Monad Consensus (Public Chain)
- All trades are publicly observable
- All tx hashes are verifiable
- All events are indexable

**Blast radius**: Even if private strategy is compromised, attacker is limited by:
- Max trade size per execution
- Cooldown between trades
- Router + path allowlists
- Emergency pause

---

## Data Flow (End-to-End)

```
1. [Public] Agent config loaded
2. [Private] Strategy engine interprets prompt
3. [Private] Strategy decides candidate trade
4. [Public] EIP-712 typedData shaped (canonical)
5. [Private] Remote signer validates + signs
6. [Private] Runner simulates (eth_call)
7. [Private] Runner submits execute tx (if DRY_RUN=false)
8. [Public] Onchain contracts validate + execute
9. [Public] Events emitted (TradeExecuted)
10. [Public] Molt Mode D generates post
11. [Public/Private] Post sent to Moltbook (stub or real)
```

---

## Determinism & Reproducibility

### Stub Mode (Default)
- All outputs are deterministic
- No network access required
- Outputs written to `demo/out/`
- Can be run repeatedly with same results

### Real Mode (Env-Gated)
- Network calls only when credentials provided
- Outputs include real tx hashes and API response IDs
- Non-deterministic (depends on chain state and API availability)

---

## Hackathon Scope

### Included (This Repo)
- ✅ Agent config schemas
- ✅ Molt Mode D templates and logic
- ✅ Nad.fun launch scaffolding
- ✅ Demo script (stub mode)
- ✅ Documentation

### Excluded (Private)
- ❌ Strategy engine implementation
- ❌ Live agent runner
- ❌ Production UI
- ❌ Deployment keys and infrastructure

### Judge Takeaway
"This repo demonstrates **integration architecture and social surface** for autonomous trading agents. The strategy engine is proprietary, but **onchain enforcement is public and verifiable**."

---

## Security Boundaries

| Component | Visibility | Trust Level |
|-----------|------------|-------------|
| Agent prompts | Public | Low (user-provided) |
| Molt templates | Public | Low (no execution impact) |
| Remote signer | Private deployment | High (validates all intents) |
| Onchain contracts | Public | Highest (immutable enforcement) |
| Strategy engine | Private | Untrusted (constrained by signer + contracts) |

---

## Next Steps (Post-Hackathon)

- Full Moltbook integration (bi-directional)
- Automated Nad.fun token launch
- Public performance leaderboards
- Multi-agent orchestration
- Governance via token holders
