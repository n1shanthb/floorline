# RC1 fresh-testnet unsigned preflight — authoritative current status

November 14, 2026. This section supersedes current readiness statements below. Financial source and approved artifacts are frozen and unchanged. No signing, broadcasting, funding, key creation, credential access or deployment occurred. Public RPC queries only; actual spending is zero.

## Required verdicts

RC1 ARTIFACT: VERIFIED — normal SHA-256 `31f85eac588646f65b07c8b90566457f797f71b479b4d6c9a78b892912ba326b`, code `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`, 453,798 bytes. Financial source `c182351`; hashes match the frozen source/lockfile manifest.

TESTNET ACCOUNT PREFLIGHT: BLOCKED — public project account candidates exist, but owner selection/current signing control and the new contract FullAccess public key are unconfirmed. No credentials were opened.

CAP COMPATIBILITY: PASS — unchanged 0.01 action/debt, 0.05 lifetime gross, 0.02 per-user storage credit, 128 admission slots. Four initial registrations occupy four slots and attach 0.02 each. Sandbox-measured maximum-account registration minimum is 0.00462; live bounds must be checked again. Planned admitted gross is exactly 0.016; exact repayment is 0.0022 and is separately funded. No storage top-ups are required in the revised plan. Existing loan/claim/storage exits do not consume new-risk gross. Direct transfers never become admitted backing automatically.

13.24 TESTNET NEAR CEILING: SUFFICIENT at the refreshed protocol-88 quote and conservative reservation model, NOT funded or approved. Actual controller spendable balance is only 0.5501983820616849 NEAR at the snapshot. Additional funding needed to make the full proposed allocations available is 12.6898016179383151 NEAR. No faucet or funding request was made.

ATOMIC DEPLOYMENT: BLOCKED — batch structure and bytes validated, public account/key selection, current funding and spending approval absent.

ACCEPTANCE TRANSACTION GRAPH: BLOCKED for real execution — static dependencies, cap accounting, ownership/collateral and token conservation model pass; receipt IDs and fresh quotes remain intentionally unresolved. Expiry requires finalized chain time. No public receipts have been generated.

STAGING WALLET: BLOCKED until approved fresh account configuration and verified deployed code exist. The isolated build is ready for that configuration, but authenticated signing is UNVERIFIED. Existing live v1 website is unchanged.

INDEPENDENT AUDIT: PENDING. MAINNET: NOT AUTHORIZED.

## Public owner-configuration candidates, not an approved selection

Public historical project evidence and current finalized RPC state identify controller `floorline-g3-20261111-6702ea.testnet`; holder `alice.floorline-g3-20261111-6702ea.testnet`; borrower `carol.floorline-g3-20261111-6702ea.testnet`; NFT holder `dave.floorline-g3-20261111-6702ea.testnet`; lender `lender.floorline-g3-20261111-6702ea.testnet`. Each currently has a FullAccess public key. Candidate fresh receiver `rc1.floorline-g3-20261111-6702ea.testnet` returned UNKNOWN_ACCOUNT. This address is a proposal, not a created account; availability must be rechecked immediately before authorization. No v1 address is reused. Account balances and public key identities are recorded in `release/preflight-20261114/rpc.json` and `owner-candidate.json`. An on-chain public key does not establish present owner possession or browser-wallet access. These are operator-controlled test roles, not independent human governance.

