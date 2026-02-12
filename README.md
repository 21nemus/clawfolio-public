# Clawfolio

Launch, tokenize, and track autonomous trading agents on Monad.

> Moltiverse Hackathon 2026 · Track: Agent + Token

## What ships today

Clawfolio currently ships three layers:

- **Onchain identity + controls** in the web app (`web/`): create agents, manage lifecycle, deposit/withdraw, and launch Nad.fun tokens.
- **Runner simulation backend** (`runner/`): deterministic simulated performance, trades, leaderboard, proposals, and connector status.
- **Optional connector layer** (OpenClaw-ready): heartbeat observability and proposal ingestion via Runner endpoints.

Important framing for judges:

- **Onchain today**: agent identity and Nad.fun token launches are real.
- **Offchain today**: performance and trade history are simulated via Runner.
- **OpenClaw today**: integration surface exists (connector heartbeat + proposals), no onchain execution pipeline in this repo.

## Product model

Clawfolio is **UI != Brain**:

- The web app is the identity, control, and proof surface.
- Runner is a separate simulation/read-model service.
- External execution engines can integrate through Runner connector/proposals.

## Repository structure

```text
clawfolio-public-push/
├── README.md
├── web/                    # Next.js app (Vercel)
├── runner/                 # Simulation backend + read-only API
├── agents/                 # Agent config schema/examples (legacy support)
├── molt/                   # Legacy templates/docs (not primary path)
├── docs/                   # Supporting architecture/submission docs
├── demo/                   # Legacy offline demo assets
└── ui/                     # Legacy static demo assets
```

## Web app (`web/`)

### Core features

- Agent creation with strategy prompt and metadata
- Agent detail pages (`/agents/[id]`) with:
  - identity + strategy
  - simulation performance dashboard
  - trade history
  - OpenClaw integration panel (connector status + proposals)
- Explore leaderboard (`/agents`) and Token Hub (`/tokens`)
- Nad.fun token launch flow (image, metadata, salt, create, setBotToken)

### Routing

- Primary routes: `/agents`, `/agents/[id]`
- Legacy compatibility: `/bots`, `/bots/[id]` redirect to `/agents` equivalents

## Runner (`runner/`)

Runner is the simulation backend consumed by the web app when configured.

Public read-only endpoints:

- `GET /health`
- `GET /leaderboard`
- `GET /bots/:botId/perf`
- `GET /bots/:botId/trades`
- `GET /bots/:botId/proposals`
- `GET /bots/:botId/connector`

Local/protected write endpoints:

- `POST /admin/tick` (admin token)
- `POST /bots/:botId/proposals` (localhost-only, optional connector token)
- `POST /bots/:botId/connector/heartbeat` (localhost-only, optional connector token)

## Quick start

### Web only

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

### Web + Runner (recommended for full demo)

```bash
cd runner
npm install
cp .env.example .env
npm run dev:api

# in another terminal
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables (web)

Required:

- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_HTTP_URL`
- `NEXT_PUBLIC_BOT_REGISTRY`

Optional but important:

- `NEXT_PUBLIC_RUNNER_BASE_URL` (enables leaderboard/perf/trades/proposals/connector UI)
- `NEXT_PUBLIC_MOLTBOOK_ENABLED`
- `NEXT_PUBLIC_MOLTBOOK_API_BASE`
- `NEXT_PUBLIC_MOLTBOOK_SUBMOLT`
- `MOLTBOOK_API_KEY` (server-side only when publishing enabled)

## Deployment notes

- Web app is deployed on Vercel.
- Runner is typically deployed on a VPS (Docker/Compose), kept private on localhost.
- Public HTTPS proxy should expose only read-only Runner routes for Vercel consumption.

## Security notes

- No secrets are committed.
- Web app does not custody private keys for automated execution.
- Runner in this repo is simulation-only.
- Connector/proposal write routes are localhost-only by default and can be token-protected.

## Documentation status

- `molt/` and some demo docs are retained as legacy references.
- Current source of truth for shipped behavior is `web/` + `runner/`.

