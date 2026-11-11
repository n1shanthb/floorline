# Floorline Gate 2 results — November 11, 2026

**GO for an explicitly authorized, controlled public-testnet demonstration.** No public deployment, wallet creation/funding, access-key removal or frontend was performed. This is not mainnet/public-funds approval, an audit, ownerlessness, full standards certification or confirmation of hackathon eligibility. The three target tracks remain Memecoins With Mechanics, NFTs That Do Something and Social Money.

## Implemented and locally runtime-tested

Replaced the serialization shell with a functional near-sdk contract using persistent LookupMaps and fixed aggregate counters. No ordinary operation clones all state or scans users, loans or claims. Runtime AccountIds, attached deposits, block timestamps, actual persistent storage and actual promise results supply authority/context. The Gate 1 wide arithmetic and economic admission rules are preserved.

Implemented FLOOR issuance/redemption, FT transfers/transfer-call/resolver, FT metadata/events; measured storage registration/top-up/withdraw/unregister/refunds and closed-record cleanup; externally funded fixed offers, acceptance, NFT ownership/transfer-call/resolver/metadata/events, exact repayment and lender default recovery; funded native claims with private result callbacks and conservative known-failure retries; payable contribution from a real local caller contract without minting.

The adapter allows standard NFT forwarding while pending. It keeps repayment/default locked until all pending resolutions finish, without reverting a forwarded NFT away from its actual current owner. Public FT methods cannot access collateral escrow. Receiver refunds cannot mint or consume encumbered collateral. Loan actions never change L or T.

## Actual test counts and scope

**31 local sandbox scenario groups passed; zero final failures.** The final run contains **234 measured method invocations and 455 recorded receipt outcomes**, plus fault/growth summary entries for **237 evidence entries** total. The separate metadata/supply/storage view script passed. These are real near-sandbox executions, not ordinary Rust tests being counted as integration evidence.

All 15 checkpoint states in the principal economic scenario match the Gate 1 reference: L, T, locked supply, six participants' available FLOOR, unused lender cash, borrower claims, lender claims and redemption claims. The actual native payout results, accounting/storage requirements, gas, receipt statuses and storage deltas are captured. Concurrent-claim snapshots can overlap in time; they are not mislabeled as isolated sequential cash deltas.

Host/reference validation also passed again: **17 Rust tests** (16 existing Gate 1 tests plus the new runtime-reference export). The 10,000 redesigned state-machine sequences/1,280,000 operations and 10,000 arithmetic oracle cases remain **host evidence**, not sandbox sequence counts. No failing invariant seeds occurred in this rerun. Strict WASM-target Clippy and both crate formatting checks passed.

Passing runtime scenarios cover:

- Native issuance, transferable FLOOR, partial redemption and successful native claim payout; dilutive issuance and unexpected deposits rejected.
- Lender funding separate from backing, Carol collateral lock/real NFT/real principal claim, Carol->Dave transfer, exact Dave repayment, recovered collateral and funded lender payout; old-owner, double-accept, double-repay and default-after-repay rejection.
- Separate default and lender recovery, repayment-after-default and double-default rejection; actual before-expiry repayment and after-expiry default execution timestamps checked.
- FT honest/reject/malformed/panic/forward receipts and a receiver that locks tokens before refund; no refund reaches the locked collateral.
- NFT honest/reject/malformed/panic/out-of-gas/forward receipts; repayment/default attempted while a resolution is pending; final exclusive ownership and settlement preserved.
- Exact one-yocto guards, canonical NFT IDs, protected escrow, wrong claim owner, forged callback calls and a self-call lacking promise-result context.
- Measured storage exhaustion rollback, sponsored registration, registration-only excess refund, full unused-credit withdrawal, unregistration, and negative storage deltas for actual cleanup.
- Concurrent native claims; actual transfer failure to a deleted **local ephemeral** recipient; recreation of that local recipient and successful known-failure retry to the same identity.
- A real native transfer followed by callback gas exhaustion in a separate local fault artifact. State stays InFlight; both retry and duplicate withdrawal reject. No unknown result is guessed from elapsed time.
- Forty accumulating unused offers and twelve additional users with accumulating live/closed loans and native claims; bounded gas measurements described below.
- An actual local DAO-style caller contract transfers 0.1 NEAR to contribute; L rises exactly 0.1 NEAR and T does not change. This is not Sputnik governance execution.

## Measured gas

Values below are **total burned Tgas across the transaction and recorded receipt chain**, including native/refund/action overhead, not merely prepaid allocations or estimates. They apply to the final local 2.14.0 sandbox/protocol 88 run.

- Issuance: 2.2053 Tgas.
- Redemption: 2.8087–2.8173 Tgas.
- Offer funding: 2.5179–2.5281 Tgas.
- Loan acceptance: 3.2822–3.2927 Tgas.
- NFT transfer: 2.6983–2.7084 Tgas.
- Repayment: 3.4685–3.4799 Tgas.
- Default: 2.8646–2.8759 Tgas.
- Native claim withdrawal and callback: 5.2127–5.2772 Tgas.
- FT transfer-call receipt chain: 8.1132–12.7121 Tgas.
- NFT transfer-call receipt chain: 8.7394–58.9370 Tgas; the maximum includes intentional receiver exhaustion of its 50 Tgas budget and successful safe resolution.

