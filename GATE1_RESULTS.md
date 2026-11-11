# Floorline Gate 1 results

November 10, 2026 · E:\near-2 · **GO for Gate 2 runtime implementation and verification.** This is not deployment authorization, a completed security audit, or proof of three-track eligibility/deadline feasibility.

## Implemented and tested

- Replaced the rejected treasury-funded Model and native-collateral NFT fixture with one externally funded economic Engine and a near-sdk serialization shell. Old reports remain historical; their old test operations are not counted.
- Immutable rational issuance weight with exact nondilution admission; immutable redemption tax below 100%; exact requested redemption curve with one final downward rounding step and 512-bit intermediates. Positive-output and slippage checks; zero-supply contribution rejection and explicit bootstrap/full-exit policy.
- Separate backing, unused lender funding, borrower claims, lender repayment claims, other funded claims, prepaid storage, locked storage allocation, operational reserves and out-of-account in-flight cash. No treasury funding of loans or storage.
- FundedOffer -> Active -> Repaid OR Defaulted, with cancellation only before acceptance. Fixed debt/terms/lender. Exclusive loan-NFT ownership transitions; Carol transfers rights to Dave, Dave alone recovers collateral on exact repayment. Default credits collateral only to the lender. Locked FLOOR remains in total supply once.
- Modeled pending NFT transfer/resolution, settlement lock, stale/duplicate callback rejection, exclusive expiry rules, and withdrawal attempt/refund/retry accounting.
- Atomic rollback of all failed financial/storage/time/ownership operations. No admin mint, config mutation, reserved issuance or backing distribution method.

## Actual validation

**16 integration tests passed, 0 failed.** This consists of 14 focused scenario/edge-case tests, one 10,000-case independent BigUint curve oracle, and one new 10,000-sequence state-machine test.

New state-machine run:

```text
seeds: 10001..20000 inclusive
sequences: 10000
steps per sequence: 128
operations: 1280000
accepted operations: 606597
rejected operations: 673403
invariant failures: 0
```

Successes by generator kind, indexed 0..19:

```text
[4910, 63881, 63874, 63849, 18911, 12366, 6419, 4960, 2004, 3014,
 1285, 63783, 37521, 3771, 391, 63951, 63617, 64196, 63894, 0]
```

Kinds: issuance, contribution, redemption, offer funding, acceptance, cancellation, NFT transfer, NFT transfer-call start, NFT resolution, repayment, default, timestamp, withdrawal dispatch, withdrawal result, refund confirmation, storage deposit, storage refund request, FLOOR transfer, operational funding, deliberately unauthorized/wrong-amount repayment. All expected-success categories have successful coverage; the final adversarial category has no successful operation.

Each step independently recomputes token/collateral and cash partitions using BigUint, checks exact backing cross-products, loan-action preservation of L/T, permitted external cash deltas, and full-state rollback on error. An Error::Invariant from the engine's defensive postcondition itself fails the test; it is not counted as an ordinary rejected user operation. Trace, seed and step are printed on failure. No failing invariant seeds or counterexamples occurred; no minimization was necessary. This is deterministic randomized testing, not exhaustive proof or automated shrinking.

The separate wide-arithmetic oracle exercises 10,000 full-width input cases, checks exact rational-floor equality, pro-rata payout bounds and partial-redemption backing inequalities. Fixed cases cover near-u128-max arithmetic, accumulated balance overflow, output narrowing, timestamp overflow, zero supply, unreachable orphan backing, tiny deposits/quotes, complete exit, locked collateral, issuance after backing growth, exact expiry, conflicting settlement, old NFT owners, storage exhaustion, cancellation reuse, failed withdrawals and stale attempts.

## Commands executed and artifacts

Toolchain: rustc 1.99.1 (58cf8f9c3 2026-10-13), cargo 1.99.1 (5f94df478 2026-08-27), Windows MSVC host, wasm32-unknown-unknown target, near-sdk 5.30.1, uint 0.9.5. Dependencies resolved from the existing E: cache offline; lockfile updated.

