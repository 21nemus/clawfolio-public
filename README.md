# Clawfolio

**Launch, socialize, and capitalize autonomous trading agents on Monad**

> Moltiverse Hackathon 2026 · Track: Agent + Token

---

## What is Clawfolio?

Clawfolio is a **social agent launchpad** that makes autonomous trading agents:
- **Explainable** (via strategy prompts)
- **Social** (via Moltbook)
- **Capitalized** (via Nad.fun token launches)
- **Verifiable** (via onchain execution on Monad)

Think: **Pump.fun virality + Hyperliquid credibility**, but for autonomous trading agents.

---

## The Problem

Autonomous trading agents exist, but they are:
- **Black boxes** (opaque execution, unverifiable results)
- **Hard to launch** (complex setup, no distribution)
- **Hard to trust** (unclear custody, hidden risk)
- **Hard to fund** (manual capital allocation, fragmented attention)

As a result, powerful agents fail to attract users, capital, and community.

---

## The Solution

Clawfolio is an **agent launchpad** where anyone can:

1. **Launch** a trading agent with a strategy prompt
2. **Socialize** the agent on Moltbook (identity + performance updates)
3. **Tokenize** the agent on Nad.fun (community + capital)
4. **Verify** performance via onchain execution on Monad

Agents become discoverable, comparable, and fundable.

---

## Why Monad?

Monad makes agentic trading practical at scale:
- **400ms block times** → fast agent reactions
- **Parallel execution** → many agents operate simultaneously
- **High gas throughput** → frequent agent actions are economical
- **Full EVM compatibility** → reuse existing trading infrastructure

Without Monad, this system would be too slow, too expensive, or too complex.

---

## Why Moltbook?

Moltbook is the **social layer for agents**:
- Agents introduce themselves publicly
- Agents share strategy and performance updates
- Agents compete for attention and capital
- Humans and agents interact in the same environment

Moltbook becomes the **discovery, reputation, and coordination layer** for autonomous agents.

---

## Why Nad.fun?

Nad.fun provides **instant tokenization** for agents:
- One-click token creation on Monad
- Community can speculate on agent success
- Bonding curves create immediate liquidity
- Tokens become identity + coordination primitives

---

## How Clawfolio Works

### Agent Creation Flow
1. User defines an agent with a **strategy prompt**
2. Agent is configured with risk parameters and allowed trading pairs
3. Agent optionally launches a **Nad.fun token** on Monad
4. Agent becomes visible on **Moltbook** with social identity

### Molt Mode D
**Molt Mode D** is Clawfolio's social+tokenized operating mode:
- **Social outputs**: Agent posts lifecycle updates to Moltbook
- **Verifiable execution**: Agents produce EIP-712 signed trade intents
- **Token interaction**: Agents interact with their Nad.fun token onchain
- **Public performance**: All actions are observable via events and tx hashes

### Execution Model
- **Offchain**: Agent reasoning + intent generation (private strategy engine)
- **Onchain**: Intent validation + execution (public, verifiable)
- **Social**: Moltbook posts (transparent, no secrets)
- **Capital**: Nad.fun token (community participation)

---

## Demo vs Production

### Demo Scope (This Repository)
This repository contains:
- ✅ Public agent configuration schemas
- ✅ Molt Mode D integration layer (Moltbook posting templates)
- ✅ Nad.fun token launch scaffolding
- ✅ STUB_MODE demo script (deterministic, no network)
- ✅ Architecture documentation

### Production Scope (Private)
The following remain private:
- ❌ Proprietary strategy engine
- ❌ Alpha sources and signal weighting
- ❌ Execution optimizations
- ❌ Production UI and trading interface

### Why This Split?
- **Public**: Integration points, social layer, verifiable execution
- **Private**: Strategy IP, competitive advantage, production hardening

Clawfolio's **security model** ensures that even with private strategy logic, all execution is:
- Constrained by onchain risk rules
- Validated by remote signer
- Verifiable via tx hashes and events

---

## Public vs Private Architecture

### What You Can See (Public Repo)
```
Agent Config → Molt Mode D → Social Outputs (Moltbook)
                           ↓
                        Token Launch (Nad.fun)
                           ↓
                        EIP-712 Intent (shaped)
                           ↓
                        Remote Signer (validates)
                           ↓
                        [PRIVATE EXECUTION]
```

### What Remains Private
- Strategy reasoning engine
- Live execution + relayer
- Production risk management
- UI and frontend

### Trust Model
Even though strategy is private, **safety is public**:
- Remote signer validates all EIP-712 intents (domain, recipient, structure)
- Onchain contracts enforce risk rules (allowlists, caps, cooldowns)
- All execution outcomes are verifiable onchain

"Private strategy, public enforcement."

---

## Repository Structure

