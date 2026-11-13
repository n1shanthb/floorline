# FLOOR async-hardening — finalization for independent review

## Current decision (supersedes the historical assessment below)

**READY FOR INDEPENDENT SECURITY REVIEW: YES**, within the bounded admission,
storage and protocol-88 gas model described here. Independent audit is NOT
COMPLETED. Mainnet deployment is NOT EXECUTED and remains separately gated.
This is not a solution to genuinely unknown historical native transfers.

Exact financial source commit: `0fd9e46`. New raw evidence only:
`runtime/evidence/finalization-20261113/` (`E/` below). Earlier evidence and binaries
remain unchanged. Source/test tooling and the report are the only existing files
updated; v1/v2/v3/v4, FloorKit, production keys and the live frontend are untouched.

| Required verdict | Current result |
|---|---|
| FULL UNREGISTRATION STORAGE ISOLATION | PASS within 128 pre-funded admission slots |
| CROSS-USER REFUND AVAILABILITY | PASS for admitted users' initial funded exits; retry-liquidity qualification below |
| NEP-145 COMPATIBILITY | PASS for supported/tested storage semantics; independent conformance review remains |
| SUPPORTED GAS ENVELOPE | PASS under pinned protocol/configuration and bounded input assumptions |
| NORMAL CALLBACK REACHABILITY | NOT REPRODUCED |
| NO DOUBLE PAYMENT | PASS within the tested state machine and stated custody/protocol assumptions |
| FINANCIAL SOLVENCY | PASS at finalized checkpoints and under the reserve model |
| NEW NORMAL WASM SANDBOX | PASS |
| READY FOR INDEPENDENT SECURITY REVIEW | YES |
| MAINNET DEPLOYMENT | NOT EXECUTED |

## Reproduced root cause and repaired result

The preserved old fault WASM registered 64 distinct maximum-length users, each
with 0.01 NEAR storage credit. **56** full unregisters transferred the deposits
while callbacks deliberately ran out of gas. The **57th** exit failed with
`refund storage coverage`. At rejection, stake was 4.66751 NEAR, O=4.58911 NEAR,
remaining H=0.08 NEAR, and I=0.56 NEAR. Solvency held but storage admission failed.
`E/old-summary.json` and `old-tx-*.json` preserve the actual FINAL receipts and
accounting. This is fault-injection reachability, not a normal-artifact exploit.

The repaired fault WASM admitted **128** distinct 64-character users and accepted
**all 128 full exits** despite every callback failing. Milestones 1/2/9/32/100/128
passed, the next registration was denied safely, repeat unregister returned false
without a second transfer, and pending re-registration rejected without changing
the retained refund. The last admitted unrelated user could still exit after the
other 127 unknown exits.

The new normal WASM passed the same 128-user capacity test with successful
callbacks. Occupancy, I and refund rows returned to zero; a completed user then
re-registered and exited again. `new-summary.json`, `normal-summary.json` and
their per-transaction files contain the results. Every capacity checkpoint waits
for `FINAL` and asserts actual balance >= local_required and H+O >= storage stake.

The all-unknown repaired instance ended with H=0, I=1.28 NEAR, refund row stake
0.192 NEAR, O approximately 5.17490 NEAR, and actual stake 4.93782 NEAR. No FLOOR
backing or lender escrow funded those refunds. The normal instance ended with
occupancy=0, I=0 and refund_storage=0, stake 4.48208 NEAR and O approximately
5.17484 NEAR. Exact integer amounts remain in raw evidence.

## Storage isolation and NEP-145 model

Initialization now protects **128 × 512 = 65,536 bytes** of exit contingency in
O, in addition to code plus a 4,096-byte fixed-state margin. At the tested byte
price the exit reserve is **0.65536 NEAR**, paid separately by contract deployment
funding. It is not FLOOR backing, lender capital or a deduction from user refunds.

