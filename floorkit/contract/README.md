# FloorKit isolated Phase 1 package

This package is independent of the deployed Floorline product. No factory,
frontend, public deployment or existing-credential access is included.

`src/lib.rs` ports the approved exact arithmetic. `src/contract.rs` is the
near-sdk persistent adapter, included only for WASM with `--features contract`.
The `fault-callback` feature is an intentionally unsafe **local test artifact**:
it allocates only 0.001 Tgas to callbacks. Never deploy that artifact publicly.
`receiver/` is a separate adversarial sandbox fixture, not product code.

Pinned compiler: Rust 1.99.1 (`58cf8f9c3`, 2026-10-13), Windows MSVC, WASM target
`wasm32-unknown-unknown`. Direct dependencies: uint 0.9.5, near-sdk 5.30.1,
borsh 1.8.1. Lockfiles pin transitive dependencies. Existing E-drive caches were
used offline. `uint` emits dependency macro deprecation/future-compatibility
warnings on this compiler; they are retained in build logs.

From PowerShell, with installed E-drive toolchains and dependencies:

```powershell
E:\near-2\floorkit\contract\check.ps1
E:\near-2\floorkit\contract\build.ps1
wsl.exe -d Ubuntu -- sh /mnt/e/near-2/floorkit/contract/start-sandbox.sh
# In a second shell, after the fresh local sandbox is listening:
node E:\near-2\floorkit\contract\tools\runtime.mjs
node E:\near-2\floorkit\contract\tools\supplemental.mjs
python -B E:\near-2\floorkit\contract\tools\runtime_parity.py
python -B E:\near-2\floorkit\contract\tools\audit_artifact.py
node E:\near-2\floorkit\contract\tools\final_views.mjs
python -B E:\near-2\floorkit\contract\tools\report.py
wsl.exe -d Ubuntu -- python3 /mnt/e/near-2/floorkit/contract/stop-sandbox.py
```

The sandbox uses only port 3032, chain ID `test-chain*`, and a NEW ignored
`floorkit/contract/sandbox-home/`. The old `.sandbox/` binary is reused read-only;
its old state/keys are not opened. The harness reads only the fresh validator
key, generates disposable account keys in memory, and writes no private keys
to evidence. This local-only signing was explicitly authorized separately.
The Node runner reuses installed near-api-js 5.1.1 from `runtime/node_modules`
read-only. No testnet/mainnet RPC or wallet selector is used.

All amounts and IDs are canonical decimal strings. Native claim kinds are
0 redemption, 1 creator, 2 registered storage withdrawal, 3 unregister,
4 storage excess. States are available, inflight, refund_pending and paid.
Automatic NEP-145 payouts are detached: outer method success does not establish
payment. Inspect actual callbacks/claim state and receipts. Paid records need
permissionless cleanup. Unregister refuses live rights even with `force=true`.

Storage base cost conservatively prepays a maximum-size user row plus one
maximum-size registered refund claim. Ordinary claim/call allocations are
separately charged from free storage; the eight pooled refunds are prepaid by
O. Initialization measures serialized map rows rather than using Phase 0's
abstract constants. No U/Q oracle or balance-minus-liabilities spender exists.

Native economic parity and executed WASM parity have separate evidence and
coverage limits. Reports in `floorkit/PHASE1_*.md` control the deployment verdict;
passing this package's tests is not permission to deploy or claim immutability.

Historical failed harness expectations and intermediate runs are retained in
`evidence/`. Current authoritative runtime evidence is `SANDBOX_RESULTS.json`.
Local transaction hashes are not public-testnet explorer evidence.
