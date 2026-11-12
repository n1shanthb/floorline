# Existing Floorline feature matrix

Current workstream: November 12, 2026, Asia/Calcutta. This supersedes earlier
frontend functionality descriptions; it does not rewrite historical results.

Status vocabulary: WORKING AND VERIFIED; IMPLEMENTED BUT UNVERIFIED; MISSING;
BLOCKED. Verification scope is stated per entry. A mock browser test is not a
wallet-signed public-testnet acceptance result.

## Treasury and issuance

- Treasury/account/code-hash reads — **WORKING AND VERIFIED** by fresh finalized
  testnet RPC and production-browser reads. Accounting and account reads share a
  finalized block. Bucket sum, native balance and locked-supply consistency are
  checked. Current L=2.019 NEAR, T=1.9 FLOOR; backing is exactly 2019/1900.
- Fresh positive issuance — **BLOCKED** by existing economics at current state.
  The fixed 1:1 mint requires d*T>=L*minted; L>T. The UI refuses it. Historical
  bootstrap issuance succeeded; that does not prove a new issuance can succeed.
  Do not reset/drain the existing treasury to manufacture a successful test.
- Redemption quote and exact minimum — **WORKING AND VERIFIED** for live read
  parity. Size-dependent curve uses BigInt and one final division. Backing is not
  a guaranteed per-token payout. Maximum redemption uses available, unlocked FT.
- Redemption and native payout through current browser build — **IMPLEMENTED
  BUT UNVERIFIED** on new signed receipts. Historical redemption/payout receipts
  are verified; new browser flows have review, explicit wallet approval, final
  receipt checking, ID tracking and position refresh.
- Explicit contribution, available FLOOR transfer, unused storage withdrawal —
  **IMPLEMENTED BUT UNVERIFIED** on new signed frontend transactions. They use
  existing `contribute`, `ft_transfer`, `storage_withdraw`, with exact deposits and
  separate storage/refund headroom. Contributions do not mint or promise repayment.
- Storage registration/top-up — **IMPLEMENTED BUT UNVERIFIED** through this
  browser build. Self `storage_deposit`, 0.05 NEAR; source ABI and admission tests
  checked. Storage credit never becomes backing or lender principal.
- Storage unregister, generic FT/NFT transfer-call UI, cleanup controls —
  **MISSING** from this product UI. Those contract extensions are not claimed as
  completed frontend capabilities. No automatic retry for a storage refund whose
  outcome is unknown; no invented refund-state view is exposed.

## Loans and recovery NFTs

- Funding and cancellation — **IMPLEMENTED BUT UNVERIFIED** on new signed
  frontend receipts. Principal is lender-supplied. Debt/collateral/term are exact;
  hours/minutes/seconds map to existing U64 nanoseconds. Short terms are disclosed
  for controlled expiry tests. Cancellation creates a separate funded claim.
- Offer verification — **WORKING AND VERIFIED** in automated receipt-substitution
  tests. Borrowing additionally requires the actual funding hash and verification
  of lender, receiver, returned loan ID, principal and fixed terms. The deployed
  view omits duration; the UI does not invent it.
- Borrow/collateral lock — **IMPLEMENTED BUT UNVERIFIED** via new browser signing.
  Fresh finalized balance, storage, offer state and checked expiry are required.
  Principal becomes a native claim, not an immediate wallet payout.
- NFT ownership and transfer — **IMPLEMENTED BUT UNVERIFIED** for new signed UI
  transactions. Historical Carol→Dave transfer is verified. Current owner is read
  from `nft_token`; recipient must exist and be registered; exactly one yoctoNEAR
  and explicit loss-of-recovery-right acknowledgement are required. Automated
  tests verify ownership display refresh after a mocked final transfer.
- Repayment — **IMPLEMENTED BUT UNVERIFIED** via current frontend signatures.
  Current NFT holder, exact debt, no pending resolution and time<expiry required.
  Collateral goes to that holder; lender receives a separate native claim.
- Default — **IMPLEMENTED BUT UNVERIFIED** via a fresh frontend default. Only at
  time>=expiry with no pending NFT callbacks. Historical default is verified.
  The lender gets FLOOR collateral, not a guaranteed native recovery.
- Full loan/claim/NFT enumeration — **BLOCKED** by absent deployed enumeration
  methods and no complete indexer. Known historical IDs, browser-saved IDs and
  explicit lookup work; all position totals and market lists remain partial.

## Governance and activity

- DAO policy/code/proposal/treasury reads — **WORKING AND VERIFIED** by public
  RPC. The complete demonstrated policy is compared; proposal #0 is Approved.
- Real proposal and approval controls — **IMPLEMENTED BUT UNVERIFIED** through
  this frontend. Supported calls are actual Sputnik `add_proposal` and
  `act_proposal({id,action:VoteApprove})`. Proposal targets only the reviewed
  Floorline contribution; exact live bond, council eligibility, previous vote,
  expiry, DAO cash, code and full policy are rechecked. Current historical #0
  cannot be voted again. The controlled creation form proposes exactly 0.10 NEAR.
- Historical DAO execution — **WORKING AND VERIFIED**, including its actual
  nested Floorline contribution receipt. Approval alone is not execution proof.
  Council remains **operator-controlled simulated council**; no independent human
  governance or decentralization is established.
- Historical activity/replay — **WORKING AND VERIFIED** as historical evidence.
  Seven curated hashes were rechecked against public final receipts. Replay and
  landing/history metrics are labeled historical, never simulated live trading.
- Browser transaction log — **WORKING AND VERIFIED in mock tests only** for
  reconciliation/rendering. **IMPLEMENTED BUT UNVERIFIED** with new real signed
  transactions. Cached public records are explicitly editable/incomplete and can
  be rechecked against RPC; this is not a live global indexer.

## Wallet and failure handling

- Testnet-only selector, correct receiver, external wallet approval, changed
  account/network, insufficient funds and contract gating — **WORKING AND
  VERIFIED in automated tests**. Actual wallet authentication and financial
  signing remain **IMPLEMENTED BUT UNVERIFIED** in this workstream.
- Pending/final/failed/rejected/unknown states — **WORKING AND VERIFIED in
  automated tests**. A nonfinal failure stays unknown. Root withdrawal failure
  stays failed; a missing paid callback stays unknown. RPC denial is not treated
  as user cancellation. Untrusted callback URL errors cannot discard an intent.
- Desktop/mobile routing, forms, dialog keyboard behavior and error displays —
  **WORKING AND VERIFIED** in local Chromium responsive tests and production
  captures. Not physical-device or independent accessibility certification.
- Public hosting and fresh-device signed acceptance — **BLOCKED** pending
  explicit publication/signing authorization and operator participation.

## Isolation and verdict

FloorKit remains **BLOCKED** under its existing callback-loss availability gate.
No FloorKit file was edited and no frontend integration was introduced.

**TESTNET NOT READY** for a claim of complete new frontend-signed acceptance.
Historical technical Gate 3 evidence remains valid. **MAINNET NOT READY**.
Exact final automated counts are recorded in `product-review/FINAL_CHECKS.json`.
