# Testnet acceptance results

**TESTNET NOT READY for complete frontend-signed acceptance.**
**MAINNET NOT READY.** Prepared acceptance cases remain unsigned.

## Completed work

Audited existing frontend routes/components, deployed Rust adapter, engine/API
boundaries, tests, wallet selector, RPC configuration, offer proofs, asynchronous
claims, Sputnik policy and original evidence. Retained the current design.
Added existing-method FLOOR transfer, explicit contribution, unused storage
withdrawal and real reviewed Sputnik proposal/approval controls. Added a browser
transaction log separate from historical replay and explicit short offer terms
for controlled default tests. No new contract capability or factory was invented.

Financial preflight pins account/loan/claim reads to one finalized block, validates
deposits/canonical amounts/gas and exact receipts, checks reserve partition and
eligibility, bounds expiry arithmetic and rejects changed DAO code/policy.
Reconciliation refreshes balances/loan/NFT/proposal views; unknowns never auto-retry.
Root withdrawal failure is preserved as failed; nonfinal failures stay unknown.
Finalized known payout failure permits a separate, balance-guarded restoration;
it is not trapped behind the lost-callback quarantine. No payout is retried
automatically and no failure alone creates spendable credit.
Generic RPC rejection and untrusted callback URL errors cannot discard pending
intents. Explicit wallet cancellation remains separate from uncertain submission.

## Checks actually executed

- TypeScript, ESLint and production build: PASS.
- Unit tests: **60 passed, 0 failed**. Includes the existing
  10,000 integer curve cases, admission, DAO constraints and intent matching.
- Browser tests: **19 passed, 0 failed** using isolated mocked
  wallet/RPC adapters. All six routes at 360/390/1440 widths, keyboard modal,
  disconnected/wrong-network/RPC errors, insufficient funds, exact repayment,
  wallet rejection, unknown/failed outcomes, proposal/transfer review, short term
  review, post-receipt balances/NFT updates and forged callback errors tested.
  These synthetic receipts are NOT public-chain transactions.
- Production browser: **12 live-read-only desktop/mobile captures**, no runtime
  exceptions or horizontal overflow. Anonymous wallets; no authentication/signing.
  Images in `frontend/qa/product-completion/`; layout padding was corrected after
  visual inspection. This is Chromium responsive QA, not physical-device proof.
- Public testnet recheck: finalized chain/network/code/accounting, quote parity,
  known loans/claims/NFT state, complete DAO policy, public key listings and seven
  original successful transactions verified. Fresh source data:
  `product-review/LIVE_TESTNET_READS.json`.
- Isolated offline Rust rebuild: byte-for-byte match to approved FLOOR WASM;
  original artifact unchanged. No deployed contract was modified/redeployed.
- Dependency audit: **10 low, 0 moderate/high/critical** current registry findings.
  No dependency update or unsafe forced fix. Existing upstream direct-eval/browser
  polyfill warnings remain in build logs; no audit/CSP certification is claimed.

Early browser runs failed because the test wallet mock lacked the new receiver
helper and the mock returned FLOOR's code hash for the DAO. Logs were retained
as `initial-mock-failure.txt` and `second-mock-failure.txt`; final fixtures were
corrected and the full suite rerun. These are resolved test-fixture failures,
not fabricated successful live acceptance.

## Actual public-chain transaction evidence

The following are **historical hashes freshly rechecked**, not newly submitted
through this frontend. FINAL, signer/receiver identity and all receipts succeeded:

