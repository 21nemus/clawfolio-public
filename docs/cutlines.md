# Submission Cutlines

Scope boundaries for the current Clawfolio hackathon submission.

## In-scope (shipped)

- Web app on Monad testnet (`web/`)
  - Agent creation and management
  - Explore pages and agent detail pages
  - Nad.fun token launch flow and Token Hub
- Runner service (`runner/`)
  - Deterministic simulation of performance and trades
  - Leaderboard and per-agent metrics API
  - Proposal and connector status surfaces
- Optional connector observability
  - Heartbeat status in UI
  - Proposal list rendering in UI

## Out-of-scope (not shipped in this repo)

- Automated onchain trade execution pipeline
- Production strategy engine internals
- Full autonomous signing/transaction infrastructure
- Advanced multi-agent orchestration

## Judge-facing positioning

Use this wording consistently:

- **Real today**: onchain agent identity + Nad.fun token launches
- **Simulated today**: performance/trades via Runner
- **Integration-ready today**: connector heartbeat + proposals for OpenClaw-style producer

## Demo priorities (2-minute format)

1. Show `/agents` and `/agents/[id]` with live simulated updates
2. Show trade history and performance dashboard
3. Show token presence in `/tokens`
4. Show OpenClaw integration panel status and proposal visibility

## Non-goals for this submission

- Claiming live autonomous onchain execution
- Claiming private strategy internals are open sourced
- Introducing new contract-level behavior

