# FloorKit invariants and transition proofs

All claims below concern the proposed pure transition system. They are not proof of near-sdk storage serialization, callback timing, gas sufficiency, actual immutability or a deployed FloorKit account. `model.py` assertions implement the admitted-state invariants. Tests reinforce the reasoning rather than replacing it.

## Economic state

E1. Active means R>0,T>0. Closed means R=T=0 permanently; closed cannot become active. No arbitrary burn or forced unregister burn is admitted.

E2. T equals the sum of available token balances. Transfer-call moves existing tokens and locks account references, not extra supply. Resolver refunds at most receiver availability and never destroys a positive claim to R.

E3. For every transition with T_before,T_after>0, R_after*T_before >= R_before*T_after. Multiplication uses wide integers, not a rounded B view. Initialization establishes the first ratio; closure has no after-ratio and cannot be followed by a reset.

Proof by operation: net-priced mint uses m*R<=n*T; partial redemption uses q*T<=R*c; contribution adds R at constant T. All remaining admitted operations leave R,T unchanged. Full redemption returns exactly R and enters irreversible closure. These cover the complete economic method set; privileges do not provide another spender/mint path.

Strict mint growth requires n*T>m*R, strict redemption growth requires q*T<R*c, and positive donations at T>0 are strict. Transfers, creator withdrawals, storage, native dispatch/callback/refund/retry, cleanup and time are constant. There is no strict-growth-for-every-operation claim.

## Complete balance sheet

All native values below are in yoctoNEAR:

- A: actual locally held native account balance, including storage-staked cash.
- R: unencumbered backing assigned only to this coin.
- C: all **available** funded native claims, with categories redemption, creator-credit conversion, storage withdrawal, unregister and storage-excess refund. Categories are views over disjoint records, not additional amounts to sum twice.
- F: earned creator fees not yet converted to native claims.
- H: sum of users' free refundable storage credit.
- K: sum of users' allocated storage credit, including base records and still-live/tombstoned claim/call records. It is not free cash.
- O: nonwithdrawable operational/code/refund-pool reserve, funded separately.
- I: face value of InFlight or known-failed/unrestored native attempts. Not immediately withdrawable, and never available as lending/mint cash.
- Q: trusted **environment oracle** total for scheduled native sends not yet debited from A. The contract cannot directly observe this aggregate. 0<=Q<=I.
- U: proof/environment-level unallocated incoming cash/refunds, not obtained by reading A minus local liabilities and not spendable through a generic public method. Like Q, U is not individually observable by contract code: direct transfers and late refunds need not execute a receiver method. The implementation does not need an exact U counter; its failed-restoration guard uses only actual A, P and I. The model's U bookkeeping proves that guard safe.

Define P=R+C+F+H+K+O. The pure environment establishes the exact identity:

    A = P + U + Q, with U>=0 and 0<=Q<=I.

It follows that A>=P. The conservative executable invariant a contract can check is **A>=P**, with no inference that A-P is free cash. The pending Q component may still be debited. For queued native promises, A-Q=P+U, so every immediately available entitlement in P remains covered even after all queued debits. I is explicitly outside P because it may already have left the account. Reporting A>=P+I at all intermediate receipts would falsely require double collateral after a real native debit; do not claim it.

R is also a contingent redemption allocation, not an additional payable claim on top of a simultaneously withdrawn R. Redemption moves q from R to C exactly once; creator conversion moves x from F to C once; storage refund moves x from H/K to C. No method can keep the original liability and also spend its replacement. Thus R+C+F+H cannot promise more immediately accessible native cash than A after queued commitments and protected storage/operations are accounted for.

## Async transition algebra

