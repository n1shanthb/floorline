# Gate 2 runtime accounting

The reference engine remains in src/engine.rs. The NEAR adapter in src/contract.rs uses persistent LookupMaps and fixed aggregate counters, not the reference engine's clone/scan implementation. Ordinary operations touch a bounded number of accounts and records. All actual financial amounts, identities, timestamps and callback results come from the NEAR environment. There is no public caller/time/success/refund-confirmation override.

## Local cash and promises

Let A be the actual account balance observed at a receipt boundary, L redemption backing, U unused Funded-offer principal, C0 borrower claims, C1 lender repayment claims, C2 redemption claims, C3 cancellation claims, H total user storage deposits (both used and available), and O the protected operational reserve.

    R_local = L + U + C0 + C1 + C2 + C3 + H + O
    A >= R_local

All are native yoctoNEAR. No expected principal repayment, interest, or collateral price occurs in this equation. The reserved storage_refund_claims bucket is currently zero: actual storage refunds move directly to tracked native refund receipts. I is the separate total of unresolved native claim transfers and storage refunds; it is excluded from R_local because the account may already have been debited for those receipts.

`accounting` exposes A, R_local, L, T, locked FLOOR, every local claim bucket, U, H, O, I, current storage bytes/stake, operational base, and reserved temporary-refund storage. The clamped `unallocated_or_inflight` view is A-R_local when positive: it may include funds whose outgoing receipt has not yet debited the account. It is **not** a withdrawable surplus, treasury contribution, recovery oracle, or proof of solvency. Always compare A directly with R_local.

Issue moves actual attached d to L and m existing-rule new units to T after the exact nondilution test. Contribution moves attached d to L and never mints. Borrowing consumes U and creates C0 without changing A, L or T. Repayment requires the current NFT owner and exact attached debt r, adds r to C1, and releases existing tokens. Default transfers tokens to the lender without creating a NEAR claim. A redemption burns only available FLOOR and moves Q from L to C2. Cancellation moves only unused U to C3. Every available claim is funded before dispatch. No public method lets a caller select a different native beneficiary.

Initial deployment funding is not L. Initialization protects measured code/storage plus 4096 bytes of constant-state headroom and 0.1 NEAR for temporary refund bookkeeping. It rejects insufficient initial balance. Additional deployment cash is unallocated; it is not booked as an unspendable fixed liability. Protected one-yocto deposits go to O, never to L. Unsolicited native transfers and gas rewards remain unallocated, not silently assigned to backing.

The operational reserve was corrected after a real runtime test: initially the entire deployment balance was booked as fixed O. A self-signed rejected transaction then spent gas from that account, violating A>=R_local even though third-party claims remained covered. The retained evidence records that failure. The corrected version protects a specific storage/headroom amount and leaves excess deployment cash unallocated. The reconciliation assertion itself was not removed or relaxed. Retained full-access keys can still arbitrarily spend/upgrade the account: this deployment is not ownerless or immutable, and the invariant assumes authorized runtime entrypoints rather than an adversarial full-access key holder.

## Measured prepaid storage

Registration measures persistent LookupMap insertion bytes. `storage_balance_bounds.min` uses a temporary maximum-length AccountId record, then removes it. Per-account base allocation uses the actual inserted record. User storage deposits are disjoint from L; available credit is total-used.

Offer creation measures a maximum-size serialized loan record, including maximum-length future owner/borrower IDs. That allocation covers subsequent field changes without a new storage charge in repayment/default callbacks. Claims and pending FT/NFT calls are measured on insertion; their immutable account strings cannot expand later. State/status/attempt fields have fixed serialized widths. Each record remembers its payer/allocation. Callback bookkeeping is paid before promises are created. Native claim attempt state is inside its already-funded fixed-width claim record.

Paid-claim and closed-loan cleanup removes persistent rows and releases the original payer's allocation into their unused storage credit; it does not refund from L. Live records cannot be cleaned. Permissionless cleanup cannot redirect the refund. Callback records are removed and storage is released only when the corresponding resolution succeeds.

NEP-145 native refunds use independent persistent Refund records so an account can unregister immediately without losing its refund information. Those temporary records are prepaid by the initial operational headroom, explicitly tracked in refund_storage, and allocation is rejected before exceeding O-operational_base. They never consume treasury backing or another user's refundable storage credit. The amount being returned remains a tracked in-flight obligation until a real callback. Normal successful callbacks remove these records and release operational bookkeeping capacity. Missing callbacks retain both the record and its operational allocation.

