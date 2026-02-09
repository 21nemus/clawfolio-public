# Clawfolio Runner

Testnet indexer and dry-run execution runner for Clawfolio autonomous trading bots.

## Overview

This package provides:

1. **Event Indexer**: Fetches and stores bot events from BotRegistry and BotAccount contracts
2. **Metrics Engine**: Computes performance metrics (balances, flows, trade stats, optional PnL estimates)
3. **Dry-Run Execution**: Reads strategy prompts and simulates trading decisions (no real trades)
4. **Leaderboard**: Ranks bots by performance metrics

## Setup

### Prerequisites

- Node.js 20+
- Access to Monad testnet RPC

### Installation

```bash
cd runner
npm install
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Required:
- `RUNNER_CHAIN_ID`: Chain ID (10143 for Monad testnet)
- `RUNNER_RPC_HTTP_URL`: RPC endpoint
- `RUNNER_BOT_REGISTRY`: Deployed BotRegistry address

Recommended:
- `RUNNER_START_BLOCK`: Start block for event indexing (reduces RPC load)
- `RUNNER_OUT_DIR`: Output directory for metrics/leaderboard (default: `out`)

Optional (PnL):
- `RUNNER_QUOTE_MODE`: `none` (default) or `uniswapV2`
- `RUNNER_QUOTE_ROUTER`: Router address for price quotes
- `RUNNER_QUOTE_BASE_TOKEN`: Base token for valuation (symbol or address)

## Usage

### Index Bot Events and Generate Metrics

```bash
npm run index
```

This will:
- Fetch all bots from BotRegistry
- Index events for each bot (chunked to respect RPC limits)
- Generate metrics JSON files in `out/metrics/<botId>.json`

### View Leaderboard

```bash
npm run leaderboard
```

Displays a ranked table of bots by:
1. PnL% (if quote mode is enabled)
2. Trade count (fallback)

Also generates `out/leaderboard.json`.

### Dry-Run Single Bot

```bash
npm run run -- --botId 1
```

Loads bot config and strategy prompt, then prints what trading decision would be made (without executing).

### Dry-Run All Bots

```bash
npm run run-all
```

Runs dry-run logic for all bots sequentially.

## Output Files

### Metrics: `out/metrics/<botId>.json`

```json
{
  "botId": 1,
  "botAccount": "0x...",
  "updatedAt": "2026-02-09T...",
  "paused": false,
  "lifecycleState": 1,
  "operator": "0x...",
  "creator": "0x...",
  "tradeCount": 5,
  "lastActivity": {
    "blockNumber": 12345,
    "tx": "0x...",
    "type": "TradeExecuted"
  },
  "balances": [...],
  "flows": [...],
  "pnl": {
    "mode": "none",
    "note": "PnL not available (RUNNER_QUOTE_MODE=none)"
  }
}
```

### Leaderboard: `out/leaderboard.json`

Sorted array of bot summaries with rankings.

## Architecture

### Event Indexing

- Fetches logs using 100-block chunks to respect Monad RPC limits
- Deduplicates events by `txHash + logIndex`
- Stores indexed events in `out/index/<botId>.json`

### Metrics Computation

- **Balances**: Native MON + all ERC20 tokens touched by bot
- **Flows**: Net deposits - withdrawals per token
- **Trade Stats**: Count, volume, last activity
- **PnL** (optional): Mark-to-market valuation via onchain quotes

### Execution Model

**Current: DRY-RUN ONLY**

This runner does NOT execute real trades yet. Reasons:
- EIP-712 TradeIntent typed-data specification is not available in this repo
- No operator private keys are required for indexing/metrics

When the typed-data spec is available:
- Add `RUNNER_OPERATOR_PRIVATE_KEY` to `.env`
- Implement EIP-712 signing in `src/runner.ts`
- Call `BotAccount.execute()` with signed intent

## Safety Notes

⚠️ **Testnet Only**: This runner is designed for Monad testnet. Never use mainnet keys.

⚠️ **No Secrets in Git**: `.env` is gitignored. Never commit private keys.

⚠️ **Dry-Run Default**: Real trade execution is intentionally disabled until signature spec is available.

## Troubleshooting

### "Failed to fetch logs" or RPC errors

- Check `RUNNER_RPC_HTTP_URL` is accessible
- Increase `RUNNER_START_BLOCK` to reduce lookback window
- RPC rate limits may apply; runner uses exponential backoff

### "No bots found"

- Verify `RUNNER_BOT_REGISTRY` address is correct
- Check that bots have been created onchain

### PnL shows "mode": "none"

- Set `RUNNER_QUOTE_MODE=uniswapV2` and provide `RUNNER_QUOTE_ROUTER`
- Ensure quote router supports the tokens in bot portfolios

## Contributing

This is a hackathon project. For issues or questions, see the main repo README.
