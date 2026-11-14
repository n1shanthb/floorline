# Gate 2 standards implementation status

This is a method-level local-runtime checklist, **not blanket certification**. Evidence is in runtime/evidence/runtime.json, console.log, reference.json and views.json. Account/storage policy restrictions and unknown-callback liveness limits are explicit below. No public testnet or actual Sputnik integration is claimed.

## NEP-141 and supporting metadata/events

- **ft_total_supply — Implemented and runtime-tested.** Reports T, including collateral escrow exactly once. Core economic checkpoints match the Gate 1 reference.
- **ft_balance_of — Implemented and runtime-tested.** User balance is available FLOOR; the contract account reports the aggregate locked escrow balance. Snapshots record balances throughout the runtime scenarios.
- **ft_transfer — Implemented and runtime-tested.** Exact one yocto, authenticated predecessor, positive amount, distinct registered receiver, bounded memo. Wrong deposits and public escrow deposit/drain attempts reject. Acceptance/repayment/default use separate internal custody movements with matching transfer events.
- **ft_transfer_call — Implemented and runtime-tested.** Actual receiver receipts, available-token movement, prepaid resolution storage, participant reference locks, bounded msg/memo and minimum gas. Honest, rejecting, malformed, panicking and forwarding receivers run in sandbox. Receiver borrowing before refund cannot expose locked collateral to the resolver.
- **ft_resolve_transfer — Implemented and runtime-tested.** Private, actual promise result, bounded U128 parsing, unused amount capped by original transfer and receiver's available balance, no mint/burn or collateral access. Returns used amount. Direct forged/stale/no-promise-context calls reject. A valid duplicate promise-result replay cannot be manufactured through the public ABI; its state guard is also covered in the reference model rather than claimed as an independently forged sandbox callback.
- **ft_metadata (NEP-148) — Implemented and runtime-tested by the supplemental views script.** FLOOR, 24 decimals, ft-1.0.0 metadata shape.
- **NEP-297/nep141 mint/burn/transfer events — Implemented and runtime-tested.** Captured in receipt logs. Arbitrary custom memo text is bounded but not included in every event; a generalized indexer audit is not claimed.

Policy restrictions: receiver registration is required; public transfers into or out of the contract's encumbered escrow account are prohibited. Transfer-call methods require at least 110 Tgas; the public demonstration budget is 150 Tgas. These are explicit protocol preconditions. FT receiver refunds follow the standard available-balance rule: a malformed receiver that already held tokens can refund those fungible tokens too. The corrected forwarding fixture returns zero unused tokens after a successful forward; it does not rely on the resolver identifying particular fungible units.

## NEP-145

- **storage_deposit — Implemented and runtime-tested.** Self/third-party registration, top-up, registration_only, measured minimum, excess refunds through real tracked native receipts. It never mints or increases L.
- **storage_withdraw — Implemented and runtime-tested.** Exactly one yocto, optional amount, cannot exceed unused credit, real native refund, correct remaining storage balance. Record/bookkeeping allocation is not borrowed from L.
- **storage_unregister — Implemented and runtime-tested with a safety restriction.** Empty accounts unregister and receive native refunds. Missing accounts return false in code. Force cannot burn nonzero tokens or discard loan/NFT/claim/callback rights. Positive balances/live roles/allocated records block unregister. Full force-burn compatibility is deliberately unsupported because the requested protocol forbids destroying live rights; do not advertise unrestricted NEP-145 force semantics.
- **storage_balance_bounds — Implemented and runtime-tested.** Maximum-length account insertion measures the advertised minimum; no fixed maximum.
- **storage_balance_of — Implemented and runtime-tested.** Total and available credit; null after successful unregistration.
- **storage_refund_result — Implemented and runtime-tested for normal refund success.** Private callback, actual Promise result, record cleanup and in-flight accounting.
- **retry_storage_refund — Implemented but unverified in the failed-storage-refund branch.** State/ownership and conservative actual-balance checks mirror native-claim recovery, but the actual failed/refunded/retried sandbox scenario targets a loan claim, not a storage refund. Do not count that branch as runtime-tested.
- **Storage for offers, claims, active/closed loans, NFTs and pending transfers — Implemented and runtime-tested.** Persistent byte deltas, prepaid allocations and callback cleanup are recorded. Native attempts reuse fixed-width claim fields. Closed loan and paid claim cleanup free persistent bytes and original payer credit.

## NEP-171 and supporting metadata/events

- **nft_token — Implemented and runtime-tested.** Only canonical decimal IDs for Active loans yield a token; terminal loans return null. NFT metadata describes the exclusive repay/recover right; expiry metadata is in milliseconds while settlement uses nanoseconds.
- **nft_transfer — Implemented and runtime-tested.** Exact one yocto; current owner only; registered receiver; lender/debt/collateral/expiry unchanged. Carol->Dave and receiver->Dave forwarding execute in real receipts. No personal debt is imposed on the receiver.
- **nft_transfer_call — Implemented and runtime-tested.** Real receiver call with NEP-171 argument names and return-request convention. Honest, reject, malformed, panic, receiver-gas-exhaustion, forward, attempted pending repayment and attempted pending default cases execute. Pending counts prevent settlement until all resolutions complete; ordinary forwarding remains possible.
- **nft_resolve_transfer — Implemented and runtime-tested.** Self-only; one actual result; false means receiver keeps token, true/malformed/failure requests return. Return only if receiver remains current owner; a forwarded token is not clawed back from a new owner. Resolves exactly one stored transfer and releases its storage. Forged direct calls reject. Return value means transfer retained, not the reference engine's accepted argument.
- **nft_metadata (NEP-177) — Implemented and runtime-tested by the supplemental views script.** Loan-right collection metadata. Approval/enumeration extensions are not advertised.
- **nep171 NFT mint/transfer/burn events — Implemented and runtime-tested.** Ownership and terminal-right changes are present in receipt logs.
- **Approvals, royalties, enumeration and secondary-market interfaces — Unsupported/optional.** No approvals are granted; non-null approval_id is rejected. No secondary market is implemented.

Reference difference: forwarding during a pending call is supported in the adapter although Gate 1 blocked all further NFT transfers. Settlement still uses the actual final owner and requires pending_count=0. Callback failure keeps the lock; no timeout or user-supplied accepted flag exists.

## Remaining verification boundaries

The sandbox checks successful repayment **before** recorded expiry and default **at/after** expiry. It does not force a transaction at exactly the same nanosecond as expiry; the exact < versus >= equality partition remains verified by the reference test and source logic. Production-gas callbacks passed normal/failing receiver scenarios and bounded-history measurements. An intentionally underfunded callback artifact demonstrates fail-closed native payout state; it is not the deployable artifact. Unknown callback outcomes have no automatic recovery and can strand funds/rights. Extensive third-party wallet/market interoperability, independent review and standards certification have not been performed.

Primary interface references: [NEP-141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md), [NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md), [NEP-171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md). Compilation alone is not the basis for the runtime-tested labels above.
