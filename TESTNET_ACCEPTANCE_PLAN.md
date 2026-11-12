# Wallet-led testnet acceptance plan

Status: **PREPARED; NOT AUTHORIZED/EXECUTED AS NEW SIGNED TRANSACTIONS**.
No private keys are requested. Operators must control their own wallet sessions
and explicitly approve each test. No public deployment, faucet call, account/key
creation, contract redeploy, key deletion, mainnet operation or treasury reset.

## Fixed targets and prerequisites

FLOOR: `floor.floorline-g3-20261111-6702ea.testnet`, code hash
`6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9`.
DAO: `floorline-g3-20261111-6702ea.sputnikv2.testnet`, code hash
`AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH`.

Use the local production preview, or a separately authorized verified HTTPS SPA
deployment. Connect My NEAR Wallet's **testnet** instance. Confirm wallet account,
receiver, method, full base-unit args/deposit and gas at every review. No access
key is requested by this app. Record viewport, build revision and public hashes.

Existing public role IDs, requiring owner confirmation and wallet access:

- Holder: `alice.floorline-g3-20261111-6702ea.testnet` — observed 1.1 FLOOR.
- Lender: `bob.floorline-g3-20261111-6702ea.testnet` — observed 0.3 FLOOR.
- Borrower: `carol.floorline-g3-20261111-6702ea.testnet` — observed 0.2 FLOOR.
- NFT recipient: `dave.floorline-g3-20261111-6702ea.testnet` — observed 0.2 FLOOR.
- Council A: `floorline-council-a-20261111.testnet`.
- Council B: `b.floorline-council-a-20261111.testnet`.
- Council C: `c.floorline-council-a-20261111.testnet`.

These are existing project-controlled identities, not invented external people.
Recheck balances at execution; observed role balances are not a promise of wallet
availability. Use distinct browser profiles for role sessions. Council A needs
the live proposal bond (currently 1 NEAR) plus upfront gas headroom. B/C need
250-Tgas wallet gas reservation headroom; loan roles need the exact deposit plus
30/110-Tgas headroom. Current role balances are in LIVE_TESTNET_READS.json; any
top-up needs separate explicit authorization. Never silently acquire keys/funds.

New acceptance gross budget ceiling proposed for explicit approval: **2.10 testnet
NEAR**, including up to 1 NEAR bond, 0.09 NEAR gross loan principal, 0.055 repayment,
0.15 storage top-ups, 0.01 direct contribution, 0.10 DAO contribution and 0.60 gas
contingency (2.005 total allocated; remaining 0.095 contingency). Principal,
repayment and bond are capital flows, not all irrecoverable fees. No guaranteed
bond refund is presumed. Wallet upfront reservation is separate from gas spent.
Retain the earlier **10-testnet-NEAR cumulative DAO budget ceiling**; this does
not reset that budget or authorize a further 10 NEAR. Stop on insufficient funds,
changed gas cost, unexpected bond or exhausted budget. No faucet evasion.

## Before each action

Capture finalized block hash/time, code hashes, L/T, native A, every reserve bucket,
inflight/refund storage, actor native/FT/storage balances, loan/NFT/claim state,
and current DAO policy/proposal. Preflight uses a common finalized block and
repeats immediately before wallet approval. State can still change while the
wallet is open; the contract remains final authority and failures must be shown.

For each signed action retain the actual transaction hash, signer, receiver,
args, deposit, prepaid/used gas, all receipt outcomes and before/after state.
Require FINAL, matching intent and all relevant callbacks; no parent-only proof.
After receipt, verify the browser's balance, NFT, claim, proposal and Activity
views update without page-local fabricated state. Unknown results stay pending;
read-only recheck must never submit again. Do not overwrite original evidence.

## Sequential cases and expected accounting

1. **Connection/negative checks.** Disconnected buttons open connection, not
   signing. Wrong RPC chain/code, insufficient native/FT/storage, rejected wallet,
   network failure and stale minimum must block or report truthfully. Check
   unknown callback quarantine. Do not deliberately induce real callback failure
   or destructive account deletion on the approved public deployment; those are
   historical sandbox/failure-case evidence, not authority for a new fault test.