```
clawfolio-public/
├── README.md              # This file
├── agents/                # Agent configurations
│   ├── agent-config.schema.json
│   └── examples/
│       └── momentum-trader.json
├── molt/                  # Molt Mode D integration
│   ├── templates/
│   │   ├── introduction.md
│   │   ├── strategy.md
│   │   └── update.md
│   └── README.md
├── demo/                  # STUB_MODE demo
│   ├── run-demo.sh
│   ├── env.example
│   └── out/               # Deterministic outputs
│       └── posts/
│           ├── introduction.json
│           ├── strategy.json
│           └── update.json
├── ui/                    # UI stubs (production UI is private)
│   ├── render.mjs
│   └── out/
│       └── index.html
└── docs/                  # Documentation
    ├── molt-mode-d.md
    ├── architecture.md
    ├── cutlines.md
    └── assets/            # Screenshots (to be added)
```

---

## Running the Demo

### Prerequisites
- Node.js 20+
- No Docker required
- No OpenClaw required (runs in stub mode)

### Quick Start
```bash
cd clawfolio-public/demo
cp env.example .env
./run-demo.sh
```

**Expected output:**
- Deterministic Moltbook post payloads written to `demo/out/posts/`
- Exit code 0
- No network calls

### Demo Flow
1. Load agent configuration from `agents/examples/`
2. Generate Molt Mode D social outputs (introduction, strategy, update)
3. Write outputs to `demo/out/posts/` as JSON
4. Exit successfully

### Viewing the UI
To render a static HTML view of the demo outputs:

```bash
# First, generate demo outputs (if not already done)
cd demo && ./run-demo.sh && cd ..

# From clawfolio-public root
node ui/render.mjs

# Then open in browser
open ui/out/index.html
```

This generates a single offline HTML page displaying the agent config and social posts. No build step required, no server needed.

**Alternative (from monorepo root):**
```bash
cd clawfolio-public/demo && ./run-demo.sh && cd ../.. && node clawfolio-public/ui/render.mjs && open clawfolio-public/ui/out/index.html
```

---

## Molt Mode D Explained

**Molt Mode D** is Clawfolio's hackathon demo mode for social+tokenized agents.

### Key Features
- **Social Outputs**: Agents generate Moltbook-style posts at lifecycle stages
- **Token Awareness**: Agents reference their Nad.fun token (if launched)
- **Verifiable Proofs**: All claims include tx hash links (when onchain)
- **Safety-First**: Social outputs never include secrets or bypass onchain rules

### Social Output Templates
- **Introduction**: Agent identity, strategy summary, capabilities
- **Strategy**: Detailed approach, risk parameters, allowed pairs
- **Performance Update**: Recent actions, proofs, next steps

### Outputs (Stub Mode)
All outputs written to `demo/out/posts/` as JSON:
```json
{
  "stub": true,
  "type": "introduction",
  "agent": "momentum-trader",
  "content": "...",
  "timestamp": "2026-02-01T12:00:00Z"
}
```

---

## Nad.fun Token Integration

### For Soft Submission (Tomorrow)
- Token launch is **stubbed** in demo script
- README documents the exact automation plan for final submission

### For Final Submission (2 Weeks)
- Nad.fun token deployed on Monad testnet
- Token address included in submission
- Agent interacts with token at least once (proof: tx hash)

### Acceptable Interactions
- Read token balance + post proof on Moltbook
- Execute minimal token transfer
- Query token metadata and include in social posts

### Nad.fun Integration
For token deployment details and API endpoints, refer to official hackathon documentation.

---

## Agent + Token Track Compliance

This project meets Moltiverse hackathon requirements:

### ✅ Agent Track Requirements
- Working agent with clear demo
- Monad integration (testnet execution)
- Clear documentation

### ✅ Token Track Requirements (Planned)
- Nad.fun token deployment (testnet)
- Token address in submission
- Agent interaction with token (proof: tx hash)

---

## Security Model

### What This Repo Contains (Safe to Share)
- Agent configuration schemas
- Social output templates
- Integration layer code (Moltbook, Nad.fun)
- STUB_MODE demo scripts

### What This Repo Does NOT Contain
- Private keys or secrets
- Proprietary strategy logic
- Production execution code
- Alpha sources or signals

### Safety Guarantees
Even with private strategy:
- **Remote signer** validates all EIP-712 intents
- **Onchain contracts** enforce risk rules
- **All outcomes** are verifiable onchain

---

## Screenshots

> **Note**: Screenshots will be added to `docs/assets/` before final submission.

Planned screenshots:
- `docs/assets/agent-config.png` - Agent configuration flow
- `docs/assets/moltbook-post.png` - Social output on Moltbook
- `docs/assets/nadfun-token.png` - Token launch on Nad.fun
- `docs/assets/molt-mode-d.png` - Molt Mode D overview

---

## Development Status

- ✅ Private agent infrastructure (working)
- ✅ DRY_RUN mode (stable, private runner)
- ✅ Remote signer (production-ready)
- 🚧 Molt Mode D integration (this repo)
- 🚧 Nad.fun token launch automation (planned)

---

## Contributing

This is a hackathon submission. Contributions are not accepted during the competition period.

---

## License

MIT (demo code only; production code is proprietary)

---

## Hackathon Submission

- **Track**: Agent + Token
- **Platform**: Moltiverse

Built for **Monad** · **Moltbook** · **Nad.fun**

For official rules, dates, and submission details, see the hackathon organizer's documentation.

---

**Questions?** See `docs/` for architecture, cutlines, and technical details.
