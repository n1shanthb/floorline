# Phase 2A recovery gate

2026-11-13T04:49:26.563Z; new authoritative recovery record, earlier acceptance evidence preserved.

**STILL_UNKNOWN — fresh withdrawal safety UNPROVEN.**

Hash 3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG. Five verified-testnet endpoints across NEAR, FastNear and dRPC, including two functioning archival endpoints, returned no target final receipt. UNKNOWN_TRANSACTION, timeouts, free-plan restrictions and explorer N/A are not nonexecution proof. Historical positive controls succeeded on both archives.

Unsigned public-payload SHA-256/Borsh hash exactly matches. Original nonce 277184559000010, current nonce 277184559000009. Reference age 4120/86400 heights: **not expired**. No definitive future-inclusion barrier exists from these checks. Original signature/raw signed wire bytes unavailable; no signature recreated.

At finalized 277463043 (9sMoFRd1XxT3xPxxhAa7gUhDSd8PPeNXLi1dPQY2RxrP), 2026-11-13T04:45:49.361Z: claim #16 Available/attempt 0/0.05 NEAR, inflight 0; NFT #15 owned by Carol, Active loan, 0.10 FLOOR locked, debt 0.055 NEAR. Native balances unchanged from unresolved preflight, buckets solvent. Independent same-block claim/nonce reads match. Loan expiry November 14 at 09:34:11.656 IST, still before expiry in this snapshot.

Zero transactions/signatures/key operations in this phase. Reservation 0.142 NEAR retained; unknown fee null; no budget adjustment. 383 original tracked files, approved WASM, FloorKit artifacts and full DAO policy unchanged.

1. Keep the existing hash and claim quarantined. Query that same hash read-only through public/archival providers; preserve any actual outcome and all child receipts. Do not erase the journal or infer nonexecution from an indexer omission.
2. A definitive final receipt must be reconciled with claim attempt/state, exact native payout, nonce and callbacks. Alternatively establish future invalidity plus sufficiently complete finalized history/state; expiry alone is insufficient. Current reference validity and nonce do NOT invalidate the old transaction.
3. Only after resolution, and under a separately authorized state-aware continuation, consider a fresh claim #16 withdrawal if it is still Available and the old transaction cannot cause a later payout. Verify receipt/claim Paid before proceeding. No fresh withdrawal is safe to declare now.
4. If loan #15 is still Active before actual finalized expiry, review Carol→Dave NFT transfer (one yocto), verify Dave ownership, Dave exact 0.055 NEAR repayment, NFT burn/0.10 FLOOR release, and Bob's separate lender claim withdrawal. The 0.05 principal claim is not the 0.055 repayment. If expiry has passed, repay rejects; existing permissionless default_loan on an Active, nonpending loan transfers collateral to Bob and burns NFT, but no settlement is authorized here. Do not force the original repayment script through expiry.
5. Then reassess budget/state before the distinct 0.02/0.022 NEAR, 0.05 FLOOR, 120-second default case; direct 0.01 NEAR contribution; one actual 0.10 NEAR Sputnik proposal and B/C votes using the live bond/actual ID; and safe unused storage withdrawal last. Do not repeat the already successful transfer, redemption, cancellation, funding or acceptance.
6. Obtain authenticated testnet wallet access and verify actual browser→wallet→chain→browser recovery and role-specific mobile/desktop updates. CLI receipts and historical replay do not complete frontend acceptance. Council remains operator-controlled simulated council, not independently controlled humans.

Created: UNKNOWN_TX_RECOVERY.md, UNKNOWN_TX_RPC_EVIDENCE.json, UNKNOWN_TX_STATE_RECONCILIATION.json and this gate. Supporting read-only scripts are new; no previous evidence or product file changed.

RECOVERY GATE: BLOCKED
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
