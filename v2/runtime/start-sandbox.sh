#!/bin/sh
set -eu
ROOT=/mnt/e/near-2-mainnet-review/v2
BIN=/mnt/e/near-2/.sandbox/bin/Linux-x86_64/near-sandbox
export HOME="$ROOT/.sandbox/home" TMPDIR=/mnt/e/near-2-mainnet-review/.tmp
mkdir -p "$HOME" "$ROOT/.sandbox/node" "$TMPDIR"
if [ ! -f "$ROOT/.sandbox/node/config.json" ]; then
  "$BIN" --home "$ROOT/.sandbox/node" init --fast
fi
python3 - "$ROOT/.sandbox/node/config.json" <<'PY'
import json,sys
p=sys.argv[1]
c=json.load(open(p))
c['consensus']['min_block_production_delay']={'secs':0,'nanos':150000000}
c['consensus']['max_block_production_delay']={'secs':0,'nanos':300000000}
c['consensus']['max_block_wait_delay']={'secs':0,'nanos':600000000}
json.dump(c,open(p,'w'))
PY
export NEAR_SANDBOX_LOG=error RUST_LOG=error
exec "$BIN" --home "$ROOT/.sandbox/node" run --rpc-addr 127.0.0.1:3032 --network-addr 127.0.0.1:24569

