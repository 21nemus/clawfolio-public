# Quick Start Guide

## Setup (First Time)

```bash
cd runner
npm install
cp .env.example .env
```

Edit `.env` and set:
- `RUNNER_BOT_REGISTRY=0x...` (your deployed BotRegistry address)
- `RUNNER_START_BLOCK=...` (optional, reduces indexing time)

## Basic Usage

### 1. Index All Bots and Generate Metrics

```bash
npm run index
```

This will:
- Fetch all bots from BotRegistry
- Index events for each bot (with 100-block RPC chunking)
- Compute metrics (balances, flows, trade stats)
- Save results to `out/metrics/<botId>.json`

### 2. View Leaderboard

```bash
npm run leaderboard
```

Displays a ranked table of bots and saves `out/leaderboard.json`.

### 3. Dry-Run Single Bot

```bash
npm run run -- --botId 1
```

Simulates trading decision for bot #1 without executing.

### 4. Dry-Run All Bots

```bash
npm run run-all
```

## Output Files

All outputs are in the `out/` directory:

- `out/index/<botId>.json` - Raw indexed events
- `out/metrics/<botId>.json` - Performance metrics
- `out/leaderboard.json` - Bot rankings

## Example Workflow

```bash
# Initial setup
cd runner
npm install
cp .env.example .env
# Edit .env...

# Index and generate metrics
npm run index

# View leaderboard
npm run leaderboard

# Test dry-run for bot 1
npm run run -- --botId 1
```

## Notes

- **DRY-RUN ONLY**: Real trade execution is disabled until EIP-712 TradeIntent spec is available
- **RPC Limits**: Indexer uses 100-block chunks to respect Monad RPC constraints
- **No Secrets**: No private keys needed for indexing/metrics
- **Testnet Only**: Designed for Monad testnet (chainId 10143)

See [README.md](./README.md) for full documentation.
