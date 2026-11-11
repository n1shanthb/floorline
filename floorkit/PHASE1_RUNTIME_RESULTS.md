# FloorKit Phase 1 runtime results

Status: **PASS for executed scenarios; deployment gate remains BLOCKED / NO-GO.**

One isolated Rust/near-sdk implementation exists under `floorkit/contract/`.
Its public implementation covers immutable initialization/config/metadata,
NEP-141 transfers and transfer-call resolution, the restricted NEP-145 profile,
after-fee minting, exact quotes/slippage/deadlines, creator credit, redemption,
terminal closure, explicit contributions, funded claims, native callbacks,
conservative failed restoration, paid cleanup, storage funding and the eight-slot
operational refund pool. Maps and aggregate counters avoid history scans.

Executed evidence:

- Eight native Rust boundary/adversarial tests passed.
- 10,000 native economic sequences / 640,000 operations and 10,000 full-width
  quote cases matched the unchanged Python model. No economic failing seeds.
- **26 real sandbox scenarios passed**, with 213 recorded evidence entries.
- Two supplemental real scenarios passed, with 9 additional entries:
  full exit during an actual pending FT resolver, and unrelated-user unregister
  denial after eight callback losses. The second is a reproduced availability
  limitation, not evidence that availability passed.
- 64 executed randomized WASM economic operations matched Python R/T/F/C.
- Final eight local test instances reconciled supply to known holder
  balances, actual native A, P, storage stake, immutable parameters and code hash.
  The supplemental closure instance and post-denial pool state are included.

Actual receipts include native success/failure, account deletion before payout,
known-failure restoration, overlapping dispatch, callback gas exhaustion,
conservative restoration blocked by another paid-but-unacknowledged attempt,
and separately funded cushion restoration without another payment of that attempt.
FT accept/reject/panic/malformed/oversized/exhausted/forward/redeem and attempted
force-unregister during resolution were executed. Canonical JSON, expiry,
one-yocto guards, storage shortage, partial/all automatic storage payouts, sponsor
refund, missing-user unregister, paid cleanup, maximum AccountId and wide math
also executed. Full exit refused reopening and paid existing claims after closure.

The harness checked A>=P and actual storage stake<=K+O after measured calls,
positive-supply cross-product monotonicity, and aggregate rollback on failing
root method receipts. It did not substitute scheduling or parent success for
payment. Detached NEP-145 callbacks can fail while the parent succeeds.

Boundary: local NEAR sandbox 2.14.0, protocol 88, port 3032, disposable keys only.
No public-testnet transactions, explorer links or public deployments exist for
this Phase 1 artifact. Normal WASM SHA-256: `a6f8f0c47f73a3eb7e5c85cc10b2a3b8773af4023ddf598d9d6fc15d91a19f13`.

Not exhaustive: no forced protocol-level permutation of every debit/refund/
callback ordering; no real duplicate delivery from NEAR; no arbitrary high-history
bound beyond the measured samples; no independent security audit. Direct forged
callbacks reject, fresh retry nonces are observed, and code guards stale attempts,
but these are not a claim that every asynchronous ordering ran in WASM.

Earlier harness failures are retained: a mistaken expected FT refund ignored
preexisting fungible receiver balances; setup initially reused an owner name;
one intermediate evidence-file write failed transiently. Those were harness/setup
faults, not financial invariant failures. Historical files are not current results.
