# Authorized testnet acceptance — stopped safely

Checked 2026-11-13T04:20:06.362Z.

**TESTNET NOT READY. MAINNET NOT READY. FloorKit BLOCKED.**

Nine signed broadcast attempts: **8 actual on-chain final successes, 0 confirmed failures, 1 unresolved/unlocated attempt**. The ninth is NOT a confirmed on-chain transaction. Its broadcast response was JSON-RPC -429; two independent RPCs returned UNKNOWN_TRANSACTION. These are not execution receipts and do not prove the signed transaction can never execute. No re-sign/rebroadcast occurred. All financial execution stopped.

## Planned cases

- A: BLOCKED browser wallet connection/signing; CLI identity/access and eight actual final receipt chains verified. No authenticated browser session available. CLI is not browser acceptance.
- B: SKIPPED unnecessary storage registration/top-ups; all financial actors already registered with sufficient credit. No registration write submitted.
- C: PASS READ-ONLY issuance gate: L>T; no positive 1:1 issuance attempt, treasury reset or workaround.
- D: PASS CLI Alice→Dave 0.01 FLOOR transfer; exact balances and unchanged L/T.
- E: PASS CLI Alice redemption, 0.05 FLOOR burned. Quote 42784903047091412742382 yoctoNEAR; 50-bps minimum 42570978531855955678670. Claim 10 paid through actual native transfer and successful callback.
- F: PASS CLI Bob funds 0.02 NEAR offer #12, cancels and withdraws claim #13; actual native return verified.
- G: BLOCKED (funding/acceptance substeps PASS): Bob funded loan #15, 0.05 principal/0.055 debt/0.10 FLOOR collateral/24-hour term. Carol accepted and owns NFT #15 and borrower claim #16. Principal withdrawal broadcast unresolved. NFT transfer to Dave, repayment and Bob's lender withdrawal NOT submitted.
- H: BLOCKED by stop-on-unknown: new 120-second default workflow NOT submitted.
- I: BLOCKED by stop-on-unknown: new direct 0.01 NEAR contribution NOT submitted.
- J: BLOCKED by stop-on-unknown: NO new Sputnik proposal, votes or contribution. Existing historical proposal #0 is not substituted for new acceptance. Council remains operator-controlled simulated council.
- K: BLOCKED/SKIPPED: unused storage withdrawal must occur last; NOT submitted.

Known-invalid old-owner/double/expired writes were SKIPPED. No deposits were spent on known-invalid calls. Prior historical/mock negative evidence is separate from this run.

## Actual hashes

