# Phase 2A — unresolved withdrawal investigation

New dated recovery record: 2026-11-13T04:49:26.563Z. This does not overwrite or retroactively green the earlier acceptance results. **Strictly read-only: zero signatures, broadcasts, retries, financial transactions, deployments or key operations.**

**Primary classification: STILL_UNKNOWN. Fresh withdrawal safe to consider: UNPROVEN.**

Target [3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG](https://testnet.nearblocks.io/txns/3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG); signer carol.floorline-g3-20261111-6702ea.testnet; receiver floor.floorline-g3-20261111-6702ea.testnet; withdraw_claim({claim_id:"16"}), zero attached NEAR, 110000000000000 gas (110 Tgas). Original -429 response is retained verbatim in RPC evidence. Explorer N/A is not proof.

## Local forensic evidence

The raw original signed transaction and signature were not retained in the inspected acceptance journal/directory. No signature was recreated and no credential directory was opened. The original runner source derives the transaction hash from the Borsh-encoded unsigned transaction before signing. Offline reconstruction of the 233-byte unsigned transaction using only retained public inputs **exactly matches the original hash**. The unsigned bytes are retained explicitly as unsigned/public in JSON, not presented as a signed payload.

- Public key: ed25519:4nik1MeQiwgiBQyTR37GWhe5T5rAtEwEFtLhF4pygrMs.
- Exact original nonce verified by the hash match: 277184559000010; this is the last confirmed same-key nonce plus one.
- Reference block CFk6sBXPNUTqD1MaDoA9ZVjGTP3iRqYq3ps554uYjJY3, height 277458923, timestamp 1794542691668456683 ns. RPC confirms it is canonical.
- Method/argument bytes, receiver, zero deposit and 110 Tgas are bound by that hash match.
- Exact original broadcast time was not saved; reference block time is not substituted for it. The signature and signed wire bytes cannot be independently verified from the surviving local record. Hash matching does not establish RPC acceptance/inclusion.

## Actual provider observations

- NEAR public, https://rpc.testnet.near.org, verified chain testnet. tx/NONE: HTTP 200, -32000: UNKNOWN_TRANSACTION; EXPERIMENTAL_tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout; tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout.
- FastNear public, https://test.rpc.fastnear.com, verified chain testnet. tx/NONE: HTTP 200, -32000: UNKNOWN_TRANSACTION; EXPERIMENTAL_tx_status/FINAL: HTTP 408, -32000: TIMEOUT_ERROR; tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout.
- dRPC independent public, https://near-testnet.drpc.org, verified chain testnet. tx/NONE: HTTP 200, -32000: UNKNOWN_TRANSACTION; EXPERIMENTAL_tx_status/FINAL: HTTP 408, 30: Request timeout on the free plan, please upgrade to paid plan; tx_status/FINAL: HTTP 400, -32601: method is not available.
- NEAR archival, https://archival-rpc.testnet.near.org, verified chain testnet. tx/NONE: HTTP 200, -32000: UNKNOWN_TRANSACTION; EXPERIMENTAL_tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout; tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout.
- FastNear archival, https://archival-rpc.testnet.fastnear.com, verified chain testnet. tx/NONE: HTTP 200, -32000: UNKNOWN_TRANSACTION; EXPERIMENTAL_tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout; tx_status/FINAL: HTTP unavailable, TimeoutError: The operation was aborted due to timeout.

Both advertised archival providers also returned an independently checked **FINAL success** with successful child outcomes for historical control hash 6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy. Those controls prove working historical retrieval for that known transaction, not a target withdrawal receipt. No provider returned an actual target transaction, receipt ID, outcome, native-transfer receipt or claim_result callback. Therefore no callback/fee success was inferred. All exact methods, parameters, query/completion timestamps, raw JSON errors, HTTP codes, status/version/network and full control receipts are in UNKNOWN_TX_RPC_EVIDENCE.json. Transport aborts have no raw server JSON and are labeled accordingly. dRPC's free-plan timeout/method restriction is preserved.

The [official RPC guide](https://docs.near.org/api/rpc/transactions) distinguishes status-with-receipts methods and FINAL from earlier milestones. It also explains UNKNOWN_TRANSACTION at NONE versus timeout when waiting for FINAL. The [provider directory](https://docs.near.org/api/rpc/providers) identifies the public and archival endpoints. No alternative endpoint was used for broadcasting.

## Common finalized recovery state

Primary provider https://near-testnet.drpc.org; finalized block **277463043 / 9sMoFRd1XxT3xPxxhAa7gUhDSd8PPeNXLi1dPQY2RxrP**, network time **2026-11-13T04:45:49.361Z**, exact 1794545149361551912 ns. Principal account/contract/loan/claim/key/balance/policy reads were pinned to this same hash. An independent provider confirmed claim #16 and the exact public-key nonce at the same hash. Status calls and reference-block/config queries have their own timestamps; this is a snapshot, not a claim of continuous monitoring.

- Claim #16: **Available**, ABI state 0, attempt 0, owner Carol (carol.floorline-g3-20261111-6702ea.testnet), amount 50000000000000000000000 yoctoNEAR (0.05), kind 0 borrower principal. This ABI maps 1=InFlight, 2=known native-transfer failure, 3=Paid; no invented Failed/Unknown view was queried. No failure/restoration path was invoked.
- Inflight 0; borrower claim bucket 50000000000000000000000; refund storage 0; pending NFT callback count 0. Available/attempt-zero state is consistent with no observed successful withdrawal initiation, not proof of permanent nonexecution.
- FLOOR native 8.276215096952908587257622 NEAR; local_required 6.855125096952908587257622; surplus 1.421090000000000000000000. Exact reserve partition, native solvency, storage coverage and free+locked FLOOR supply partition pass. L=1.976215096952908587257618, T=1.850000000000000000000000; locked 0.10 FLOOR counted once.
- Carol native 0.297105681016638799999999 NEAR. Both Carol and FLOOR balances differ by zero from the unresolved transaction's original pinned preflight. No principal debit or payout is observed at this snapshot. No finalized target receipt means actual target fee remains null, not asserted zero.
- NFT #15 owner carol.floorline-g3-20261111-6702ea.testnet; loan state **Active**, lender Bob (bob.floorline-g3-20261111-6702ea.testnet), debt 0.055 NEAR, principal 0.05 NEAR, collateral 0.10 FLOOR, no pending NFT transfer.

## Future-inclusion and expiry assessment

The hash-bound original nonce is **277184559000010**; the exact same public key's finalized nonce is **277184559000009**. It has not advanced enough to invalidate this original transaction. Nonce comparison by itself would not prove this hash succeeded if it advanced.

Live protocol config reports transaction_validity_period=86400 blocks. The reference block is only 4120 heights old. It is **not expired**; the height-based threshold is 277545323, with expiry only beyond the configured window. Do not convert this height window into a guaranteed wall-clock deadline. The [NEAR routing specification](https://nomicon.io/architecture/how/tx_routing.html) describes reference-block-based inclusion validity. Even a future expired reference would only exclude later inclusion, not automatically disprove earlier inclusion/asynchronous work.

Loan expiry is independent: exact 1794629051656944385 ns, **2026-11-14T04:04:11.656Z / November 14, 09:34:11.656 IST** (ISO milliseconds truncate remaining nanoseconds). At the finalized recovery time it is before expiry by 83902295392473 ns (23h 18m 22s plus fractional seconds). The NFT transfer/current-owner repayment sequence remains contractually feasible before expiry, subject to resolution and fresh ownership/time checks; it was NOT executed. Repay requires now<expiry; default_loan permits now>=expiry on an active loan with pending=0 and gives collateral to the immutable lender. No automatic settlement or monitoring was scheduled.

## Budget and integrity

Recomputed from eight actual confirmed receipt chains: gross attachments 0.070000000000000000000001 NEAR; actual fees 0.002672387902466700000000; observed gross 0.072672387902466700000001. Unknown fee remains **null**. Keep the full **0.142 NEAR reservation**; budget adjustment zero. Remaining after reservation 1.885327612097533299999999 NEAR. Refunded capital does not reset gross usage. Historical conservative DAO cost stays 8.130618890941592/10 NEAR; new DAO spend zero. No previous budget/evidence file was edited.

All 383 original tracked files match their pre-investigation SHA-256, including historical acceptance/Gate3 evidence, Rust source, FloorKit and frontend. Approved FLOOR WASM SHA-256 529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6 and all three FloorKit artifacts unchanged. Deployed FLOOR and DAO hashes match expected values; full DAO policy unchanged. Relevant public access-key listings are in the pinned snapshot. This phase performed no key changes, signing, mainnet operations or redeployment; it does not claim exhaustive historical key-operation indexing.

## Remaining evidence and acceptance steps

Missing decisive evidence: an actual finalized target execution/receipt chain; or sufficient finalized-history reconciliation plus proof of future invalidity. Neither is available now. Raw original signature and exact send timestamp are also absent. No complete claim-event/history index was invented. Claim #16 stays quarantined.

1. Keep the existing hash and claim quarantined. Query that same hash read-only through public/archival providers; preserve any actual outcome and all child receipts. Do not erase the journal or infer nonexecution from an indexer omission.
2. A definitive final receipt must be reconciled with claim attempt/state, exact native payout, nonce and callbacks. Alternatively establish future invalidity plus sufficiently complete finalized history/state; expiry alone is insufficient. Current reference validity and nonce do NOT invalidate the old transaction.
3. Only after resolution, and under a separately authorized state-aware continuation, consider a fresh claim #16 withdrawal if it is still Available and the old transaction cannot cause a later payout. Verify receipt/claim Paid before proceeding. No fresh withdrawal is safe to declare now.
4. If loan #15 is still Active before actual finalized expiry, review Carol→Dave NFT transfer (one yocto), verify Dave ownership, Dave exact 0.055 NEAR repayment, NFT burn/0.10 FLOOR release, and Bob's separate lender claim withdrawal. The 0.05 principal claim is not the 0.055 repayment. If expiry has passed, repay rejects; existing permissionless default_loan on an Active, nonpending loan transfers collateral to Bob and burns NFT, but no settlement is authorized here. Do not force the original repayment script through expiry.
5. Then reassess budget/state before the distinct 0.02/0.022 NEAR, 0.05 FLOOR, 120-second default case; direct 0.01 NEAR contribution; one actual 0.10 NEAR Sputnik proposal and B/C votes using the live bond/actual ID; and safe unused storage withdrawal last. Do not repeat the already successful transfer, redemption, cancellation, funding or acceptance.
6. Obtain authenticated testnet wallet access and verify actual browser→wallet→chain→browser recovery and role-specific mobile/desktop updates. CLI receipts and historical replay do not complete frontend acceptance. Council remains operator-controlled simulated council, not independently controlled humans.

RECOVERY GATE: BLOCKED
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