Individual example contract receipts: FT acceptance resolver 2.4452 Tgas; NFT acceptance resolver 2.5856 Tgas; native payout callback 1.8191 Tgas; NFT revert resolver after receiver exhaustion 3.2482 Tgas. Production reserves 30 Tgas for callbacks with zero unused-gas weight. Transfer-call/withdraw entrypoints conservatively require at least 110 Tgas prepaid; the tests attach 300 Tgas to include orchestration and failures. No essential operation approached the 300-Tgas transaction limit in the measured workload.

History-growth samples: first/20th/40th additional offer funding used 2.517939/2.520219/2.520249 Tgas, each with 298 persistent bytes added. First/12th added-user acceptance used 3.282193/3.292658 Tgas. Historical records accumulate; no linear scan is present in these methods. This is finite growth testing, not a proof about arbitrary future state sizes or every protocol gas schedule.

## Measured storage and actual cash

- Normal WASM: **443,613 bytes**. Measured maximum-length user registration minimum: **206 bytes = 0.00206 NEAR** at the local runtime's 10^19 yoctoNEAR/byte price. Actual tested account insertions were 164–168 bytes.
- Offer insertion: **298 actual persistent bytes**; it prepays a measured maximum-size record so future owner/borrower fields can grow safely. Acceptance net state delta **63–67 bytes**, including its funded payout claim and replacement of maximum placeholder fields; separate allocation accounting covers both records.
- Redemption claim: **141–145 bytes**. Repayment claim: **145–146 bytes**. Native attempt/status transitions add **zero bytes**, using existing fixed-width claim fields.
- Normal transfer-call callback records are removed within the receipt chain; net FT delta was zero in normal cases. The borrow-inside-FT-receiver scenario adds actual loan/claim state. NFT final net deltas can be -1 to +3 bytes as owner AccountId lengths change; the original maximum-size allocation covers that change.
- Closed-loan cleanup removed **298 bytes**; paid cancellation-claim cleanup removed **147 bytes**; empty-account unregistration removed **164 bytes** after native refund bookkeeping resolved. Prepaid storage credit is released to the original payer, never from L.

At the final recorded normal-contract boundary:

```text
actual account balance A = 129021867159581070181402692 yoctoNEAR
local required cash     = 113604371623327637581402692 yoctoNEAR
L                       =  99137461623327637581398651 yoctoNEAR
T                       =  98800000000000000000000000 FLOOR atomic units
storage total deposits  =   9200000000000000000000000 yoctoNEAR
protected operational O =   4578910000000000000000041 yoctoNEAR
actual storage usage    = 471018 bytes
actual storage stake    =   4710180000000000000000000 yoctoNEAR
unresolved native I     = 0
```

Unallocated balance remains separate from L. Remaining local offers/claims/collateral are intentional test state, fully accounted; cleanup does not silently remove live obligations. The injected-failure contract is a different account and deliberately retains an unknown-outcome claim locked. See RUNTIME_ACCOUNTING.md for equations and conservative retry conditions.

## Failures found and corrected, without weakening invariants

1. **Operational-reserve accounting bug:** minimal case is initialize a funded account with O=all its cash, then sign a rejected transaction with the contract's own key. Gas burns from that account while booked O stays unchanged, so A<required. Fixed by protecting measured storage/headroom and treating excess deployment funding as unallocated. The same actual-balance reconciliation and self-signed rejection test now pass. Evidence: initial-operational-reserve-failure.json. Retained full-access keys still prevent any ownerless/immutable claim.
2. **FT receiver fixture mistake:** an existing receiver forwards the new tokens but returns null. The correct standard resolver requests refund of all unused tokens and may refund the receiver's older available tokens. Fixed the fixture to return zero unused tokens after forwarding, rather than weakening the resolver or test. Initial evidence retained in initial-ft-fixture-failure.json.
3. **Storage test-helper bug:** cleanup returned a negative delta in recorded evidence, but measure did not return that field to the assertion. Fixed the helper return value; actual 298-/147-byte cleanup assertions now pass. Evidence: cleanup-harness-failure.json.
4. **Fault-fixture calibration:** zero gas rejected dispatch before the intended scenario; 1 Tgas allowed the callback to finish. The final fault build allocates positive 0.001 Tgas with zero unused weight, producing actual post-transfer callback exhaustion. Earlier fault attempts and the final probe are retained and are not counted as successful production scenarios.

No financial invariant assertion was deleted. The retry guard was also hardened during review to reserve **all** unresolved native transfers when checking actual refund availability, not merely the failed claim's amount.

## Exact commands and environment

