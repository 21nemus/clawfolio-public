# Clawfolio Delivery Summary

Current project status summary for hackathon submission.

## Status

Submission-ready with accurate architecture framing:

- Onchain identity and Nad.fun tokenization flows are implemented in web app.
- Runner simulation backend is deployed/usable for leaderboard, performance, and trade history.
- OpenClaw integration is currently connector/proposals oriented (observability and ingestion), not onchain execution.

## Shipped components

### 1) Web app (`web/`)

- Agent creation and lifecycle management
- Explore pages and agent detail pages
- Performance dashboard and trade history rendering
- Token Hub and Nad.fun launch workflow
- Optional Moltbook publishing panel

### 2) Runner (`runner/`)

- Deterministic simulation loop
- SQLite persistence
- Public read-only API:
  - `/health`
  - `/leaderboard`
  - `/bots/:botId/perf`
  - `/bots/:botId/trades`
  - `/bots/:botId/proposals`
  - `/bots/:botId/connector`
- Local write endpoints for proposals and connector heartbeat

### 3) Connector layer (current stage)

- Heartbeat status surfaced in web UI
- Proposal list surfaced in web UI
- Local-only ingestion endpoints in Runner

## What is intentionally not included

- Private strategy engine internals
- Live autonomous onchain execution pipeline
- Contract-level execution automation from this repository

## Documentation notes

- Root README and subsystem READMEs reflect current shipped behavior.
- Legacy `molt/` materials are retained only as historical references.
- `docs/molt-mode-d.md` is preserved as a deprecation note to avoid broken links.

