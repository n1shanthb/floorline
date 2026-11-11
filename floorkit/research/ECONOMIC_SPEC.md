# FloorKit Phase 0 economic specification

Status: proposed economics and executable reference, **not a smart contract or deployment**. Independent module; it cannot use Floorline's reserve, token, loan NFTs, DAO or access keys. No new frontend is part of this phase.

## Units, promise and immutable policy

Native amounts are integer yoctoNEAR; FT amounts are integer atomic units with Q=10^24 units per whole coin. All stored balances are U128; IDs, attempt counters and block timestamps/deadlines are U64. Checked U512 intermediates precede one final division and checked narrowing. No floating-point monetary operations.

R is exclusively liquid native backing assigned to this coin. T is NEP-141 total outstanding supply, equal to the sum of registered available balances. There is no lending, reserved mint, vesting allocation, hidden circulating denominator, external asset valuation or fee claim against R.

**B=R/T exists only while T>0.** The precise claim is nondecreasing B over every admitted transition with positive supply before and after it. Bootstrap establishes B; final exit ends that single lifetime permanently. This does not mean every operation strictly increases B, a guaranteed market price, a minimum positive atomic payout, yield, or asynchronous payout availability. A fixed-size redemption quote is not promised to be monotonic.

At atomic initialization freeze: initial price p>0 (yoctoNEAR per whole coin), markup μ in [0,10000] bps, maximum curve-tax parameter τ in [0,5000] bps, creator fee φ in [0,500] bps, creator beneficiary, metadata/decimals and code policy. These bounds are explicit product limits, not mathematical requirements for all possible curves. No economic setters, arbitrary mint/burn, reserve withdrawals, fee-rate upgrades, recovery beneficiary changes or operational sweeps exist.

## Bootstrap, independently derived

Initialization receives three **separate declared allocations**: positive seed reserve R0, creator-funded bootstrap recipient storage H0+K0, and nonwithdrawable operational/code reserve O0. Attached deposit must equal their checked sum. Additional pre-deployment account funding is unallocated cash U, not R0. Existing unexplained balances cannot determine token issuance. Deployment and initialization must eventually be atomic to prevent initialization capture.

Allocate all initial coins to the disclosed bootstrap recipient:

    T0 = floor(R0 * Q / p), with 0 < T0 <= U128_MAX.

No creator fee or markup is taken from this separately disclosed seed. It pays for the initial supply rather than minting free founder tokens. Reject zero output, insufficient separately prepaid storage/operations, aggregate overflow, repeated initialization, or unexplained R0. Then R0*Q >= p*T0, so rounding cannot make initial backing lower than the configured initial price per atomic unit. The initial price is an opening reference, not a permanent sell price or promised later buy rate.

Example in small integer base units: R0=10, p=3Q produces T0=3 and B0=10/3, not exactly 3. Marketing and views must not conceal that rounding.

## Buy / mint

Starting with R,T>0, accept a registered purchaser's positive attached deposit d. Storage is funded separately, never deducted secretly from d. Let H=10000:

    f = floor(d * φ / H)
    n = d - f
    m = floor(n * T * H / (R * (H + μ))).

Reject m=0, insufficient min_tokens, expired deadline, invalid input, insufficient token-record storage, or any checked aggregate overflow. Atomically set:

    R' = R+n; T' = T+m; F' = F+f; A' = A+d.

F is separately funded creator fee credit; no fee is ever taken out of old R. Fees are on gross purchases only, not bootstrap, redemptions, donations, storage or callbacks. The exact fee uses a single floor; splitting may reduce fee rounding and is not advertised as fee-splitting invariant.

Derivation: B' >= B iff n*T >= m*R. To charge a reserve markup μ/H, require m <= n*T / (R*(1+μ/H)); the greatest admissible integer satisfying that rule is the formula above. Since H/(H+μ)<=1, m*R<=n*T. This is a proof, independent of any previous research formula.

Increase is strict if μ>0 and m>0. With μ=0, increase is strict iff n*T>m*R; exact division gives equality. A positive creator fee alone does not imply backing growth: it funds F, not R. No claim says every positive d can mint. Slippage/deadline failures revert all native/token/storage bookkeeping.

Gross-deposit pricing followed by fee extraction is rejected: R=T=100, d=100, m=100, f=5 would give R'=195,T'=200 and B'=0.975<1. This is a counterexample to a rejected design, not a failing seed in the admitted model. Even a displayed nominal markup cannot repair a fee deducted from the wrong numerator.

## Redemption

Only a registered holder may burn 0<c<=their available balance. One yoctoNEAR authenticates the action and is assigned to O, not R. Fees are not taken from redemption backing. Require positive quote, min_near and deadline protection, plus prepaid claim-record storage.

