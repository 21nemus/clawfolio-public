# Clawfolio Runner

External simulation backend for Clawfolio (Scenario B: UI != Brain).

This service runs separately from the Vercel web app, polls onchain bot state, writes simulation snapshots to SQLite, and exposes a read-only HTTP API for leaderboard/performance rendering.

## What it provides

- Deterministic simulation loop (no LLM calls, no live execution)
- SQLite persistence for state, decisions, performance snapshots
- Read-only API:
  - `GET /health`
  - `GET /leaderboard`
  - `GET /bots/:botId/perf`
- Optional protected admin tick endpoint:
  - `POST /admin/tick` with `X-Runner-Admin-Token`

## Safety model

- Simulation-only (no EIP-712 execution changes)
- No key custody in web app
- Runner can run private behind reverse proxy/Tailscale
- Web app consumes read-only API

## Local development

```bash
cd runner
npm install
cp .env.example .env
# set RUNNER_BOT_REGISTRY, RPC, etc.
npm run dev:api
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Build

```bash
cd runner
npm run build
npm run start:api
```

## Docker-first deployment (VPS)

1) Prepare env:

```bash
cd runner
cp .env.example .env
```

2) Start service:

```bash
docker compose up -d --build
```

3) Logs:

```bash
docker compose logs -f runner
```

By default, compose binds to `127.0.0.1:8787` (localhost only). Persisted data lives in `runner/out/` (`runner.db`).

## HTTPS for Vercel consumption

Because Vercel needs a public URL for `NEXT_PUBLIC_RUNNER_BASE_URL`, place a reverse proxy in front of runner:

- Keep runner bound to localhost (`127.0.0.1:8787`)
- Expose only proxy over HTTPS (domain + TLS)
- Public routes should be read-only:
  - `/health`
  - `/leaderboard`
  - `/bots/:botId/perf`

Example stack:

- Caddy or nginx on VPS
- Proxy upstream: `http://127.0.0.1:8787`
- Optional IP allowlists/rate limiting

## Environment variables

Required:

- `RUNNER_CHAIN_ID` (10143 for Monad testnet)
- `RUNNER_RPC_HTTP_URL`
- `RUNNER_BOT_REGISTRY`

Core:

- `RUNNER_PORT` (default `8787`)
- `RUNNER_DB_PATH` (default `out/runner.db`)
- `RUNNER_DISABLE_LOOP` (`true` or `false`)
- `RUNNER_TICK_INTERVAL_SECONDS` (default `30`)

Optional:

- `RUNNER_ADMIN_TOKEN` (required only if using `POST /admin/tick`)
- `RUNNER_START_BLOCK`
- `RUNNER_OUT_DIR`
- `RUNNER_MAX_BOTS`

## Data and backups

Primary DB file:

- `runner/out/runner.db`

Back up this file regularly for leaderboard/performance continuity.

## Legacy CLI commands

Existing commands remain available:

- `npm run index`
- `npm run run -- --botId <id>`
- `npm run run-all`
- `npm run leaderboard`

