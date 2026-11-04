#!/usr/bin/env bash
# Builds the contract and runs the full subscribe -> wait -> keeper-settles flow on NEAR testnet.
# Usage: NEAR_ACCOUNT_ID=you.testnet NEAR_PRIVATE_KEY=ed25519:... ./scripts/test-near-flow.sh
# The account must hold >= ~8 testnet NEAR (https://near-faucet.io). Exits non-zero on any failed check.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${NEAR_ACCOUNT_ID:?set NEAR_ACCOUNT_ID to a funded testnet account}"
: "${NEAR_PRIVATE_KEY:?set NEAR_PRIVATE_KEY (ed25519:...) for that account}"

echo "==> Building contract (wasm32 release)"
cargo build --quiet --target wasm32-unknown-unknown --release --manifest-path packages/contracts-near/Cargo.toml

export WASM_PATH="$PWD/packages/contracts-near/target/wasm32-unknown-unknown/release/tidepay_contracts_near.wasm"
echo "==> Running end-to-end flow on testnet (takes ~3 minutes)"
pnpm --filter @tidepay/crank-near exec tsx scripts/e2e.ts