Environment used for compilation/testing:

```powershell
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\target'
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
```

Commands executed during implementation/verification:

```powershell
cargo test --offline --no-run
cargo fmt
cargo test --offline -- --nocapture
cargo clippy --offline --locked --all-targets -- -D warnings
.\run-tests.ps1
```

The final runner executes:

```powershell
cargo fmt -- --check
cargo test --offline --locked -- --nocapture
$env:RUSTFLAGS='--cfg near'
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
```

Final formatting, strict Clippy, host tests and release WASM compilation passed. Raw WASM compilation uses near-sdk's on-chain cfg; this is not cargo-near deployment validation. Logs: `gate1-test-output.log`, `gate1-build-output.log`. Artifact: `target/wasm32-unknown-unknown/release/floorline_kill_test.wasm`.

Observed artifact SHA-256: `53F7DFA748A62D15B252786E5FFD27427FC73389BCCC5916D33EB181376C339F` (`Get-FileHash ... -Algorithm SHA256`). This identifies the local shell build, not deployed code.

An initial source compilation failed because uint's generated Result signatures collided with the engine Result alias; the macro is now isolated. Initial strict Clippy found only generated uint style lints; narrowly scoped allowances cover that dependency-generated module, not the economic engine/tests. No invariant test failure was hidden or weakened. Windows incremental compilation reported unavailable hard links and copied files instead, all within E:.

## Implemented but unverified in NEAR runtime

The same Engine and state types compile and serialize through the near-sdk WASM shell. Their actual storage footprint, gas use, Borsh runtime persistence, account authentication and receipt semantics have not been exercised in a NEAR runtime. Callback/refund events are deterministic model inputs. A modeled cash partition is not proof of actual account-balance conservation. Integer account IDs are not NEAR AccountIds.

## Not yet implemented

Public financial adapters, persistent gas-bounded storage collections, actual attached-deposit accounting, native transfer promises, measured storage management/refunds, full NEP-141/145/171 public interfaces/events, receiver contracts and runtime integration tests. No actual NFT contract interoperability, Sputnik execution, testnet transactions, signer/wallet/funding, key changes, frontend or deployment. No scheduled issuance cuts were added; this minimum engine uses one immutable issuance weight with admission checks. No optional lending features or target-track changes.

## Remaining security and solvency risks

1. Runtime adapters must derive identity/deposits/time from env, keep callbacks private, and never expose model authority 0 or confirm_refund as public shortcuts. Refund availability must be established by actual runtime behavior and persistent attempt state.
2. The cloned BTreeMap state and full invariant scan are a Gate 1 design; production per-operation gas/storage must be bounded. Illustrative storage units must be replaced with measured bytes and separately funded callback/headroom reserves. State/tombstone pruning is not implemented; retained storage allocation is not silently released.
3. Pending NFT callbacks deliberately freeze settlement; callback failure can strand a position. Gas guarantees, receipt recovery and standard receiver/forwarding behavior need runtime tests before money is accepted. No unsafe timeout settlement exists.
4. Fixed issuance weight can cease to pass the admission rule after backing rises. This protects holders but may block further issuance. Do not silently bypass the check for a DAO or operator.
5. External lenders may receive collateral worth less than principal; there is no lender principal guarantee. Supply/backing invariants do not guarantee token market liquidity, positive tiny payouts, or a USD floor. Donations are irrevocable after acceptance and can affect future issuance.
6. Standard compliance and immutability are not established; deployment keys must remain untouched under current authorization. All three tracks still require actual demonstrations and organizer eligibility confirmation.

## Gate 2 recommendation

**GO to the bounded runtime work in GATE2_PLAN.md.** No fundamental contradiction was found in the externally funded cash/collateral/NFT model, and Gate 1 checks pass. This decision does not pass any future runtime or deployment gate. If actual storage, callback recovery, NFT standards, real DAO action or the three required demonstrations cannot pass safely before the deadline, return NO-GO and abandon the submission rather than remove a track or weaken the guarantee.
