# V2 security model

## Protected assets and invariants

- `L` is redemption backing and is never lender principal, storage credit,
  operational refund cash or a recovery subsidy.
- Lender principal remains in `unused_lender` or a funded borrower claim.
- `R_local = L + unused_lender + storage_total + operational + claim buckets`.
- Any transition that creates/restores a local liability must prove the account
  can retain `R_local` after the associated debit.
- FLOOR supply, locked collateral, transferable NFT ownership and loan terminal
  exclusivity retain v1 semantics.

## Threats exercised

- Beneficiary or outsider repeats withdrawal/finalization.
- Wrong owner tries to resolve another user's unknown claim/refund.
- Stale callback arrives after an owner-acknowledged terminal state.
- Multiple redemptions overlap.
- Native transfer reaches a deleted account and produces a proven failure.
- Transfer succeeds but callback exhausts gas.
- Refund callbacks repeatedly exhaust gas until storage capacity rejects growth.
- Old NFT owner, double repayment and repayment/default races.

## Guarantees and assumptions

Double-payment safety does not depend on an administrator: unknown outcomes have
no retry-to-pay transition. Owner acknowledgement only relinquishes the owner's
own unresolved right and cannot redirect value. Known failures are retried only
after the protocol callback classified Failure.

This assumes NEAR's promise result faithfully reports the immediately preceding
receipt action when the callback executes. Cross-shard loss before that callback
is intentionally treated as unknown. RPC responses and wall-clock time are not
oracles. Fault builds and short quarantine are test-only artifacts with distinct
hashes and must never be deployed.

## Authority and operational risks

The prototype does not solve account-level FullAccess authority. A mainnet
account key could replace code or spend funds regardless of these state-machine
rules. A reviewed custody/upgrade policy, independent code audit and monitoring
remain mandatory. Removing all keys should occur only after independently
checking initialization, reachable self-upgrade/global-code behavior and an
explicit decision to accept irrecoverable bugs.

There is still no on-chain pause, allowlist or total exposure cap. A frontend
limit cannot contain third-party calls. Adding privileged pause/recovery powers
would trade public exposure for administrator censorship/seizure risk and would
create another candidate requiring new economic and runtime gates.

## Monitoring requirements

Monitor code/access keys, native balance versus `local_required`, `inflight`,
claim/refund ages, `refund_storage`, storage stake/headroom, transaction and all
child-receipt outcomes, NFT pending counts and RPC disagreement. Never retry an
unknown payout. Alert before refund storage reaches its guard; owner acknowledgement
is a user decision, not an operator recovery action.

