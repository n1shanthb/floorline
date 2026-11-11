#!/bin/sh
set -eu
ROOT=/mnt/e/near-2
export HOME="$ROOT/.sandbox/home" TMPDIR="$ROOT/.tmp"
mkdir -p "$HOME" "$ROOT/.sandbox/node"
BIN=$(find "$ROOT/.sandbox/bin" -name near-sandbox -type f | head -n 1)
test -n "$BIN"
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
echo $$ > "$ROOT/.sandbox/pid"
echo 'Local sandbox starting; data and local test keys are on E:.'
exec "$BIN" --home "$ROOT/.sandbox/node" run --rpc-addr 127.0.0.1:3031 --network-addr 127.0.0.1:24568