Windows Rust/Cargo/cache: E:\toolchains\cargo and E:\toolchains\rustup; build output E:\near-2\target; TEMP/TMP E:\near-2\.tmp; npm cache E:\near-2\.npm-cache. Existing Ubuntu WSL is stored at E:\WSL\Ubuntu. Sandbox binary, genesis keys, database and logs are in E:\near-2\.sandbox. Local client keys are ephemeral memory only; no private material is in evidence files.

The official near-sandbox archive was downloaded from:

```text
https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/Linux-x86_64/2.14.0/near-sandbox.tar.gz
```

Archive SHA-256: A0BA004218B218BD74351795E7CE2EDA4A2B6AF5CD3E252BD5E8BFE3C8F2E691. Running node: near-sandbox 2.14.0, commit bc4e9e8cfb03d9e82f027883055624e18576993e, latest protocol 88. No kernel parameters or system packages were modified. A duplicate slower curl download timed out; the complete verified-length archive came from the Windows download. WSL foreground execution was needed to keep the node alive after a launcher exited.

Core commands actually executed (with E: environment above):

```powershell
npm install --prefix E:\near-2\runtime --ignore-scripts --no-audit --no-fund near-api-js@5.1.1
cargo test --offline --test runtime_reference -- --nocapture
$env:RUSTFLAGS='--cfg near'
cargo build --offline --release --target wasm32-unknown-unknown --manifest-path fixtures\Cargo.toml
cargo build --offline --release --target wasm32-unknown-unknown --features contract
cargo build --offline --release --target wasm32-unknown-unknown --features contract,fault-injection
cargo clippy --offline --locked --target wasm32-unknown-unknown --features contract -- -D warnings
cargo fmt -- --check
cargo fmt --manifest-path fixtures\Cargo.toml -- --check
Remove-Item Env:RUSTFLAGS
cargo test --offline --locked -- --nocapture
node runtime\fault-only.mjs
node runtime\test.mjs
node runtime\verify-views.mjs
node runtime\summarize.mjs
```

The node was initialized using `near-sandbox --home /mnt/e/near-2/.sandbox/node init --fast`, then run inside existing Ubuntu using the E:-resident binary with `--home /mnt/e/near-2/.sandbox/node run --rpc-addr 0.0.0.0:3031 --network-addr 127.0.0.1:24568`. The reproducible launcher now binds RPC to loopback. The client explicitly rejects non-local RPC URLs and non-sandbox chain IDs. Sandbox accounts are created/funded only from local genesis funds. Only one ephemeral receiver was deleted/recreated to test failure; no public account or deployment access key was changed.

runtime/build.ps1 and runtime/run.ps1 package the same build/reference/test/view/summary steps. The final host test and final production-target Clippy logs contain only a Windows incremental hard-link fallback notice; files were copied within E: and all checks passed. A raw build is not a cargo-near reproducible-container attestation.

## Reviewable artifacts

- Normal artifact SHA-256: **529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6**.
- Actual normal deployed local code hash: **6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9**. The summarizer verifies this matches every measured normal-contract account snapshot.
- Fault artifact SHA-256: **4e1f731200d4555fbed310580ad7c4c1477cc4839163d02d805d9a4c2460cf31**. Never deploy this as Floorline.
- Evidence: runtime/evidence/runtime.json (actual local hashes/receipts/balances/gas/storage), summary.json (source/artifact hashes and measurements), reference.json, views.json, host-tests.log, console.log and fault-probe.json.

Local transaction hashes are not public-testnet hashes and have no public explorer links. No invented transaction evidence is supplied.

The local sandbox is stopped after evidence collection; its E:-resident data and keys remain intact. Restart it with runtime/start-sandbox.sh for another local run. No public deployment is running.

## Implemented but unverified / remaining risks

- Failed **storage refund** retry is implemented but not separately exercised; the genuine failed/retried native test is a loan claim. Other storage refund successes and cleanup passed.
- Exact nanosecond equality at expiry is tested in the reference engine, not forced in a wall-clock sandbox block. Actual runtime timestamps satisfy the intended before/after branches and comparisons.
- Unknown callback outcomes remain locked permanently, including NFT settlement. This avoids double payouts/recovery but is a liveness limitation. The deliberate fault build proves fail-closed behavior; production gas headroom passed the finite measured workload, not every possible future protocol condition.
- Full force-burning NEP-145 unregistration, approvals/enumeration/markets and generalized third-party wallet certification are not supported or claimed. See STANDARDS_COMPLIANCE.md for exact status.
- No audit, public protocol-version validation, actual Sputnik vote/execution, ownerless key policy or public deployment has occurred. A local donor fixture proves payable contract-to-contract contribution only.

## Decision

**Gate 2's essential economic/runtime path is justified for a small, controlled public-testnet demonstration after separate authorization.** Keep all limitations explicit and accept no public/mainnet funds. If the next gate cannot demonstrate actual project-DAO governance plus the NFT and token mechanics before the deadline, return NO-GO rather than removing a track. TESTNET_DEPLOY_PLAN.md supplies the concrete artifact, roles, funding basis, policy checks, proposal payload and evidence requirements for authorization review.
