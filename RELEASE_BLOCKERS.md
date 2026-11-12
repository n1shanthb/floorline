# Release blockers

**TESTNET NOT READY** for complete frontend-signed acceptance.
**MAINNET NOT READY** for any real-money launch.

## Testnet completion blockers

1. No new wallet-authenticated financial transaction was authorized or submitted
   in this workstream. Existing receipts prove historical contract execution;
   mocked approval/receipt tests do not prove the current browser↔wallet↔chain path.
   Run TESTNET_ACCEPTANCE_PLAN.md with owners controlling their wallet sessions.
2. Fresh positive 1:1 issuance is correctly blocked at L>T. Acquire collateral by
   an explicitly approved existing-holder FT transfer. Do not relabel a historical
   mint as a new success, alter rates, or drain/reset the deployed treasury.
3. New funding, borrowing, NFT transfer, owner repayment, default, claim payout,
   explicit contribution, free-storage refund and Sputnik proposal/vote controls
   still require new signed frontend receipts and post-receipt state verification.
   Current proposal #0 is already Approved; inspect the actual next ID.
4. The deployed ABI has no complete loan/claim enumeration. Discovery and totals
   remain partial. Full market/history discovery needs a separately scoped indexer,
   not an invented contract method. Browser activity is editable local history.
5. Unregister/cleanup and generic transfer-call extension UIs remain absent.
   Unknown native/storage callbacks have no safe automatic retry; storage refund
   records lack a direct public state view. These limits must remain disclosed.
6. Public HTTPS hosting, wallet redirect behavior on that host, fresh-device and
   physical mobile acceptance have not been verified here. No public deployment
   was authorized/performed. Do not treat localhost as a published product.

## Mainnet security blockers

- Independent review of the exact FLOOR financial state machine, callback/storage
  liabilities and compiled action reachability is not complete.
- FLOOR retains a full-access key. Key custody, upgrade/global-reference policy,
  initialization, monitoring and incident recovery require reviewed decisions.
- No production network/account/wallet/RPC configuration or mainnet signed
  acceptance is authorized. Current application rejects mainnet intentionally.
- No on-chain deposit/exposure cap or allowlist; no pause or guaranteed unknown
  payout recovery. UI restrictions cannot substitute for contract protections.
- No deployed complete index/monitor, incident owner or real-money risk budget.
  Current real-money authorization is zero; see MAINNET_READINESS.md.
- SDK advisories/CSP/browser-wallet interoperability require independent review.

## FloorKit

Deployment status **BLOCKED**. No source/evidence change or frontend integration
in this workstream. Its known callback-loss availability issue remains governed
by its separate design/economic/runtime gate. Do not reuse FLOOR's results to
mark FloorKit ready or conflate their different refund implementations.

## Exact next actions

1. Confirm participating public testnet IDs and owner-controlled wallet sessions;
   explicitly authorize the bounded acceptance plan and any needed top-ups.
2. Run each prepared case with actual final hashes, full receipts and before/after
   accounting, preserving original evidence. Resolve unknown outcomes before any
   retry, and record skipped/failed cases honestly.
3. Verify live UI balance/claim/NFT/proposal refresh on desktop and mobile and
   reconcile fresh solvency. Then reassess TESTNET READY with that evidence.
4. Separately authorize/verify public hosting if needed. Pursue independent
   contract/security review and the mainnet procedure before asking for mainnet
   authorization. No contract modification is authorized by this report.