1. Dispatch available x: C-=x, I+=x, Q+=x; A unchanged. P decreases x; identity holds. A funded obligation becomes a single unresolved attempt before creating its native Promise.
2. Trusted native send executes, successful or temporarily failed: A-=x,Q-=x. P/U unchanged. On success, recipient receives x; this is recorded by the test environment, not optimistically by dispatch.
3. Private, real successful callback: InFlight→Paid; I-=x. No local cash credit and no new claimant. A missing callback leaves I unresolved even if the recipient received payment.
4. Private, real failed callback: InFlight→RefundPending; I unchanged, no C credit. It does not assert that a native refund has arrived.
5. Trusted actual native refund: A+=x,U+=x; no new available claim. May precede/follow its known-failure callback. Duplicate transport refund is impossible in the environment.
6. Known failure restoration of x requires owner, matching failure state, and A>=P+I. Since A=P+U+Q and the failed attempt is no longer queued, I>=Q+x. Therefore U>=I-Q>=x. Move U-=x,I-=x,C+=x. P increases x, exact identity remains. If spare unallocated cash funds restoration before the old refund arrives, that later refund increases U and never creates another claim. Calling this a verified-refund-arrival oracle would be incorrect.
7. Next dispatch uses a fresh checked nonce; stale/duplicate callbacks cannot resolve it. Unknown InFlight is never restored by time, caller testimony, a parent success or A-P alone.

Critical overlapping-payout case: claim A fails after debit while claim B remains queued. A-P includes B's queued cash. A naive A>=P+x check can restore A without its returned funds, allowing two outgoing debits to consume protected backing. The P+I gate reserves all unresolved promises and rejects that ordering unless real spare cash covers every nonqueued unresolved face value. This deliberately sacrifices some retry liveness.

## Storage and operation protection

H+K are kept within P, including allocated bytes. Actual storage stake S must satisfy S<=K+O, so no storage stake consumes R/C/F/H. A record payer moves free H to allocated K before any growth; cleanup only returns allocation to the original payer. Fixed-width status/attempt fields and maximum AccountId serialization prevent callback record expansion. Metadata and messages are bounded.

Combining the two protections gives A-Q-S >= R+C+F+H+(K+O-S) >= R+C+F+H. Thus the coin's liquid backing and available payouts remain funded after both queued native debits and actual storage encumbrance. Operational/storage amounts are not counted twice as additional native cash.

The pure model uses abstract BASE=4, RECORD=2, CALL=2, CODE=10 and eight pre-funded overflow/unregister refund slots. These are explicitly not NEAR byte costs. An allocated per-user slot bounds ordinary storage refund records; the operational pool bounds refunds after removing an account and excess deposits by unregistered sponsors. Saturation rejects the whole operation; no unfunded fallback row. Paid records require bounded cleanup to release their slot/credit. A lost callback can occupy a slot indefinitely, a real liveness/DoS tradeoff.

Registered users cannot unregister while they own tokens, claims, paid uncleaned records or FT callback references. `force=true` does not override these restrictions. A wrapper must return false, without a destructive effect, for an unregistered account and implement the NEP-145 argument/return shapes; the model's registered-case methods return record IDs for test inspection. See the architecture for the precise supported profile.

All incoming one-yocto authorizations increase A and O together, never R. Explicit deployment operations fund O. There is no self-signed operational spending transaction admitted after lock-down. Any future operational expense/reclassification would require a new modeled/proven transition; it is not silently allowed by this proof. Gas charged to the originating user is external to these balances. Unexpected charges to protected contract cash or a changed storage regime are outside the proof and must fail the deployment/security gate.

## Exact assertions and exclusions

Assertions check U128 fields and aggregate P/I, U64 counters/time, token conservation, exact cash partition, local solvency, storage allocation/stake coverage, closure, creator-config immutability, funded record payers and retained FT participants. Expected rejection must restore the entire state. Full-state cloning/sums are reference-only; a contract needs persistent maps plus bounded checked aggregate counters.

Conditional assumptions: authenticated NEAR predecessor and private promise results; actual deposit/transport semantics; checked byte measurement; stable admitted storage/gas funding regime; no external full-access spender; no self-upgrade or arbitrary action execution; no mutable global-code reference; correct port of U512 arithmetic. The model cannot prove these runtime facts. It does not prove fixed-size payout monotonicity, fair ordering, market support, independent people, callback delivery or unrestricted liquidity.
