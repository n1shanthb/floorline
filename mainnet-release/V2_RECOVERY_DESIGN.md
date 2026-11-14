# V2 recovery design

## Scope and conclusion

V2 is a new prototype under `v2/`; FLOOR v1 source, artifact and testnet state
are unchanged. The candidate improves known-failure recovery and bounds the
effect of lost callbacks without pretending that an on-chain contract can know
an absent cross-shard receipt result.

There is **no safe permissionless retry for a genuinely unknown native-transfer
outcome** in the current architecture. V2 therefore remains fail-closed and is
not a complete availability solution.

## Actual v1 failure modes

Claim withdrawal changes `Available -> InFlight`, removes the amount from its
local claim bucket and adds it to aggregate `inflight` before dispatch. A callback
then proves Success (`Paid`) or Failure (`KnownFailed`). If the callback never
executes, the claim stays InFlight permanently. Storage refunds similarly retain
an InFlight `Refund` record and its `refund_storage` allocation.

V1's known-failure checks require `A >= R_local + I`, where `I` includes every
unrelated uncertain payout. One unresolved successful payout can therefore
prevent restoration/retry of another user's proven failed payout. Lost storage
callbacks also accumulate finite operational records until refund-producing
methods reject.

## Candidates considered

| Candidate | Decision | Reason |
|---|---|---|
| Retry after timeout | Rejected | If the first transfer succeeded but its callback was lost, retry pays twice. Time does not prove non-execution. |
| Infer outcome from account balance | Rejected | Concurrent deposits, transfers, storage changes and receipt timing make the same balance compatible with success or failure. |
| RPC/explorer proof submitted permissionlessly | Rejected | The contract cannot authenticate ordinary RPC history. A light-client or protocol receipt-proof verifier would be a new, much larger trust and gas design. |
| Idempotent receiver contract | Conditional only | It can make delivery to that receiver idempotent, but arbitrary wallet payouts are lost, receiver code/key mutability matters, and withdrawing from the receiver recreates the same problem. |
| Recovery oracle/committee | Technically possible, not implemented | A trusted threshold could attest Paid/Failed. A false Failed attestation can authorize a double payout; this adds explicit seizure/solvency trust and needs governance, bonding and audit. |
| Fail-closed owner acknowledgement | Implemented | After quarantine, only the beneficiary may accept an unknown result as Paid. It sends/restores nothing, so it cannot double-pay. A genuinely failed transfer may be voluntarily forfeited. |

## V2 state-machine changes

1. Each claim/refund records `dispatched_at`; views expose a quarantine end.
2. Production quarantine is 24 hours. The clearly distinct fault artifact uses
   five seconds only for local tests.
3. `retry_failed_claim` now proves the post-transition local invariant directly:
   before restoring amount `c`, require `A >= R_local + c`. Other InFlight values
   are not charged again.
4. `retry_storage_refund` requires `A >= R_local + r.amount`, exactly the balance
   needed so the transfer can debit `r.amount` while retaining local liabilities.
5. `finalize_unknown_claim_as_paid` is owner-only, post-quarantine and performs
   no transfer. It marks Paid and removes that amount from `inflight`.
6. `finalize_unknown_refund_as_paid` is receiver-only, post-quarantine and sends
   no value. It releases the bounded temporary record and `refund_storage`.
7. Late, stale or duplicate callbacks/actions fail without changing terminal
   state. Unknown outcomes are never restored to Available.

For a known failed claim, callback execution proves the transfer action failed
and its deposit returned. Restoring `c` changes required liabilities from `R` to
`R+c` without changing `A`; the new guard directly proves `A >= R+c`. For an
unknown claim, no transition that sends or restores value exists, preserving
double-payment safety.

## Remaining limitation

If the original transfer genuinely failed and its callback was lost, V2 cannot
recover value permissionlessly. The owner can leave the right quarantined or
voluntarily acknowledge it as paid and forfeit recovery. A user who refuses to
acknowledge an unknown refund can retain one bounded record; enough such records
can exhaust the finite operational refund allowance. This is bounded storage
growth, not guaranteed cross-user refund liveness.

