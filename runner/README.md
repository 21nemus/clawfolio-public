# Clawfolio Runner

External simulation backend for Clawfolio.

Runner is separate from the web app and provides simulated performance/trade data plus optional connector observability.

## What it provides

- Deterministic simulation loop (no live onchain execution)
- SQLite persistence for snapshots and events
- Read-only API for web consumption:
  - `GET /health`
  - `GET /leaderboard`
  - `GET /bots/:botId/perf`
  - `GET /bots/:botId/trades`
  - `GET /bots/:botId/proposals`
  - `GET /bots/:botId/connector`
- Local/protected write endpoints:
  - `POST /admin/tick`
  - `POST /bots/:botId/proposals`
  - `POST /bots/:botId/connector/heartbeat`

## Local development

```bash
cd runner
npm install
cp .env.example .env
npm run dev:api
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Build

```bash
npm run build
npm run start:api
```

## Docker deployment (VPS)

```bash
cd runner
cp .env.example .env
docker compose up -d --build
docker compose logs -f runner
```

By default, Runner binds to `127.0.0.1:8787` and stores DB data in `runner/out/runner.db`.

## Reverse proxy for Vercel

When using `NEXT_PUBLIC_RUNNER_BASE_URL` in web, expose Runner through HTTPS proxy and allow only read-only routes publicly:

- `/health`
- `/leaderboard`
- `/bots/:botId/perf`
- `/bots/:botId/trades`
- `/bots/:botId/proposals`
- `/bots/:botId/connector`

Keep write endpoints localhost-only.

## Environment variables

Required:

- `RUNNER_CHAIN_ID`
- `RUNNER_RPC_HTTP_URL`
- `RUNNER_BOT_REGISTRY`

Core:

- `RUNNER_PORT` (default `8787`)
- `RUNNER_DB_PATH` (default `out/runner.db`)
- `RUNNER_DISABLE_LOOP`
- `RUNNER_TICK_INTERVAL_SECONDS`

Optional:

- `RUNNER_ADMIN_TOKEN`
- `RUNNER_CONNECTOR_TOKEN`
- `RUNNER_START_BLOCK`
- `RUNNER_OUT_DIR`
- `RUNNER_MAX_BOTS`

## Connector heartbeat example

Read status:

```bash
curl http://127.0.0.1:8787/bots/0/connector?connectorType=openclaw
```

Post heartbeat (localhost):

```bash
curl -X POST http://127.0.0.1:8787/bots/0/connector/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"connectorType":"openclaw","mode":"shadow","version":"0.1.0"}'
```

