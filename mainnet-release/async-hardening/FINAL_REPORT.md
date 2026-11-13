# FLOOR native callback hardening

## Release decision

New financial source and distinct normal/fault WASMs are implemented in this
directory. Mainnet technical readiness remains BLOCKED pending full storage-
isolation proof and independent review. This work does not claim to solve
genuinely unknown transfer recovery.

## Reachability analysis

The previously demonstrated native payout callback OOG uses a fault WASM that
changes callback gas to 0.001 Tgas. Normal code gives callbacks 30 static Tgas
and zero unused-gas weight. A malicious receiver cannot consume that reserved
callback allocation: the native Transfer has no receiver function execution.
NFT/FT receiver code runs in its own receipt allocation. Ordinary claim callback
work is constant-size map access and aggregate updates, without history scans.

Normal callback loss via a supported public native payout was NOT REPRODUCED.
This is not proof of impossibility after protocol repricing, account deletion,
malicious upgrades or unexpected state corruption. RPC timeout is not callback
execution failure. Known transfer failure has a real callback classification;
unknown results never receive automatic retries.

Previously storage refund paths lacked the common gas preflight. This candidate
requires at least 110 Tgas at entry to storage deposit/withdraw/unregister and
retry, before financial mutation. Dispatch rechecks the envelope. Measured
parent work plus transfer scheduling/action fees and fixed 30-Tgas callback must
fit that envelope; passing boundary tests is finite evidence, not a bound across
all future protocol schedules. Callers using the earlier 30-Tgas storage budget
must update their integration before using this candidate.

## Changes and financial invariants

- Claim callback returns without mutation for a stale attempt or terminal state,
  while retaining private predecessor and single-promise-result requirements.
- Each registered user prepays an additional 256-byte refund slot in its minimum
  registration balance and nonwithdrawable active registration base.
- At most one unresolved refund is allowed per registered receiver. The receiver's
  fixed user fields retain amount/state. A second attempt rejects before transfer.
- Refund records no longer consume the shared `operational-operational_base`
  allowance. Their measured size must fit 256 bytes and aggregate actual storage
  coverage is checked before dispatch.
- Successful callbacks clear the receiver slot; unknown callbacks keep it.
- Unregistration keeps a pending tombstone until successful callback. Deposits
  into that pending registration reject to avoid losing new credit on cleanup.
- Sponsorship excess refunds now require a registered refund receiver. This is
  an intentional compatibility restriction, not full unchanged NEP-145 behavior.
- Native amount, backing, supply, lender escrow and NFT settlement formulas are
  unchanged. No new administrator, compensation, mint or timeout retry exists.
- Known-failure retry retains the conservative `A >= R_local + I` condition.

## Residual storage limitation

Per-user ordinary refunds are prepaid and bounded. A user with an unknown refund
cannot request another refund or unregister, but retains token and claim rights.
Distinct registered users do not compete for the previous fixed refund allowance.

Full unregistration is harder: the full refundable credit is dispatched while
the tombstone/refund records remain until callback success. The aggregate storage
coverage guard can reject later operations if many such callbacks never complete.
This candidate does not prove unbounded cross-user unregistration liveness or
eliminate that residual shared headroom dependency. It must not be advertised as
a complete refund liveness repair. No rights are erased to reclaim storage.

## Runtime and artifacts

Final-source suite: **32 groups passed, zero failures**, with 240 evidence rows.
Additional `gas-boundary.mjs` passed three complete registration/refund/unregister
cycles at exactly 110 Tgas, plus 109-Tgas registration preflight rejection.
Strict WASM Clippy passed. The normal binary was built, then the fault binary,
then normal was rebuilt and compared byte-for-byte successfully.