Each active registration or temporary refund-only sponsor receiver consumes one
checked admission slot. User storage is checked <=256 bytes; its one refund row
is checked <=256 bytes. Thus all retained rows satisfy
`retained exit bytes <= occupied*(256+256) <=128*512`. Actual maximum-length
refund rows measured 150 bytes. Active loan/claim/call records remain separately
prepaid by users, and their references must clear before unregister.

Unknown or proven-failed exits retain the slot; only a verified successful refund
callback removes the tombstone and decrements occupancy. New admission at 128
rejects atomically. An already admitted user needs no further slot for their
initial exit. There is no deletion of unknown obligations or timeout refund.
`admission_status()` exposes this budget. This is finite pre-funded admission,
not merely an increased refund queue. Storage-layout or price changes invalidate
the bound and require review.

The entire recorded user total is dispatched on unregister. No nonrefundable user
fee was introduced. Exact-minimum registration now returns total=min, available=0.
Pending unregister is logically unregistered in storage_balance_of while user_state
retains the refund right; repeat unregister returns false. Re-registration waits
for the earlier refund to settle. Excess refunds to unregistered sponsors acquire
a temporary funded slot, released only after success. A sponsored operation can
need two free slots and rejects as a whole if unavailable. Forced destruction of
live financial rights remains unsupported.

