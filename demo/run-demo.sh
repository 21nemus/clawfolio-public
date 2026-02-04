#!/bin/bash
set -euo pipefail

# Clawfolio Demo Script (Soft Submission)
# Runs in stub mode (no network) and produces deterministic outputs

echo "=================================================="
echo "  Clawfolio Demo - Molt Mode D"
echo "  Moltiverse Hackathon 2026"
echo "=================================================="
echo ""

# Load config
if [ -f .env ]; then
  source .env
fi

AGENT_CONFIG=${AGENT_CONFIG:-"../agents/examples/momentum-trader.json"}
OUTPUT_DIR=${OUTPUT_DIR:-"./out"}
STUB_MODE=${STUB_MODE:-"true"}

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR/posts"

echo "[1/4] Loading agent configuration..."
if [ ! -f "$AGENT_CONFIG" ]; then
  echo "ERROR: Agent config not found at $AGENT_CONFIG"
  exit 1
fi

# Parse agent config using Node (no jq dependency)
eval "$(node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$AGENT_CONFIG', 'utf8'));
  const escape = (s) => String(s).replace(/'/g, \"'\\\"'\\\"'\");
  console.log(\`AGENT_NAME='\${escape(config.name)}'\`);
  console.log(\`STRATEGY_PROMPT='\${escape(config.strategyPrompt)}'\`);
  console.log(\`MOLT_MODE='\${escape(config.moltMode)}'\`);
  console.log(\`TOKEN_ENABLED='\${escape(config.token?.enabled ?? false)}'\`);
  console.log(\`TOKEN_SYMBOL='\${escape(config.token?.symbol ?? 'N/A')}'\`);
")"

echo "  Agent: $AGENT_NAME"
echo "  Molt Mode: $MOLT_MODE"
echo "  Token Launch: $TOKEN_ENABLED"
echo ""

if [ "$MOLT_MODE" != "true" ]; then
  echo "Molt Mode is disabled. Exiting."
  exit 0
fi

# Generate introduction post
echo "[2/4] Generating introduction post..."
# Use fixed timestamp for deterministic outputs (override via STUB_TIMESTAMP env var)
TIMESTAMP=${STUB_TIMESTAMP:-"2026-02-01T12:00:00Z"}

cat > "$OUTPUT_DIR/posts/introduction.json" <<EOF
{
  "stub": true,
  "type": "introduction",
  "agent": "$(echo $AGENT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')",
  "content": "🤖 Introducing $AGENT_NAME\n\nI'm an autonomous trading agent running on Monad.\n\nStrategy:\n$STRATEGY_PROMPT\n\n⚡ Powered by Monad (400ms blocks, parallel execution)\n🔗 Verifiable execution onchain\n🛡️ Risk-managed with onchain constraints\n\nFollow me for real-time performance updates.\n\n#Clawfolio #Monad #AutonomousAgents",
  "timestamp": "$TIMESTAMP"
}
EOF

echo "  ✓ Written to $OUTPUT_DIR/posts/introduction.json"

# Generate strategy post
echo "[3/4] Generating strategy summary post..."

cat > "$OUTPUT_DIR/posts/strategy.json" <<EOF
{
  "stub": true,
  "type": "strategy",
  "agent": "$(echo $AGENT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')",
  "content": "📊 Strategy Deep Dive: $AGENT_NAME\n\nFull strategy disclosure:\n$STRATEGY_PROMPT\n\nRisk Management:\n- Preset: balanced\n- Execution: Onchain with enforced limits\n- Custody: Self-custodied BotAccount contract\n\nAll trades are verifiable onchain.\nStrategy logic is optimized for Monad's 400ms block times.\n\n#Strategy #Transparency #Monad",
  "timestamp": "$TIMESTAMP"
}
EOF

echo "  ✓ Written to $OUTPUT_DIR/posts/strategy.json"

# Generate update post
echo "[4/4] Generating performance update post..."

cat > "$OUTPUT_DIR/posts/update.json" <<EOF
{
  "stub": true,
  "type": "update",
  "agent": "$(echo $AGENT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')",
  "content": "🔄 Update: $AGENT_NAME\n\nStatus: Stealth\n\nRecent activity:\nGenerated trade intent for MON→USDC swap (100 MON). Signed successfully. Simulation passed.\n\nNext steps:\nAwaiting market conditions for next opportunity.\n\nPerformance is publicly verifiable via Monad explorer.\n\n#AgentUpdate #Monad #Clawfolio",
  "timestamp": "$TIMESTAMP",
  "stage": "stealth",
  "proofAvailable": false
}
EOF

echo "  ✓ Written to $OUTPUT_DIR/posts/update.json"

echo ""
echo "=================================================="
echo "  Demo Complete!"
echo "=================================================="
echo ""
echo "Generated outputs:"
echo "  - $OUTPUT_DIR/posts/introduction.json"
echo "  - $OUTPUT_DIR/posts/strategy.json"
echo "  - $OUTPUT_DIR/posts/update.json"
echo ""

# Optionally render UI (if RENDER_UI is set)
if [ "${RENDER_UI:-false}" = "true" ]; then
  echo "[5/5] Rendering UI..."
  node ../ui/render.mjs
  echo ""
fi

echo "All outputs are stubbed (no network calls)."
echo "To enable real Moltbook posting, set STUB_MODE=false and provide MOLTBOOK_API_KEY."
echo ""
echo "To view UI: node ../ui/render.mjs && open ../ui/out/index.html"
echo ""

exit 0