- `issue-alice`: [6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy](https://testnet.nearblocks.io/txns/6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy) — VERIFIED FINAL SUCCESS.
- `redeem-bob`: [2YHTdYdgBtFfKuHXP1TAn2R7bpZ5fwkAiJdGNp2qQMLZ](https://testnet.nearblocks.io/txns/2YHTdYdgBtFfKuHXP1TAn2R7bpZ5fwkAiJdGNp2qQMLZ) — VERIFIED FINAL SUCCESS.
- `nft-transfer`: [6kqBcUHPeT5TSFqjxLjq3AihsziHAWqUyVHjQFCmA9NV](https://testnet.nearblocks.io/txns/6kqBcUHPeT5TSFqjxLjq3AihsziHAWqUyVHjQFCmA9NV) — VERIFIED FINAL SUCCESS.
- `loan-repaid`: [5j1o8NzzTkNHHtjNuXGGRLHH9khwdZjURijicyps811M](https://testnet.nearblocks.io/txns/5j1o8NzzTkNHHtjNuXGGRLHH9khwdZjURijicyps811M) — VERIFIED FINAL SUCCESS.
- `loan-default`: [5FVQb4KG8eTubJd8p5FaFBoBfCqoRPefBcA3qHCm8jfD](https://testnet.nearblocks.io/txns/5FVQb4KG8eTubJd8p5FaFBoBfCqoRPefBcA3qHCm8jfD) — VERIFIED FINAL SUCCESS.
- `dao-vote-b`: [EMbAnPE9AmweA8NvN2hn5pYS5kFuTE1RcxMPVwBb4Nmz](https://testnet.nearblocks.io/txns/EMbAnPE9AmweA8NvN2hn5pYS5kFuTE1RcxMPVwBb4Nmz) — VERIFIED FINAL SUCCESS.
- `dao-vote-c`: [hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg](https://testnet.nearblocks.io/txns/hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg) — VERIFIED FINAL SUCCESS.

Explorer URLs are canonical transaction links. RPC evidence was verified; no
claim that every explorer HTML page was independently rendered is made.
New signed testnet transactions: **0**. Mainnet transactions: **0**.

At the recorded finalized block, L=`2019000000000000000000000`, T=`1900000000000000000000000`,
A=`8269000000000000000000003`, required=`6847910000000000000000003` yocto units.
Available claims, locked collateral and inflight amounts were zero. Native cash
covers the reported partition; storage/operations cover recorded stake. Ratio
2019/1900 is backing, not a guaranteed redemption price. Current positive fixed
1:1 issuance is correctly blocked, not silently repriced or labeled completed.

## Remaining acceptance and security limits

No actual wallet authentication, user signature, new public receipt or physical
device acceptance was performed. New transfer/contribution/storage and Sputnik
controls remain IMPLEMENTED BUT UNVERIFIED with real signatures. Current proposal
#0 is already Approved. Fresh borrowing needs existing-holder collateral because
issuance is gated. Follow TESTNET_ACCEPTANCE_PLAN.md with actual role-wallet
operators, the approved funding ceiling, fresh IDs and full receipt reconciliation.

Discovery is partial; no global live indexer, unregister/cleanup or generic
transfer-call UI is claimed. Unknown native/storage outcomes can strand rights;
no unsafe automatic recovery was added. Hosting/publication was not authorized
or performed. Independent mainnet security, custody, exposure, monitoring and
network release gates remain outstanding; FLOOR still has one full-access key.
DAO council remains operator-controlled simulated council, not independent humans.

FloorKit remains BLOCKED. No FloorKit file or integration was changed. Its
availability redesign requires separate independent economic/runtime gates.

## Files and integrity

All **262 protected tracked files** retain baseline hashes, including original
contract source/lockfiles, historical evidence, previous frontend QA/public replay
and all tracked FloorKit files. Approved ignored FLOOR WASM and all three ignored
FloorKit artifacts also match their recorded hashes. See INTEGRITY_RESULTS.json.

Approved FLOOR SHA-256: `529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`.

Source/test/report changes (generated QA and read-only/build audit files are
additionally enumerated in `product-review/FINAL_CHECKS.json`):

- `frontend/src/App.tsx`
- `frontend/src/components/Claims.tsx`
- `frontend/src/components/FinancialTools.tsx`
- `frontend/src/components/GovernanceActions.tsx`
- `frontend/src/components/RecentTransactions.tsx`
- `frontend/src/lib/actions.ts`
- `frontend/src/lib/governance-actions.ts`
- `frontend/src/lib/journal.ts`
- `frontend/src/lib/receipt.ts`
- `frontend/src/lib/rpc.ts`
- `frontend/src/lib/transaction.ts`
- `frontend/src/lib/wallet.ts`
- `frontend/src/pages/Activity.tsx`
- `frontend/src/pages/Governance.tsx`
- `frontend/src/pages/Loans.tsx`
- `frontend/src/pages/Overview.tsx`
- `frontend/src/pages/Treasury.tsx`
- `frontend/src/styles.css`
- `frontend/tests/acceptance.test.ts`
- `frontend/tests/browser/app.spec.ts`
- `frontend/tests/math.test.ts`
- `FRONTEND_FEATURE_MATRIX.md`
- `MAINNET_READINESS.md`
- `RELEASE_BLOCKERS.md`
- `TESTNET_ACCEPTANCE_PLAN.md`
- `TESTNET_ACCEPTANCE_RESULTS.md`
- `frontend/product-playwright.config.ts`

## Next actions

Obtain explicit wallet-led acceptance authorization and owner participation;
recheck balances/budget, run the plan's real cases and attach actual final hashes
and UI refresh evidence. Resolve every skipped/unknown/failed case before marking
TESTNET READY. Separately complete MAINNET_READINESS.md; do not deploy mainnet
or change the approved contract to make a review pass.