Force unregistration cannot burn tokens or destroy live NFT/collateral/funding/claim/callback rights: account references and outstanding storage allocations block it. An account with live funds must settle and clean up first. This is an intentional safety restriction, not blanket NEP-145 conformance certification.

## Native withdrawal transitions

Claim states: Available(0) -> InFlight(1) -> Paid(3), or RefundPending(2).

1. Owner calls withdraw_claim with no beneficiary parameter. State becomes InFlight, its local claim bucket decreases, I increases, and a real transfer Promise is created to the recorded owner. A new attempt ID is persisted before dispatch.
2. Private claim_result requires one actual promise result, self-call authority and the matching InFlight attempt. Successful transfer marks Paid and decreases I. Failed transfer marks RefundPending, **without crediting cash or making the claim available**.
3. Owner may request retry_failed_claim only for RefundPending. The contract additionally requires `A >= R_local + I`, pessimistically reserving all unresolved outgoing transfers even when some have already debited the account. This avoids treating an undebited unrelated promise as available refund cash. If the check fails, the claim stays locked. If it passes, the known failed amount moves out of I and back to the original funded claim bucket. The next withdrawal gets a fresh attempt.
4. Missing/failed callback leaves InFlight, even if the recipient actually received the money. A caller cannot turn an unknown outcome into a retry. Duplicate, wrong-owner and stale attempts fail without changing state. Storage refunds follow the same known-failure/available-balance rule before resubmission.

Actual failed transfer and retry are tested by deleting only an ephemeral sandbox receiver, observing the failed transfer and callback, recreating that local receiver, and retrying to the same immutable identity. No public accounts or deployment access keys were deleted. The fault-injection artifact attaches 0.001 Tgas to callbacks and demonstrates native transfer followed by callback gas exhaustion: the claim stays InFlight and both repeat withdrawal and retry are rejected. Production callbacks use 30 Tgas, zero unused-gas weight, and preallocated bounded records. The fault artifact must never be deployed as the product.

## Tokens, NFT callbacks and reference differences

T includes available user FLOOR plus one aggregate contract escrow balance. Public FT methods cannot transfer into or drain that escrow. Loan acceptance moves available tokens into escrow without minting; repayment/default release them without burning. FT resolver refunds are limited to the receiver's **available** tokens and cannot consume collateral the receiver locked before resolution. Both transfer-call participants retain reference locks against unregistration until callback cleanup.

NFT owner changes follow actual AccountIds. Transfer-call stores a unique persistent resolution record and increments a per-loan pending count. Unlike Gate 1's conservative model, the runtime allows the NFT to be forwarded, including during a pending call. Settlement stays blocked until every pending count resolves. A true return request, malformed result or failed receiver reverts only if the current NFT owner is still that receiver; otherwise a forwarded NFT stays with its actual current owner. Callback return values follow NEP-171, not the engine's accepted flag. No callback can release collateral. Missing NFT callbacks leave settlement locked; there is no timeout-based ownership guess.

Reference/runtime economic checkpoints compare L, T, locked supply, account token balances and separate cash-claim buckets. Real measured storage, one-yocto operational credits, actual gas/rewards, registration sponsorship, NFT forwarding and actual Promise/refund timing deliberately differ from the reference harness. Contribution requires no registration because it creates no donor record. Actual timestamps use block_timestamp; before-expiry repayments and after-expiry defaults are checked against recorded execution blocks. Exact nanosecond equality is covered by the reference boundary test; the wall-clock sandbox does not force an execution at precisely expiry.

## Limitations

This is local runtime evidence, not a security audit or production funds authorization. Callback loss can permanently strand claims or NFT settlement; safe recovery from an unknown outcome is intentionally unimplemented. A malicious NFT recipient may prolong a pending chain, but cannot create a second collateral claimant. Forced-unregistration burn behavior is deliberately restricted. Public testnet protocol/gas/storage versions and actual Sputnik code must be verified separately. B is a nondecreasing admitted-transition backing ratio, not a fixed redemption price, positive atomic minimum, USD floor or guaranteed lender return.
