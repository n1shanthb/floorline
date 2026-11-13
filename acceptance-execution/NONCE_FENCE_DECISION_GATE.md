# Nonce-fence decision gate

**NONCE FENCE: UNPROVEN. NO-GO for public execution now.**

Protocol 88 V0 monotonic nonce rules support one successful nonce consumption/action-receipt creation at exact key/n. Conflicting hashes can coexist in pools; admission/selection is not guaranteed. Invalid-nonce finalized failure records may exist; do not equate finality with successful nonce consumption. Rejection of a proposed fence does not establish original payout completion.

Candidate design: Carol→Carol, exact ed25519 key from the original public payload, exact nonce 277184559000010, one Transfer of 1 yocto, V0, no FunctionCall/key operation/FLOOR mutation. Current fixed gas 446365125000; quoted upfront 0.000245500818750000000001 NEAR. Proposed 0.001 NEAR operational allowance is NOT current authorization or an encoded hard fee cap. Future transaction signing needs refreshed quote, explicit fee-exposure terms and sufficient remaining budget; no automatic retry. Original 0.142 reservation remains intact.

Fresh block 277470071/2iBUBDZTmSPzXx2STkrUNFDKESWJFE4JGHD11E6mx1h6, 2026-11-13T05:55:41.379Z: nonce 277184559000009, claim #16 Available/attempt 0, inflight 0, solvent; Active loan #15 and Carol NFT ownership, 0.10 FLOOR collateral. Original not expired: age 11148/86400. Loan repayment path still time-eligible at this snapshot; expiry November 14 09:34:11.656 IST. No financial action taken.

Both real sandbox orderings/routing tests are unexecuted because this phase prohibits signing/key creation. Installed sandbox 2.14.0/protocol88 has identical verify_nonce logic to live2.14.1 but that alone is not runtime proof. Separate sandbox-only signing authorization is reasonable. An actual public fence is only reasonable to consider after those tests, fresh target-status checks and a concrete bounded authorization; do not ask the user to approve an unverified success claim.

A. Original wins: require its actual finalized transaction identity/key/nonce, receipt graph, native transfer to Carol, claim_result callback, Paid claim, exact debit and fees. Do not submit a fresh withdrawal. Original nonce consumption can precede its payout; an InvalidNonce rejection of the fence is not evidence that the payout completed.
B. Fence wins: require a FINAL SUCCESS for the exact Carol→Carol single Transfer, original public key and exact nonce 277184559000010, one yocto, no additional actions; all receipts/refunds finalized, expected fee-only net debit and current key nonce >=n. Establish same account/key lifetime, no key deletion/recreation/nonce-reset path or unexplained other use. Verify claim #16 remains Available/attempt 0, borrower bucket 0.05, inflight 0, unchanged FLOOR native/accounting/loan/NFT. Independently verify final inclusion/receipts; a stale node returning UNKNOWN is not grounds to discard a verified final fence. Then original n cannot pass nonce validation and create a later payout receipt on that continuous key history. Only after full reconciliation may a fresh claim withdrawal be considered under separate authorization and fresh solvency/expiry review; it is not automatic.
C. Neither finalized: keep claim quarantined and reserve 0.142 NEAR. A submitted hash, forwarded transaction, pool acceptance, timeout or provider disagreement is not a fence. No rebroadcast/replacement/retry.
D. Unexpected nonce/key/account/code, contradictory balances, missing receipt/callback, changed policy, unrecognized action or unknown payout: STOP. Reconcile the actual winner and descendants; never choose the benign narrative merely because it is convenient.

Passive fallback: finalized canonical previous-header height strictly >277545323 excludes later valid acceptance under current config. Reconcile earlier inclusion/receipts, continuous key/account history, nonce, Available attempt-zero claim, native balances and inflight before declaring nonexecution. No wall-clock conversion or expiry-only resolution.

390 pre-existing tracked/Phase2A evidence files unchanged, approved FLOOR/FloorKit artifacts unchanged; zero signatures/key/mainnet/financial operations. Sources/new report files are E-drive-only. No old journal, recovery or acceptance report was edited. No frontend/contract/DAO/FloorKit change.

Required before actual recovery: separately authorize disposable sandbox signing; obtain real both-ordering and routing evidence; freshly recheck exact public key/nonce/reference validity/claim/receipts/time/budget; freeze the candidate and explicit spend terms; obtain separate public-fence authorization; then verify a FINAL successful winner and every descendant before any new withdrawal.

RECOVERY: STILL_UNKNOWN
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