Derivation: for 0<c<T, nondecrease requires payout x*T <= R*c. Any x<=R*c/T suffices. Choose a smooth retention fraction τ/H times the share of supply remaining, (T-c)/T. This retains value on partial exits while avoiding a last-atomic-unit discontinuity or terminal taxed reserve:

    q = floor(R*c*((H-τ)*T + τ*c) / (H*T*T)).

This is a **size-dependent curve**, not a flat τ-percent fee on every redemption. Effective continuous tax is (τ/H)*(1-c/T); it tends to zero for a complete exit. If the product requires a flat tax on a full exit, this specification must be explicitly redesigned, not silently relabeled.

Atomically burn c, decrease R by q and create a funded immutable-beneficiary native redemption claim for q. Supply and reserve change before any payout is dispatched; the claim is the replacement liability. No native Promise is itself evidence of payment.

For a partial exit, q<=R*c/T proves (R-q)/(T-c)>=R/T. Increase is strict iff q*T<R*c. With τ>0 and 0<c<T, the unrounded inequality is strict, so every admitted positive-output partial exit strictly raises B. Zero-tax exits can still raise B through floor rounding. Dust with q=0 is rejected without burning. A quote view may return zero, but the change method must reject it.

Example: R=T=1000, c=100, τ=2000 gives q=82, R'=918,T'=900. Sequential exits and splitting are not economically equivalent; the method promises its exact current quote, not order independence. Quotations use current state; min_near and deadline bound stale execution. Mempool ordering and sandwich risk remain.

## Full exit and zero supply

For c=T, the formula cancels exactly to q=R. Convert **all** remaining R to the final holder's claim, burn T, set R=T=0 and permanently set closed=true. No later mint, bootstrap, contribution-to-backing or reopening is permitted for that instance. Storage refunds, creator fee credit, claim payment, callback completion and record cleanup remain usable after closure. B is undefined after closure, not zero and not carried into a new lifetime.

Closed instances may still receive direct native transfers or gas rewards. Those belong to U, with no minting or sweep route; they cannot be captured by a future minter. Operational/storage/claim cash is never treated as residual backing. The invariant also rejects any R>0,T=0 state; it has no admin repair/mint path.

Alternatives considered:

- Permanent terminal closure: chosen. Easiest lifetime invariant, no resetting an old ratio, no claim to an immortal market. A community wanting a new coin deploys an independent new instance with a new identity. Last-exit tax exemption is explicit and smooth in the selected curve.
- Nonredeemable bootstrap supply: keeps T above zero and avoids closure, but requires truly nonredeemable custody, visible total-supply dilution and permanently inaccessible reserve participation. Sending seed tokens to a plausible address is not proof of nonredeemability. It adds restrictions and risks conflating circulating and total supply; not selected.
- Flat-tax closure with locked residue: mathematically possible if the instance is permanently closed and forfeited native cash is permanently segregated or assigned by an immutable upfront rule. It traps value or creates an extra beneficiary incentive. No arbitrary future minter may claim that residue. Not selected.
- Restartable epochs with R=0 and segregated old liabilities: can be solvent, but a new epoch may establish a smaller B. It does not satisfy a single coin's lifetime monotonicity claim. Reject for this product.

## Other admitted transitions

Explicit contribution adds positive attached NEAR to R without minting and strictly raises B while active. Closed contributions reject atomically. A transfer/transfer-call/resolver changes only ownership; supply/R stay constant. FT resolution returns only tokens still available at the receiver. No resolver burns tokens: participant registration is retained until resolution. This handles receivers that forward or redeem before callback without making a second token or cash claim.

Storage deposits/top-ups/refunds and one-yocto auth credits are excluded from R. Creator credit conversion and withdrawal use only F or its replacement claim. Native payout, failure, refund, retry and cleanup never touch R/T. O funds code/fixed headroom, not token backing or a withdrawable creator entitlement. There is no public spender of O or U. All methods preserve B or close the sole lifetime as specified above.

## Precision and round-trip boundaries

The mint numerator needs fewer than 270 bits, and redemption numerator fewer than 398 bits; denominators need fewer than 270 bits. U512 suffices for admitted U128 inputs, including factors wider than U128. Checked narrowing, total-supply, native-account, bucket-total and aggregate unresolved-I bounds are separately required. A U256-only multiply chain is insufficient. Reject counter/nonce exhaustion before creating any effect. U64 deadlines compare with block time, never caller-supplied execution time.

For an immediate mint/redeem of its newly minted m with no intervening operation, m*R<=n*T implies (R+n)*m/(T+m)<=n. Since q is at most that pro-rata amount, q+f<=d, even if purchaser and creator collude. Gas/auth costs only increase spending. This does not prove no profit under external trades, intervening donations or changing ownership.

Do not strengthen the actual promise: R=T=10000, c=1000, τ=2000 gives q=820. A buy with d=10000, μ=100, φ=0 mints 9900: R'=20000,T'=19900, B strictly increases, yet the same c now quotes 814. **Nondecreasing accounting B is not a nondecreasing fixed-size redemption quote.**
