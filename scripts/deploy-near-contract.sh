#!/usr/bin/env bash
# Builds and deploys a TidePay contract to NEAR testnet, then prints NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT=<id>.
# Usage: NEAR_ACCOUNT_ID=you.testnet NEAR_PRIVATE_KEY=ed25519:... ./scripts/deploy-near-contract.sh
# The account needs >= ~5 testnet NEAR (https://near-faucet.io). The new accounts reuse your key.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${NEAR_ACCOUNT_ID:?set NEAR_ACCOUNT_ID to a funded testnet account}"
: "${NEAR_PRIVATE_KEY:?set NEAR_PRIVATE_KEY (ed25519:...) for that account}"

echo "==> Building contract (wasm32 release)"
cargo build --quiet --target wasm32-unknown-unknown --release --manifest-path packages/contracts-near/Cargo.toml

export WASM_PATH="$PWD/packages/contracts-near/target/wasm32-unknown-unknown/release/tidepay_contracts_near.wasm"
echo "==> Deploying to testnet"
pnpm --filter @tidepay/crank-near exec tsx scripts/deploy.ts
