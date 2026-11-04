#!/usr/bin/env bash
# Jalankan Anvil yang mem-fork mainnet Robinhood Chain.
# Kontrak Pons V2 asli ikut ter-fork — tapi semua transaksi memakai dana palsu.
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${MAINNET_RPC_URL:?Isi MAINNET_RPC_URL di .env}"
: "${PONS_CHAIN_ID:?Isi PONS_CHAIN_ID di .env}"

if ! command -v anvil >/dev/null 2>&1; then
  echo "anvil tidak ditemukan. Install Foundry: https://book.getfoundry.sh/getting-started/installation" >&2
  exit 1
fi

args=(--fork-url "$MAINNET_RPC_URL" --chain-id "$PONS_CHAIN_ID" --port 8545)
if [[ -n "${FORK_BLOCK_NUMBER:-}" ]]; then
  args+=(--fork-block-number "$FORK_BLOCK_NUMBER")
fi

echo "Fork Robinhood Chain (chain id $PONS_CHAIN_ID) di http://127.0.0.1:8545"
exec anvil "${args[@]}"