These semantics were checked against the
[NEP-145 specification](https://raw.githubusercontent.com/near/NEPs/master/neps/nep-0145.md)
and runtime tests. This is not an independent standards certification.

## Gas envelope and executed regressions

All transfer/callback entrypoints enforce 110 Tgas prepaid and now also require
**100 Tgas remaining** at preflight. Storage operations check before financial
mutation and again at refund dispatch. Native callback allocation is static
30 Tgas; FT/NFT calls allocate 50 Tgas to receivers plus 30 Tgas to resolvers,
with zero unused-gas weight. The 100-Tgas remaining check leaves 20 Tgas beyond
those 80-Tgas allocations for bounded work and scheduling/action fees. Native
paths have more room. Gas consumed before preflight cannot silently steal this
budget; a parent panic rolls back state and outgoing promises.

Bounds: account IDs <=64 bytes, memo <=256 bytes, msg <=1,024 bytes; FT result
parsing <=64 bytes and NFT result <=5 bytes. Callbacks perform fixed map/counter
work without history loops or growing allocations. Successful refund callbacks
remove rows; state/attempt updates are fixed width. Missing/terminal refund records
are idempotent. Native cash restoration still uses the original conservative guard.

Actual new-WASM results:

- Full financial regression: **32 groups PASS**, zero failures; issuance,
  redemption/payout, FT resolver, lender funding/cancellation, acceptance/borrower
  payout, NFT transfer/current-owner repayment/default, concurrent claims,
  malicious callbacks, storage paths and history growth.
- Boundary tests: 109 Tgas rejects before mutation/dispatch; exactly 110 Tgas
  succeeds for native payout and three full registration/refund/unregister cycles.
- Maximum inputs: 64-byte accounts, 256-byte memo, 1,024-byte FT/NFT messages
  execute and resolve at 110 Tgas, including sponsored minimum registration and
  excess refund to an unregistered sponsor.
- Actual failed unregister refund: deleted receiver produces native failure;
  the same identity is recreated, known-failure retry pays, its slot is released,
  and duplicate retry rejects (`refund-recovery.json`).
- Economic parity: 16 Rust tests PASS, including seeds **10001..20000**, 128
  operations each (1,280,000 operations), plus 10,000 independent wide-arithmetic
  comparisons. No failing invariant seeds. Host tests are not sandbox sequences.
- Strict WASM Clippy PASS. Gas/storage extrema, parent/other receipt measurements,
  protocol configuration and exact source hashes are in `E/FINAL_MANIFEST.json`.

These establish the supported protocol-88 envelope, not perpetual safety under
arbitrary repricing. Protocol/gas/storage changes trigger review and rerunning
the boundary tests. `retry_failed_claim` schedules no new promise and retains
its bounded map/cash-check path; native storage retries use the 110-Tgas envelope.
Live frontend inspection found storage_deposit still submits 30 Tgas, so a separate
frontend integration change is required before targeting this candidate. No live
site or frontend file was edited here.

## Residual risk and qualification of availability

Unknown native outcomes remain **UNSOLVED** and quarantined. A user's own unknown
ordinary refund prevents another refund/unregister for that user. Unknown exits
can consume all 128 slots indefinitely, closing new admission; existing funded
exit storage remains covered. No ordinary RPC JSON, acknowledgement, timeout or
administrator action is accepted as settlement proof.

**Retry liquidity qualification:** proven-failure retries still require
`A >= R_local + I`. They can wait for native refund cash and can remain conservatively
blocked alongside large unrelated unknown I when spare liquidity is insufficient.
The cross-user PASS concerns the repaired storage admission and initial funded
exit dispatch, not unconditional immediate retry under every ambiguous-money
scenario. Independent review must explicitly assess this retained quarantine/
liquidity policy. No reserve check was loosened to force payment through.

Normal-artifact callback loss was NOT REPRODUCED in supported tested operations.
Deliberately sabotaged 0.001-Tgas callbacks establish retained-right and storage
safety under failed updates; they do not demonstrate a normal-artifact attacker
can force the 30-Tgas callback to fail. Malicious keys/upgrades, protocol changes,
and catastrophic operational failure remain outside this bounded runtime claim.

## Artifact freeze, preservation and next operational step

Source commit: `0fd9e46`; Rust 1.99.1; near-sdk 5.30.1; isolated Cargo.lock;
RUSTFLAGS=`--cfg near`; release target wasm32-unknown-unknown, features contract.
Normal SHA-256:
`a3a80de284f9e4ecf52744fced56c472b4df722aac4337afb52864d94a6e9406`.
Fault SHA-256:
`cfed032e5a8cacfbd8dcd3e8050831cd473eb2bf8a5b0e9580a81db380403fb4`.
Normal: 447,670 bytes, NEAR code hash
`C1r5oPTPu2uVjn8JfHamqohnhpezUQQezuJJZkp5qV1w`.
Fault: 447,676 bytes, NEAR code hash
`Ezf1VMLreU7LJxdjvKkB5JESK2TTt1f36pMVwktufARq`.
Normal was built,
fault was built separately, then normal was rebuilt and compared byte-for-byte;
a further source-comment correction reproduced identical tested bytes.

The old v1 hash remains
`529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`.
All earlier evidence/WASMs remain unchanged. Failed harness startup/finality lag
and Windows evidence-write attempts are retained and excluded from acceptance.
The candidate changes storage layout and requires fresh initialization; no upgrade
migration is implemented.

Next: submit source commit, normal WASM and manifest/raw receipts to an independent
NEAR security auditor. Ask for explicit review of admission conservation, byte
bounds, refund rights, gas/attempt semantics, NEP-145 pending states, actual cash
versus I, custody and the conditional known-failure retry policy.

Before any mainnet pilot also require: audit sign-off; approved FullAccess/upgrade
custody and atomic initialization; exact storage plus 0.65536-NEAR exit reserve,
gas/backing/contingency funding; separate real-money exposure authorization;
multi-RPC finalized indexing and code/key/occupancy/coverage alerts; incident
ownership; wallet gas/network integration acceptance. The 128-user storage cap
is not a financial deposit cap and no pause or monetary cap was added. Keys can
replace logic or spend funds; this must be resolved by the deployment policy.

Monitoring and incident response remain: preserve complete root/child receipts,
quarantine unknown payouts, disable new frontend submissions on an incident,
notify users/owners and reconcile independent providers. UI shutdown does not
pause the contract. There is no automatic resend or invented Failed transition.

---

## Historical assessment at 83da27c (superseded; retained for context)

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
