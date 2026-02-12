# Clawfolio Architecture

Current shipped architecture for hackathon submission.

## Overview

Clawfolio is split into three practical layers:

1. **Web App (`web/`)**
   - User-facing product on Vercel
   - Onchain identity, lifecycle controls, deposits/withdrawals
   - Nad.fun token launch integration
   - Agent pages showing simulation metrics and integration status

2. **Runner (`runner/`)**
   - Separate service (typically VPS-hosted)
   - Deterministic simulation loop
   - SQLite persistence for performance snapshots and trade history
   - Read-only API consumed by web when configured

3. **Optional Connector Producer (e.g., OpenClaw)**
   - Private/co-located process
   - Can post proposals to Runner (localhost-only endpoint)
   - Can send heartbeat updates for connection status observability

## Data flow

```text
Onchain BotRegistry/BotAccount
        │
        ├── read by web (identity + controls + proofs)
        └── read by runner (simulation inputs)

Runner (simulation + sqlite)
        │
        ├── GET API (public via reverse proxy)
        │     /health
        │     /leaderboard
        │     /bots/:id/perf
        │     /bots/:id/trades
        │     /bots/:id/proposals
        │     /bots/:id/connector
        │
        └── POST API (localhost-only)
              /bots/:id/proposals
              /bots/:id/connector/heartbeat

Web App
        └── reads runner data when NEXT_PUBLIC_RUNNER_BASE_URL is set
```

## Public vs private boundaries

Public:

- Web UI source and behavior
- Onchain contract interactions triggered by user wallets
- Runner read-only API responses (when exposed via proxy)

Private:

- Any external strategy engine internals
- Any future automated execution services
- Infrastructure secrets/tokens

## Routing model

- Primary product routes: `/agents`, `/agents/[id]`
- Legacy compatibility routes: `/bots`, `/bots/[id]` (redirects)

## Accuracy notes for judges

- Onchain identity and Nad.fun token launches are real.
- Performance and trade history shown in product are simulated by Runner today.
- OpenClaw integration in current stage is connector observability/proposals, not onchain execution.

