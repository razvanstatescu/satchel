#!/bin/bash
# THROWAWAY spike: second matrix (near.org + dRPC with MPC; FastNEAR/near.org with a 200-block yield). Polls via dRPC.
cd "$(dirname "$0")"
run() { echo "=== $(date -u +%H:%M:%S) $*"; node sign-modes.mjs "$@" 2>&1 | grep -E "^\[|submit returned|submit error body" | cut -c1-600; sleep 3; }
for mode in send_tx:INCLUDED send_tx:EXECUTED_OPTIMISTIC send_tx:FINAL broadcast_tx_commit broadcast_tx_async; do run nearorg $mode mpc drpc 2000; done
for mode in send_tx:NONE send_tx:INCLUDED send_tx:INCLUDED_FINAL send_tx:EXECUTED_OPTIMISTIC send_tx:EXECUTED send_tx:FINAL broadcast_tx_commit broadcast_tx_async; do run drpc $mode mpc drpc 2000; done
run fastnear send_tx:FINAL yield drpc 4000
run fastnear broadcast_tx_commit yield drpc 4000
run nearorg send_tx:EXECUTED_OPTIMISTIC yield drpc 4000
run nearorg broadcast_tx_commit yield drpc 4000
echo "MATRIX2 DONE $(date -u +%H:%M:%S)"
