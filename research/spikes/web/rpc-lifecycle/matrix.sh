#!/bin/bash
# THROWAWAY spike: run every submission mode on both RPCs, sequentially (one key, no nonce clashes).
cd "$(dirname "$0")"
for rpc in fastnear nearorg; do
  for mode in send_tx:NONE send_tx:INCLUDED send_tx:INCLUDED_FINAL send_tx:EXECUTED_OPTIMISTIC send_tx:EXECUTED send_tx:FINAL broadcast_tx_commit broadcast_tx_async; do
    echo "=== $(date -u +%H:%M:%S) $rpc $mode"
    node sign-modes.mjs $rpc $mode 2>&1 | grep -E "^\[|submit returned|submit error body|finalSeenMs|Error|error" 
    sleep 2
  done
done
echo "MATRIX DONE"