2. **Storage.** If needed, B reviews 0.05 NEAR self storage registration. L/T stay
   constant; only storage/native buckets grow. If testing unused credit withdrawal,
   do it last: exactly one yoctoNEAR, 110 Tgas, all final refund receipts succeed,
   free credit decreases and allocated credit remains. Unknown refund is not safe
   to repeat; the deployed contract lacks a public refund-record view.
3. **Fresh issuance eligibility.** At observed L=2.019 and T=1.9, any positive 1:1
   issue must be disabled before wallet approval. This is an expected economic
   gate, not a missing workaround. No new successful issuance is expected.
4. **FT transfer.** Alice sends 0.01 FLOOR to Dave after recipient registration
   check. Alice -0.01, Dave +0.01, L/T/locked unchanged; one yocto goes outside L.
5. **Redemption.** Alice redeems 0.05 available FLOOR with 50-bps tolerance.
   With starting reserve L and supply T, compute exactly
   `q=floor(L*c*(8000*T+2000*c)/(10000*T*T))`, `min=floor(q*9950/10000)`.
   L decreases q, T decreases c, redemption claim increases q. Then separately
   withdraw the returned claim ID with 110 Tgas: actual native cash decreases q,
   callback records Paid, claim cannot be withdrawn again. Fees vary separately.
6. **Funding/cancel.** Bob escrows 0.02 NEAR with fixed repayment>=0.02, collateral
   0.05 FLOOR, term 24 hours. L/T stay constant, unused lender +0.02. Save funding
   hash and returned actual offer ID. Cancel as Bob; unused lender -0.02 and
   cancellation claim +0.02; withdraw once. No placeholder loan ID is evidence.
7. **Loan/NFT/repay.** Bob funds 0.05 NEAR, debt 0.055, collateral 0.10 FLOOR,
   24 hours. Carol verifies the exact funding receipt, accepts: Carol free FLOOR
   -0.10, contract locked +0.10, unused lender -0.05, borrower claim +0.05;
   L/T unchanged. Carol withdraws principal. Transfer NFT to registered Dave with
   explicit rights acknowledgement and one yocto. Dave owns the NFT; borrower
   identity does not grant Carol ongoing recovery rights. Dave repays exactly
   0.055 before expiry: NFT burns, locked -0.10, Dave free FLOOR +0.10, lender
   claim +0.055; Bob separately withdraws that claim. Verify old-owner repayment,
   double repayment/default and repeat withdrawal cannot succeed; do not spend
   deposits on known-invalid cases if the frontend already blocks them.
8. **Fresh default.** Bob funds a distinct 0.02 NEAR offer, debt 0.022, collateral
   0.05 FLOOR, **120 seconds**. Carol accepts and withdraws principal. Read actual
   acceptance expiry, wait until finalized chain time>=expiry; no pending NFT
   transfer. Settle default: NFT burns, locked -0.05, Bob free FLOOR +0.05.
   No native repayment is manufactured. Use this short term only for the default
   case; wallet delays make it unsuitable for the repayment leg.
9. **Direct contribution.** Alice explicitly contributes 0.01 NEAR. L and A
   increase 0.01, T stays constant, no token/repayment claim. Capture exact ratio.
10. **Real Sputnik.** A proposes 0.10 NEAR using the displayed live bond. Read
    the returned ID (next counter observed 1; do not hardcode it if changed).
    B inspects that live ID and reviews its own approval. Confirm one approval
    remains InProgress and L unchanged. C separately approves. Require actual
    successful nested Floorline `contribute` receipt, proposal Approved, L/A
    +0.10 and T unchanged. Reconcile DAO principal debit separately from gas and
    bond refund. Browser must refresh inspected proposal; proposal approval alone
    is not the execution acceptance criterion. Label simulated council accurately.

## Completion gate

Every planned case needs desktop and mobile review/receipt-refresh evidence;
retain explicit skipped/blocked reasons. Local mock tests alone cannot pass this
gate. Recompute native and storage solvency after each action; stop on divergence,
unexpected debit, unknown payout or unsafe ownership. Do not auto-retry failures.

Only after operators authorize/perform these tests and new final receipts pass
can the frontend-signed testnet gate become READY. This plan authorizes no signing.
