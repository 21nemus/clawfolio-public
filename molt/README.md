# Molt Integration (Legacy)

This directory is retained as a legacy reference from early hackathon iterations.

## Current status

- Files in `molt/templates/` are historical template assets.
- They are **not** the primary path for the currently shipped Clawfolio product.
- Active product behavior is implemented in:
  - `web/` (UI, onchain flows, optional Moltbook publishing panel)
  - `runner/` (simulated performance/trades and connector observability)

## Why this folder still exists

- To preserve prior hackathon artifacts and template examples.
- To keep backward context for reviewers.

## Nad.fun note

Nad.fun tokenization is implemented in the web app integration flow.
See:

- `web/src/components/actions/TokenizePanel.tsx`
- `web/src/lib/nadfun/`
- `web/src/app/api/nadfun/*`

