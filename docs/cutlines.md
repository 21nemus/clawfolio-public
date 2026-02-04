# Submission Cutlines

**Soft Submission vs Final Submission scope definition**

---

## Soft Submission (Tomorrow)

### Goal
Demonstrate **Molt Mode D concept** with deterministic, runnable demo.

### Deliverables
- ✅ Complete README.md
- ✅ Agent config schema + example
- ✅ Molt Mode D templates (introduction, strategy, update)
- ✅ Demo script (`demo/run-demo.sh`)
- ✅ Deterministic stub outputs in `demo/out/posts/`
- ✅ Documentation (architecture, molt-mode-d, cutlines)

### Demo Flow
1. Run `demo/run-demo.sh`
2. Script loads `agents/examples/momentum-trader.json`
3. Script generates 3 Moltbook post payloads
4. Outputs written to `demo/out/posts/*.json`
5. Exit code 0

**No network calls. No credentials required. Fully reproducible.**

### Token Launch (Soft)
- Token launch is **described** in README and agent config
- Demo script generates a stub token launch payload
- Exact automation plan documented for final submission

**Acceptable fallback**: Manual token deployment via Nad.fun UI, documented in README.

### Success Criteria
- `demo/run-demo.sh` runs successfully
- All outputs are deterministic and valid JSON
- README clearly explains public/private split
- Architecture docs explain trust model

---

## Final Submission (2 Weeks)

### Goal
Extend stub mode to **real mode** with network integration.

### Additional Deliverables
- ✅ Moltbook HTTP client (real API posting)
- ✅ Nad.fun token launch automation (4-step flow + onchain tx)
- ✅ Agent token interaction (at least one onchain proof)
- ✅ Screenshots in `docs/assets/`

### Demo Flow (Real Mode)
1. Set env vars (`MOLTBOOK_API_KEY`, `NADFUN_DEPLOYER_KEY`, `MONAD_RPC_URL`)
2. Run `demo/run-demo.sh`
3. Script posts to real Moltbook
4. Script deploys token on Nad.fun testnet
5. Script executes token interaction (balance read or transfer)
6. All actions include proof links (tx hashes)

### Token Launch (Final)
**Required**:
- Token deployed on Monad testnet via Nad.fun
- Token address included in submission
- Agent interacts with token at least once (tx hash proof)

**Acceptable interactions**:
- Read token balance + post proof on Moltbook
- Execute minimal token transfer (e.g., send 1 token to self)
- Query token metadata and include in social post

### Success Criteria (Agent + Token Track)
- ✅ Working agent with clear demo
- ✅ Nad.fun token deployed (testnet)
- ✅ Token address in submission
- ✅ Agent-token interaction proof (tx hash)
- ✅ Monad integration (testnet RPC)
- ✅ Clear documentation

---

## Explicit Non-Goals (Both Submissions)

### Will NOT Be Implemented
- ❌ Multi-agent orchestration
- ❌ Full production UI
- ❌ Oracle-based risk management
- ❌ Cross-chain execution
- ❌ Profit-sharing or fee distribution
- ❌ Governance mechanisms
- ❌ Advanced token mechanics (vesting, airdrops, etc.)

### Why Not
These are **post-hackathon** features that:
- Increase scope beyond 2 weeks
- Add unnecessary complexity for demo
- Require more infrastructure
- Are not required by hackathon judges

---

## Technical Scope

### Included (Public Repo)
- Agent configuration (JSON schemas)
- Molt Mode D (social templates + logic)
- Nad.fun integration (API wrapper + flow)
- Demo scripts (stub + real mode)
- Documentation

### Excluded (Private)
- Strategy engine (proprietary)
- Live agent runner (production code)
- Production UI (polish + features)
- Deployment infrastructure

---

## Risk Management

### Hackathon Risks
| Risk | Mitigation |
|------|-----------|
| Network/API downtime | Stub mode works offline |
| Missing credentials | Demo runs without env vars |
| Token launch fails | Manual fallback documented |
| Scope creep | Strict cutlines enforced |

### Security Risks
| Risk | Mitigation |
|------|-----------|
| Leaked secrets | No keys in repo, .gitignore enforced |
| Strategy IP exposure | Private logic stays private |
| Unsafe execution | Remote signer + onchain rules |
| Social attack vectors | Templates are static, no user input |

---

## Timeline

| Date | Milestone |
|------|-----------|
| Feb 1 | Soft submission prep (this doc) |
| Feb 2 | Soft submission |
| Feb 2-8 | Implement real mode (Moltbook + Nad.fun) |
| Feb 9-14 | Screenshots, polish, testing |
| Feb 15 | Final submission |

---

## Judge Messaging

**For judges reviewing this repo:**

This repository demonstrates the **public integration surface** for Clawfolio agents:
- Social outputs (Moltbook)
- Token launches (Nad.fun)
- Verifiable execution (Monad)

The proprietary strategy engine is **intentionally not included** for IP protection.

**Security model**: Even with private strategy logic, all execution is constrained by:
- Remote signer validation (EIP-712 domain + structure checks)
- Onchain RiskGuard (allowlists, caps, cooldowns)
- Public contract enforcement (verifiable via explorer)

**Trust principle**: "Private strategy, public enforcement."