- PASS: alice_transfer: [DKGqYuW2CyL5HcP691Z69tfnArzchgcj6XocVDVr6veA](https://testnet.nearblocks.io/txns/DKGqYuW2CyL5HcP691Z69tfnArzchgcj6XocVDVr6veA)
- PASS: alice_redeem: [EBLjjvDzMwNVD7u7SdZVxeogMFmcFvUnB8YE6st3VyoZ](https://testnet.nearblocks.io/txns/EBLjjvDzMwNVD7u7SdZVxeogMFmcFvUnB8YE6st3VyoZ)
- PASS: alice_redemption_withdraw: [Dwp9LMPTKYm18BZxCf5moTpu9yZ2iwCrFbf81vu3gVMa](https://testnet.nearblocks.io/txns/Dwp9LMPTKYm18BZxCf5moTpu9yZ2iwCrFbf81vu3gVMa)
- PASS: bob_cancel_offer_fund: [7Zg8XhKwTe6H4YehKa2nxyJHvvYRwF5NMnAQNwKVKqF8](https://testnet.nearblocks.io/txns/7Zg8XhKwTe6H4YehKa2nxyJHvvYRwF5NMnAQNwKVKqF8)
- PASS: bob_cancel_offer: [48ZoHn5GY9jgiWqJwXCt43rXMepH1dm4G3mRg59THVAh](https://testnet.nearblocks.io/txns/48ZoHn5GY9jgiWqJwXCt43rXMepH1dm4G3mRg59THVAh)
- PASS: bob_cancel_withdraw: [23LP2VQGDZoaX6KK7XUadmDyw3xBFnZZbE9zYYUGY6ZQ](https://testnet.nearblocks.io/txns/23LP2VQGDZoaX6KK7XUadmDyw3xBFnZZbE9zYYUGY6ZQ)
- PASS: bob_repayment_offer: [7F2QRR8wrS7GBztajeAYcM4wCScfv5QDQfgmwGSPjLpn](https://testnet.nearblocks.io/txns/7F2QRR8wrS7GBztajeAYcM4wCScfv5QDQfgmwGSPjLpn)
- PASS: carol_accept_repayment: [HBndHyrPwmFDqQ5fnU2hacoYSkz66menqrQXMZB4NJWk](https://testnet.nearblocks.io/txns/HBndHyrPwmFDqQ5fnU2hacoYSkz66menqrQXMZB4NJWk)
- UNKNOWN_BROADCAST_NOT_LOCATED: carol_repayment_principal: [3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG](https://testnet.nearblocks.io/txns/3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG)

Raw receipts, callbacks, exact intentions, gas/deposits, balances and before/after finalized accounting for the eight successes are in TESTNET_ACCEPTANCE_TRANSACTIONS.json. The unresolved attempt has a broadcast error, read-only recovery evidence and stop snapshot, not a fabricated receipt.

## Outstanding rights and recovery

Carol currently owns NFT #15; **0.10 FLOOR remains locked**. Borrower claim #16 is Available for **0.05 NEAR** at finalized block 277459635; inflight is zero, and no principal debit is observed in that snapshot. The signer nonce is also unchanged from the pre-broadcast view. These observations do not authorize retrying an uncertain payout. Loan expiry **2026-11-14T04:04:11.656Z**, exact 1794629051656944385 ns. Bob remains the immutable lender; default transfers collateral under the existing rules. No automated repayment/default/follow-up was scheduled.

Resolve the SAME hash 3RXga1bVXnDbSmyABAZL7Lkekseg6ohnYvvLmXiZ8GDG read-only through healthy RPCs and inspect every child receipt. Check claim #16, Carol's nonce/native balance, NFT #15 owner and finalized expiry. Do not clear the journal, re-sign or resubmit merely because a node returns UNKNOWN_TRANSACTION. Require a definitive outcome/nonexecution assessment before deciding another action. If final success is found, verify Paid and exact native debit. If failure is found, distinguish rollback from failed native transfer or unresolved callback. Do not replay the whole plan.

## Exact accounting and costs

Initial L=2.019000000000000000000000, T=1.900000000000000000000000, backing ratio 1.062631578947368421. Current STOP snapshot L=1.976215096952908587257618, T=1.850000000000000000000000, ratio 1.068224376731301939 NEAR/FLOOR. Exact integer numerator/denominator amounts are authoritative. This is liquid treasury backing, not a market-price or untaxed redemption guarantee.

All eight completed operations passed reserve partition, native solvency, storage coverage, known-holder/locked supply partition and nondecreasing positive-supply backing checks. Stop native balance 8.276215096952908587257622, required 6.855125096952908587257622, surplus 1.421090000000000000000000 NEAR. Borrower claims 0.05 NEAR and locked collateral 0.10 FLOOR remain accounted for. Inflight/refund storage/pending NFT callbacks are zero at stop.

Observed gross authorization cost **0.072672387902466700000001 NEAR**: attachments 0.070000000000000000000001, actual final receipt fees 0.002672387902466700000000. Observed project-wide net expenditure, including FLOOR/DAO balances, **0.002672387902466700000000 NEAR**, exactly known fees; capital remains project balances. Unresolved attempt gas is unknown; reserve 0.142000000000000000000000 NEAR conservatively. Observed remaining 2.027327612097533299999999 NEAR; after unresolved reservation 1.885327612097533299999999 NEAR. Refunds never reset gross authorization. No new DAO spend: historical conservative gross+contribution+fees remains 8.130618890941592 NEAR under 10. Detailed per-account deltas, payouts and upfront reserves: TESTNET_ACCEPTANCE_BUDGET.json.

## Verification and integrity

Typecheck, lint, all 60 unit tests and production build PASS. Read-only production browser QA: PASS_READ_ONLY_UI_ONLY; see TESTNET_ACCEPTANCE_BROWSER_QA.md. Authenticated signing, wallet rejection/redirect recovery and intermediate role-specific receipt refresh remain unverified. No CLI hashes were injected into browser history.

344 protected pre-existing tracked files match SHA-256. Approved FLOOR normal WASM and three FloorKit artifacts unchanged. No contract/DAO redeploy, policy change, new accounts/keys, key deletion, mainnet action, FloorKit modification or historical-evidence alteration. The authorized SDK consumed existing local testnet signing facilities; private keys were not manually inspected, exported or logged.

The exact prior acceptance result is archived in acceptance-execution/PREVIOUS_ACCEPTANCE_RESULTS.md. Earlier read-only reports remain historical; the authoritative current state for this run is TESTNET_ACCEPTANCE_TRANSACTIONS.json.final, explicitly a STOP snapshot, not completed acceptance.