Normal: 444,627 bytes; SHA-256
`815f59864e55c69c5a5367a64354b6a22d2a470a4e4869ed23c32ac68661b5ce`;
NEAR code hash `9i1vQV6VYBT16DwhLAm4RCtKsYXgiScemNxCCvhh3EZj`.
Fault: 444,633 bytes; SHA-256
`1946be9f2e2cd37b8e02ae40ac6ff6391546f77af4a8de36c7a35f1c6a38fb1c`;
NEAR code hash `2hfm3RczLu5ZrF7zxdL2Gcn3CB8jgnDvmV6Bvm85Pocf`.
Exact source hashes and method gas/storage extrema are in
`runtime/evidence/manifest.json`.

Measured total withdrawal receipt-chain gas peaks at 5.271 Tgas; storage withdrawal
at 5.936 Tgas; registration at 5.850 Tgas; unregistration at 5.837 Tgas.
The 110-Tgas boundary tests include parent execution, action scheduling and
callback costs. Callback allocation is 30 Tgas with no history scans. These
measurements leave substantial headroom, but maximum-input / maximum-state
proof across all supported envelopes remains incomplete. Method extrema include
expected rejected calls, so minima must not be interpreted as successful-flow costs.

The local harness deploys this directory's new normal and fault binaries, not v1.
It exercises the full issuance/redemption, NFT lending/repayment/default, storage,
known transfer failure/retry, concurrent payout and history-growth suite, plus
nine isolated unknown refund records and the 109/110-Tgas dispatch boundary.
Final counts, gas/storage and hashes are recorded in the raw JSON evidence and
artifact manifest. Deliberate callback gas failure is a fault-only negative test.
Normal and fault hashes differ. No normal-artifact exploit is inferred from it.

Initial calibration execution preceded the pending-unregistration deposit guard;
only the final fresh-account run should be used as final-source acceptance.
Historical artifacts/source and all public contracts are unchanged.

## Monitoring and incident response

`monitor.mjs` uses only finalized RPC queries. It compares expected code and
public access-key permissions, actual versus required cash and storage coverage,
reports refund-storage growth, and tracks first-observed InFlight age for supplied
claim IDs. It requires a complete external event index to discover those IDs;
first-observed age is not dispatch time. Callback failure detection additionally
requires indexing each transaction's full receipt tree. Monitoring RPC failure is
itself an alert, never authorization to resend.

On aged InFlight, callback failure, code/key change or reserve deficit: preserve
hashes/receipt trees and finalized snapshots; disable new frontend submissions;
notify incident owner and affected users; reconcile through independent providers.
UI restriction cannot pause this contract. Unknown transfers stay quarantined.
Only protocol-classified known failures may enter the existing conservative retry.
No automatic resend, administrator failed-state override or user acknowledgement.

## Reproduction

Source baseline: `0c5b9a2`; exact changed source hashes accompany final evidence.
Rust 1.99.1, near-sdk 5.30.1 and the isolated Cargo.lock; RUSTFLAGS=`--cfg near`.
Build with `cargo build --offline --locked --release --target
wasm32-unknown-unknown --manifest-path mainnet-release/async-hardening/Cargo.toml
--features contract`; preserve normal binary before building `contract,fault-injection`.
Build normal again and compare full bytes. Run runtime/test.mjs with SANDBOX_RPC
pointing to disposable localhost:3032, local genesis credentials and installed
runtime SDK/fixture. No public keys or private production credentials are needed.

## Final independent gates

| Gate | Verdict |
|---|---|
| NORMAL CALLBACK GAS SAFETY | UNPROVEN beyond measured supported cases |
| NORMAL-ARTIFACT CALLBACK-LOSS REACHABILITY | NOT REPRODUCED |
| REFUND CROSS-USER LIVENESS | UNPROVEN for full unregistration saturation |
| NO DOUBLE PAYMENT | PASS within executed cases |
| ECONOMIC INVARIANTS | PASS within executed cases |
| NEW SANDBOX WASM | TESTED |
| GENUINELY UNKNOWN PAYOUT RECOVERY | UNSOLVED |
| MAINNET PILOT TECHNICAL READINESS | BLOCKED |
| MAINNET DEPLOYMENT | NOT EXECUTED |
