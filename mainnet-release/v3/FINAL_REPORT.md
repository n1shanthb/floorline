# FLOOR V3 consolidated release report

## Executive decision

NO-GO. V3 is a partial implementation, not a completed release candidate.
Unknown native-transfer recovery remains unsolved. Nine real local runtime
checks and the inherited sixteen economic tests passed; the complete requested
adversarial matrix has not been executed and must not be inferred from v2.

| Gate | Verdict |
|---|---|
| V3 IMPLEMENTATION | PARTIAL |
| ECONOMIC INVARIANTS | PASS for inherited economic engine; adapter coverage incomplete |
| DOUBLE-PAYMENT SAFETY | UNPROVEN for full requested matrix |
| UNKNOWN-TRANSFER RECOVERY | FAIL |
| CROSS-USER AVAILABILITY | FAIL for unresolved refund saturation/recovery |
| SANDBOX EXECUTION | INCOMPLETE |
| STORAGE/GAS | INCOMPLETE |
| MAINNET SECURITY GATE | BLOCKED |
| MAINNET DEPLOYMENT | NOT EXECUTED |

## Existing issue and selected design

In `src/contract.rs`, withdrawal at line 643 marks the funded claim InFlight,
moves its bucket to aggregate inflight, and creates transfer plus callback.
`claim_result` at line 663 proves success or failure only if it executes.
`retry_failed_claim` at line 676 permits restoration only for classified Failure.
Storage callbacks at line 321 and refund dispatch at line 757 have the same
unknown-result problem. Lost refunds retain operational bookkeeping capacity.

V2's owner acknowledgement can erase an unpaid right without settlement proof.
V3 rejects both acknowledgement entrypoints unconditionally. Unknown rights
remain preserved. This sacrifices availability rather than guessing settlement.
The copied unreachable acknowledgement bodies are retained only as prototype
history and should be removed before candidate freeze.

V2's per-obligation retry balance check also lacks a proof when another outgoing
transfer remains undebited. V3 restores the conservative `A >= R + I` condition.
This avoids counting ambiguous cash as available but retains cross-user blocking.
No claim is made that the earlier V2 PASS verdict resolves this ordering risk.

Timeout retry is rejected because success with callback loss and failure with
callback loss are indistinguishable to this contract. Ordinary RPC responses
are unauthenticated contract inputs. Receiver escrow shifts the final wallet
withdrawal ambiguity elsewhere. A receipt-proof verifier would require an
authenticated chain root and receipt provenance implementation; none exists in
this prototype. A recovery council could attest outcomes, but false Failure
attestations could double-pay and consume protected cash. No such power was
introduced. A separately funded indemnity could compensate uncertainty, but
would be insurance with finite capital and explicit loss allocation, not proof
that the original transfer failed.

## Implemented controls and trust

New immutable prototype limits admit at most 100 NEAR per issuance, contribution
or lender-funding action and 1,000 NEAR gross cumulative admitted deposits.
Withdrawals never reset this cumulative budget. These illustrative limits are
not an approved mainnet budget. Storage deposits and repayments are outside this
cap; therefore it does not bound total account inflows or all protocol exposure.

The initializer's predecessor becomes risk guardian. It can irreversibly stop
new issuance, contributions, offer funding and acceptance. It cannot resume,
change caps, mint, seize collateral, redirect payouts or classify unknown results.
Existing withdrawals, repayment, cancellation, default and storage exits remain
callable. Atomic initialization and account FullAccess custody still require
independent review. Guardian censorship of new activity is disclosed trust.

Files: isolated Cargo manifest/lock, source engine/math/adapter, inherited economic
tests, local runtime harness and raw sandbox-results.json. All are under this
directory. No v1/v2 source or artifact was modified.

## Actual tests and evidence

`cargo test --offline --locked --manifest-path mainnet-release/v3/Cargo.toml
--test economic_parity` passed 16 tests, including 10,000 economic sequences and
10,000 independent wide-arithmetic comparisons. These use the unchanged reference
engine; they do not exercise new adapter controls or recovery fuzzing.

`node mainnet-release/v3/runtime-test.mjs` executed compiled WASM in sandbox
2.14.0 on localhost:3032 with disposable identities. Nine assertions passed:
initial issuance; over-cap rejection; unauthorized stop rejection; authorized
stop; stopped issuance rejection; payout after stop; Paid state; duplicate
withdrawal rejection; acknowledgement rejection. Local solvency was checked.
The raw JSON preserves complete transaction/receipt results, gas and final state.
An initial harness attempt failed because its over-cap signer lacked 101 NEAR;
the corrected run uses the genesis signer to reach the contract cap assertion.

Not executed for V3: lost-callback fault matrix, failed native transfers,
cross-shard ordering, duplicate/old callback context, recovery fuzzing, refund
saturation, loan default, transfer-call pending races, history-growth stress,
full standards conformance, and clean second-build reproducibility. V2 evidence
is historical and cannot fill these V3 gates. No new fault artifact is supplied.

## Economic and accounting boundaries

Backing/supply formulas, wide arithmetic, lender escrow and loan NFT logic are
copied unchanged. Locked collateral is counted once in total supply. Available
claims remain funded outside L. InFlight cash is ambiguous and cannot be spent
as unencumbered surplus. Retry uses the conservative aggregate reserve condition.
The adapter's new cumulative exposure counter is checked and transaction rollback
protects rejected calls. Full adapter parity remains incomplete.

## Artifact and reproduction

Tested normal WASM SHA-256:
`0cf3a0439ea588324b383d32b270d2376b1f625e71f87b30045176ed7ec0e8a7`.
Compiler: Rust 1.99.1; SDK 5.30.1; pinned local Cargo.lock; flags `--cfg near`;
features `contract`; target `wasm32-unknown-unknown`; release build.
Artifacts are generated locally under artifacts/ and excluded from Git pending
candidate freeze. Raw sandbox deployment transactions contain the code bytes.

Build with E: CARGO_HOME/RUSTUP_HOME/TEMP and:
`cargo build --offline --locked --release --target wasm32-unknown-unknown
--manifest-path mainnet-release/v3/Cargo.toml --features contract`.
Copy the generated floorline_kill_test.wasm to artifacts/normal.wasm before tests.
The local harness currently reuses the existing disposable v2 sandbox launcher
and SDK installation; make these paths configurable before portable release.

## Remaining release requirements

Define a proof-backed or explicitly trusted and fully funded recovery mechanism,
prove receipt-order solvency, complete every missing runtime scenario and recovery
fuzz suite, measure gas/storage at history growth, freeze normal/fault manifests
with code hashes and reproducibility, then obtain independent security review.
No Codex run constitutes that independent review.

FullAccess custody/upgrade policy, monitoring and indexing, incident ownership,
deposit-cap coverage, storage liabilities and an approved real-money budget remain
blockers. Funding must cover actual code/state storage plus operational headroom,
registration, gas and backing; this report does not authorize any spending.

The next deployment gate is a new reviewed candidate with all missing tests and
independent audit cleared. Current recommendation is NO-GO.