The controller would be initializer predecessor/guardian; the unsigned same-receiver batch is CreateAccount, Transfer 8 NEAR, AddKey owner-selected FullAccess key, DeployContract exact normal bytes, then `new` with tax_bps 2000, issuance numerator/denominator 1/1 and the unchanged limits above. Creation fails if the named child already exists; deployment/init are in one action receipt, so there is no separately finalized uninitialized interval. Action atomicity does not eliminate burnt fees on failure or authorize retry on uncertainty. Runtime distinguishes administrative actor authorization from the receipt predecessor used by the VM; verify guardian equals the approved controller after FINAL success. See pinned [nearcore runtime](https://github.com/near/nearcore/blob/2.14.0/runtime/runtime/src/lib.rs) and [transaction specification](https://near.github.io/nearcore/RuntimeSpec/Transactions.html). Exact receiver, key and chain-specific recent block/nonce remain unsigned blockers. No nonce or signed blob is generated here.

## Acceptance graph correction and receipt checks

The original deferred cleanup could strand the staging UI below its conservative 0.01-NEAR available-storage gate before a later offer, although contract credit itself remained sufficient. Nonfinancial tooling now schedules each paid claim and closed loan cleanup immediately after settlement. This preserves the same 39 transactions, amounts, economics, caps and stop-last rule. It releases storage before the next offer and releases borrower references before unregistration. `check-graph.mjs` passed symbolic receipt dependency, correct NFT holder repayment/collateral return, lender default collateral, exact repayment, cancellation, no live borrower rights at unregister, and total token conservation assertions. This is explicitly an offline model, not fabricated chain evidence.

The repayment branch transfers the loan NFT to the NFT holder before repayment; the separate default branch waits for finalized expiry and releases collateral to the lender. Every returned loan/claim ID must come from its actual finalized earlier receipt; the fresh redemption min_out must be reviewed against a block-pinned quote. Every financial step requires exact ledger liability sum, cash coverage and storage-stake coverage, preserving separate inflight accounting. No automated retries exist.

Receipt reconciliation was strengthened to reject extra actions, duplicate outcomes, missing receipt descendants, unknown/failed child outcomes and mismatched reviewed gas when supplied. Positive actual sandbox fixtures and negative wrong-receiver, non-FINAL and missing-child fixtures passed. New fixtures live only in the new preflight directory; frozen RC1 evidence is untouched. Independent RPC retrieval and provenance checks remain necessary: a local checker cannot authenticate arbitrary supplied JSON by itself.

The irreversible stop remains transaction 39 and LAST. Consequently this specific public plan does not prove exits after stopping. Existing sandbox evidence does; claiming public post-stop acceptance would be false. To add that public demonstration, the owner must approve an additional transaction/budget review or a separately reviewed plan with existing exit rights deliberately left open. No new-risk action is scheduled after stop.

## Refreshed integer funding reconciliation

Official testnet RPC queried at `2026-11-14T03:46:18.364Z`: chain testnet, protocol 88, storage byte 10^19 yoctoNEAR, spot gas 10^8, minimum purchase price 10^9. The funding model reserves the higher gas price. `budget.json` includes current protocol fees for CreateAccount, AddKey, 453,798 deploy bytes, initialization, four funding transfers and stop: controller upper gas reservation 0.283633836038662 NEAR fits the 0.75 contingency. Actor reservations use 120 Tgas per call plus each attached amount, 0.1 buffer and upward rounding. Contract allocation 8, holder 1.94, borrower 1.21, NFT holder 0.37, lender 0.97, controller 0.75 sum exactly 13.24.

The contract's conservative 527,526-byte storage upper bound costs 5.27526 NEAR, including the 128×512-byte protected exit reserve of 0.65536. Adding 2.5 operating liquidity leaves 0.22474 within 8. User storage total 0.08 and financial deposits are inside the actor allocations, not additional funding. Storage is locked coverage, not gas expenditure; principal, backing, user deposits and spare actor balances remain funds in their respective accounts. Gas figures reserve full prepaid budgets, not measured costs. No account balances were spent. The proposed receiver is new, while existing actor balances are retained and planned allocations are additional. Funding sufficiency is conditional on unchanged protocol quotes and receipt envelopes; refresh immediately before signing and stop if requirements exceed the ceiling.

## Staging and audit handoff

Staging pins the frozen code hash, testnet My NEAR Wallet, testnet RPC/network checks, 110-Tgas callback methods, live registration quote, immutable limit/stop state and isolated RC1 browser journal. Unknown outcomes warn and block resubmission. No VITE_CONTRACT_ID is selected: its disabled default remains correct. Static configuration cannot be claimed to match an approved fresh address until the owner actually selects it. Previous typecheck/lint/65 tests/build and disabled desktop/mobile evidence remain valid; browser signing has not been rerun or claimed. No frontend implementation changed in this preflight.

An allowlisted auditor handoff is frozen under `release/preflight-20261114/auditor-handoff/` and its ZIP, with `AUDIT_INDEX.json` listing exact source/lockfile/artifact/evidence hashes, reproduction commands, native payout/storage callback transitions, 128-slot accounting, gross controls and FullAccess upgrade threats. Fault bytes are separately labeled test-only. The handoff excludes all credentials, node_modules and build caches. It retains the limitations: unknown outcomes remain InFlight; retries require known failure and sufficient local liquidity; infinite loss can exhaust finite admission; protocol changes and retained FullAccess keys invalidate simplistic safety claims. This prepares an independent auditor; it does not constitute an independent audit.

## Minimum information and authorization for next execution

Confirm or replace the six candidate public account IDs above; confirm present control of controller and four actor signing accounts; select the new contract's FullAccess **public** key and custody policy. Approve the exact normal artifact, atomic initialization, unchanged immutable caps, 39-transaction graph with stop last and the proposed 13.24-testnet-NEAR ceiling, including an authorized source of controller funding. Confirm whether public post-stop exits must be added before final execution approval. Do not send private keys. Existing testnet wallets must be configured through an authorized local/wallet workflow only after approval.

Then rerun owner-specific read-only key/balance/account/protocol preflight, bind and review every unsigned intention, and obtain explicit authorization for the bounded public signing/funding/deployment execution. Nothing here grants it. Mainnet, v1, historical receipts, production keys and live routing remain untouched.

---

# Previous RC1 assessment — historical where superseded above
# FLOOR release candidate RC1 — current release decision

This section supersedes every earlier assessment below. Earlier sections are retained as historical evidence. No public transaction, deployment, key operation or live frontend switch was performed in this workstream.

Financial source commit: `c182351`. Normal WASM SHA-256: `31f85eac588646f65b07c8b90566457f797f71b479b4d6c9a78b892912ba326b`; NEAR code hash: `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`; size 453,798 bytes. Fault-injection SHA-256: `f0f66d0674540addab608e8520a806603957a0287c5ba73099b50c675b0c895b`. Never deploy the fault artifact. Exact sources, compiler, byte-for-byte rebuild, runtime code checks and measurements are frozen in `runtime/evidence/release-rc1/RELEASE_MANIFEST.json`. This candidate requires a fresh account and initialization; no migration of v1 is authorized.

## Exposure controls and safe exits

Immutable initialization limits bound individual new native exposure, lifetime cumulative admitted exposure, and each attached/retained user storage credit. Omitted limits default to zero: issuance, contribution, loan funding and storage deposits are disabled. Gross exposure never resets after withdrawals or zero supply. Loan repayment is bounded at origination, then remains payable without consuming the new-risk gross budget. Storage is separately funded and capped; it does not consume that budget. Direct native transfers are unallocated cash, not automatically credited backing.

The initializer predecessor is a guardian with an irreversible stop for issuance, contribution, offer funding and acceptance. There is no resume or cap setter. Existing redemption, repayment, default, offer cancellation, funded claims, storage refunds and cleanup remain available, subject to their normal conditions. The guardian cannot redirect or seize funds through this API. Retained FullAccess keys can replace code and bypass these properties: custody and upgrade policy remain external security requirements.

Proposed owner-review caps, NOT approved: 0.01 NEAR per new action/debt, 0.05 NEAR cumulative new-risk inflow, 0.02 NEAR storage deposit/credit per user. Sandbox fixtures use explicitly different limits and do not authorize deployment values. An omitted or stopped configuration cannot later be enabled; a new deployment would be required.

## Executed validation

The new normal financial artifact passed 32 full runtime groups (240 evidence entries), 16 host economic tests, 10,000 randomized sequences (1,280,000 operations; seeds 10001–20000), wide arithmetic cases and strict WASM Clippy. No failing seeds were observed. The fault artifact admitted 128 lost-callback full-unregistration refunds; the 129th admission was rejected without consuming existing rights. Known failed receiver recovery, duplicate/stale attempts, overlapping payouts, maximum input envelopes, three 109/110-Tgas boundary cycles, cap boundaries, unauthorized stop, and repayment/default/redemption/storage exits after stopping passed. Raw receipts and console outputs are preserved in `runtime/evidence/release-rc1/`.

These are bounded engineering tests, not an independent audit. Genuinely unknown native-transfer outcomes remain quarantined, not magically resolved. Conservative retry liquidity, finite 128-slot admission and protocol/storage-price assumptions remain explicit limitations. Cross-user availability is bounded by pre-funded admission and retry liquidity; indefinite unknown refunds can exhaust future admission. Existing rights remain funded under the stated accounting model.

## Isolated staging

`release/staging/` is a separate copy; the public frontend remains unchanged. It pins the new code hash, rejects the previous contract target, uses 110 Tgas for callback methods, isolates browser journals, checks live pilot/admission limits and stop state, quotes storage top-ups from current credit, and warns against resending unknown payouts. Historical activity remains verified replay. Without an approved fresh testnet account it renders a disabled staging screen and exposes no signing buttons. DAO signing is blocked without an explicitly configured DAO.

Typecheck, lint, 65 tests and production build passed. Actual browser checks passed at desktop 1440×1000 and mobile 390×844 with no overflow, page errors or RPC calls on the disabled screen. Screenshots and `staging-browser.json` are in the RC1 evidence directory. Configured-chain browser flows and authenticated wallet signing are UNVERIFIED. SDK eval/browser-util and ineffective dynamic-import build warnings remain for audit/CSP review. This is staging readiness, not public acceptance.

## Unsigned deployment and acceptance package

Run `node release/prepare.mjs` from this directory to regenerate unsigned manifests. `release/owner-config.example.json` contains public placeholders only. With reviewed public configuration, the tool can read official RPC network/protocol state, verify account availability and public access keys; this owner-specific preflight has NOT run because accounts and approval are absent. No signer or broadcast implementation is included. `node release/check-package.mjs` passed integer funding conservation and positive/negative receipt reconciliation checks.

The plan has 39 intended signed transactions: one atomic fresh-account CreateAccount/Transfer/AddKey/DeployContract/new batch, four actor funding transfers, and 34 financial/control calls. It includes registration, issue, FT transfer, redemption/withdrawal, externally funded loan/NFT transfer/repayment, expiry/default, offer cancellation, contribution, cleanup, storage exits and the irreversible stop last. `release/acceptance-plan.json` records exact deposits and dependencies. Receipt-derived IDs and fresh quote placeholders must be resolved and reviewed before signing; unresolved templates are not executable transactions. Actors are controlled test roles, not evidence of independent human governance.

Stop on non-FINAL, unknown outcomes, RPC disagreement or failed child receipts. Never automatically resend. Reconciliation validates supplied finalized results against reviewed intent and solvency snapshots; it is not cryptographic authentication of arbitrary supplied JSON. Independently fetch receipts and account/code state before acceptance. Atomic deployment action/code/key verification is separately required.

## Funding and custody gates

The proposed ceiling is **13.24 NEAR per network**, superseding the preliminary 10.75 estimate. It is NOT approved and does not inherit the older 10-NEAR DAO-demo authorization. Allocation: contract 8; holder 1.94; borrower 1.21; NFT holder 0.37; lender 0.97; controller gas/contingency 0.75. Actor financial/storage deposits are already included, not added again. New-risk plan inflow is 0.016 NEAR; repayment 0.0022; initial user storage deposits total 0.08.

Raw official testnet/mainnet protocol-88 quotes are in `testnet-costs.json` and `mainnet-costs.json`. Storage price is 10^19 yoctoNEAR/byte; spot gas 10^8 and minimum gas purchase price 10^9 yoctoNEAR/gas. Budget uses the larger price and 120 Tgas per planned call (110 plus scheduling allowance), actor buffers and upward rounding. Contract storage upper bound 527,526 bytes costs 5.27526 NEAR, including the 0.65536 admission reserve. Adding 2.5 operating liquidity fits 8 NEAR with 0.22474 margin. This is a conservative funding proposal, not a guaranteed fee or immutable future protocol price. Refresh all quotes and requirements immediately before any approval.

Mainnet allocation is a draft comparison only: authorized real-money exposure is zero. Owner-controlled FullAccess retention during acceptance is disclosed, not ownerless immutability. Independent security review, custody/upgrade signoff, protocol-change response and operational monitoring are mandatory before mainnet. Monitor code/access-key changes, exact funded liability buckets versus cash/storage stake, cap/gross/stop/admission state, every payout callback, receipt-finality disagreement and unknown-outcome quarantine. No emergency response may assume an unknown transfer failed.

## Current verdict and exact next approval

RELEASE CANDIDATE: BUILT. EXPOSURE CONTROLS: PASS within the stated model. ECONOMIC AND RUNTIME REGRESSIONS: PASS. TESTNET DEPLOYMENT PREFLIGHT PACKAGE: READY FOR OWNER REVIEW; actual execution BLOCKED pending public account/key configuration and approval. FRONTEND STAGING: READY as a disabled isolated build; configured wallet acceptance UNVERIFIED. INDEPENDENT AUDIT: PENDING. MAINNET: NOT AUTHORIZED / NOT EXECUTED, NO-GO.

Next approval must identify fresh contract/controller and four actor public account IDs and public keys, approve atomic initialization, immutable caps, retained-key policy and the new 13.24-NEAR testnet ceiling. Do not send private keys in chat. After read-only owner-specific preflight and approval, a separately authorized signing workflow must execute and reconcile every real testnet receipt before any public switch. Mainnet requires a separate audit and launch decision. v1 artifacts, deployment, historical evidence, FloorKit and live frontend remain unchanged.

---

# Historical assessments — superseded by RC1 above
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
