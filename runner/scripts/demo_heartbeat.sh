#!/usr/bin/env bash
set -euo pipefail

# Demo script to post a heartbeat to the Runner connector endpoint
# Usage:
#   BOT_ID=0 RUNNER_CONNECTOR_TOKEN=your-token ./runner/scripts/demo_heartbeat.sh
#   BOT_ID=0 ./runner/scripts/demo_heartbeat.sh  # if token not required

BOT_ID="${BOT_ID:-0}"
RUNNER_BASE_URL="${RUNNER_BASE_URL:-http://127.0.0.1:8787}"
RUNNER_CONNECTOR_TOKEN="${RUNNER_CONNECTOR_TOKEN:-}"

HEARTBEAT_URL="${RUNNER_BASE_URL}/bots/${BOT_ID}/connector/heartbeat"

PAYLOAD='{
  "connectorType": "openclaw",
  "mode": "shadow",
  "capabilities": {"proposals": true, "execute": false},
  "version": "0.1.0",
  "meta": {"host": "demo", "notes": "Demo heartbeat from script"}
}'

echo "Posting heartbeat to: ${HEARTBEAT_URL}"
echo "BOT_ID: ${BOT_ID}"
echo "Token: ${RUNNER_CONNECTOR_TOKEN:+set}"
echo ""

if [ -n "${RUNNER_CONNECTOR_TOKEN}" ]; then
  curl -X POST "${HEARTBEAT_URL}" \
    -H "X-Runner-Connector-Token: ${RUNNER_CONNECTOR_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    -w "\n"
else
  curl -X POST "${HEARTBEAT_URL}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    -w "\n"
fi

echo ""
echo "Done. Check status with:"
echo "  curl ${RUNNER_BASE_URL}/bots/${BOT_ID}/connector"
