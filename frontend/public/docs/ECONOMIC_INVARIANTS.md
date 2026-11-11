# Gate 1 economic invariants

Status: implemented in `src/engine.rs`, with exact arithmetic in `src/math.rs`. Gate 1 is a deterministic internal ledger, not an assertion about deployed NEAR balances. This document supersedes the old treasury-funded model as the current mathematical specification.

## Definitions

- L: native NEAR units exclusively assigned to redemption backing.
- T: total outstanding FLOOR atomic units, including active loan collateral exactly once.
- B=L/T, only when T>0: a backing ratio, not a redemption price, market price, USD floor, or lender recovery guarantee.
- c: positive unlocked FLOOR units being redeemed, c<=T.
- tax_bps: immutable integer in [0,9999]; t=tax_bps/10000.
- d: net attached units assigned to L, excluding separately funded storage and operational reserves.
- m: FLOOR issued under immutable rational weight w_num/w_den: floor(d*w_num/w_den).

The engine has no admin mint, backing withdrawal, treasury loan, reserved issuance, fee entitlement against backing, or mutable tax/weight setter. External principal is never in L. Registered accounts' available FLOOR plus collateral held for active loans equals T. Closed NFTs do not represent live collateral rights.

## Issuance proof

For T>0 accept issuance only when d*T>=L*m. Both sides are compared using wide integers. Then:

    (L+d)/(T+m) >= L/T
    iff (L+d)*T >= L*(T+m)
    iff d*T >= L*m.

m=0, d=0, insufficient min_tokens, overlarge output and accumulated-balance overflow are rejected atomically. The immutable weight is a predefined issuance rule, not an arbitrary user-specified minted amount. A donation or retained tax may raise backing enough to reject subsequent issuance at this weight. Rounding sometimes permits a smaller issuance at a higher effective price; this is tested. There is no promise that every positive deposit will be accepted and no unimplemented dynamic/scheduled issuance claim.

## Redemption proof and rounding

Implement the requested curve with a single final floor:

    Q = floor(L*c*((10000-tax_bps)*T + tax_bps*c) / (10000*T*T)).

For c<=T and tax_bps<10000, the factor in parentheses is at most 10000*T. Thus 0<=Q<=L*c/T. For 0<c<T:

    (L-Q)/(T-c) >= L/T
    iff L*c >= Q*T.

The tests compare these products with an independent arbitrary-precision BigUint oracle. The code does not use floats or staged truncation. Example L=2,T=3,c=2,tax=2000 gives Q=1; staged flooring of L*c/T and then applying a factor would incorrectly give 0. No curve correction was needed: this implements the user's final-floor definition directly and deliberately differs from earlier staged-rounding experiments.

All financial stored values are checked u128; expiry and ID/attempt counters are checked u64. Mathematical intermediates use 512 bits: L*c*((10000-tax)*T+tax*c) is strictly below 10000*2^384<2^398; the denominator is below 2^270. Issuance products and backing comparisons require at most 256 bits. These bounds prove the wide operators cannot overflow for admitted input types. Zero denominator is rejected before division; narrowing checks the output. Settlement rounding is always downward.

Zero-output quotes are returned as zero by quote, but redemption of them is rejected before any burn. min_out prevents execution below a user's bound. Splitting and transaction ordering can change payouts and tax retention; no invariant says different operation order gives equal payouts. Tiny quotes do not imply a positive minimum atomic redemption price. External fees are absent in Gate 1.

## Bootstrap and complete exit

The only admitted zero-supply state has L=0. The engine rejects backing contributions while T=0; therefore the T=0,L>0 state is unreachable through the API. A future adapter must classify unsolicited account transfers as unallocated operational cash, not silently assign them to L. First issuance establishes B using the predefined weight. It does not increase a prior ratio, which was undefined.

When c=T, the exact curve returns L for every admitted tax. This removes all remaining backing and returns to L=T=0; old cash claims and storage reserves remain segregated. A later first issuance cannot capture old claims. If any collateral is locked, no user owns T unlocked units, so full redemption cannot succeed. Tokens are never burned by default or repayment.

## Cash conservation

At modeled local boundaries define:

- A: locally held modeled native NEAR.
- U: principal in Funded offers only.
- Cb: available borrower payout claims.
- Cr: available lender repayment claims.
- Co: other available claims (redemption, cancellation, storage refund).
- H: unused refundable storage credit.
- K: storage allocation retained for persistent records, including tombstones.
- O: separately deposited operational reserves.
- I: dispatched InFlight or AwaitRefund cash, outside local spendable balances.

The exact local partition is:

    A = L + U + Cb + Cr + Co + H + K + O.

I is reported separately and is not on either side of the local cash equation. Terms such as future debt and collateral price are absent. The model rejects aggregate cash values that exceed u128.

Funding an offer adds actual modeled deposit p to A and U. Acceptance moves p from U to Cb. Cancellation moves p from U to a cancellation claim. Repayment adds exact attached r to A and Cr; it does not recognize interest before receipt. Redemption moves Q from L to a claim. No creation of a claim increases the total local cash obligation unless an equal deposit increases A.

Storage deposits add to A and H (and registration allocates part to K). Charging record storage moves H to K. Storage withdrawal moves H to a funded refund claim, reserving claim-storage cost separately; it cannot borrow from L. Operational funding increases A and O, with no spender implemented in Gate 1. These units are abstract accounting amounts, not measured chain storage costs.

Dispatch of a claim x changes A->A-x, available claim->InFlight(x). It does not subtract L again. Success marks Paid and removes I. A failure notification changes InFlight->AwaitRefund without increasing A. Only a distinct trusted confirmation of refund moves I back into A and makes the claim available. A retry gets a new attempt nonce; duplicates and stale callbacks are rejected. Unknown outcomes remain unavailable. Each claim's beneficiary is immutable. The caller cannot redirect it or withdraw it twice.

The future runtime adapter must establish when actual receipts debit/refund account cash. Gate 1's callback authority and refund confirmation are harness inputs, not proof that a real NEAR transfer/refund happened. A user must never be allowed to supply these inputs to a deployed public method.

## Collateral and NFT rights

    sum(account.available) + sum(active_loan.collateral) = T.

An offer has one fixed lender, principal p, repayment r>=p, collateral c>0, and positive duration. Expiry is checked now+duration at acceptance. Offer IDs become NFT IDs only while Active. Funding itself creates no debt claim. Acceptance locks existing FLOOR and consumes the funded principal once. Original borrower retains the already-funded payout claim if the NFT moves or the loan later defaults.

Only the current NFT owner can pay exact r before expiry and reclaim c. Default is permissionless for a registered processing caller at now>=expiry, but always credits c to the immutable lender. Repayment and default replace Active with exclusive terminal states; therefore one cannot follow the other. Neither changes L or T. Cancellation is possible only from Funded. There are no forced sales or guaranteed lender NEAR proceeds.

NFT transfer changes only the owner. Modeled transfer-call also saves previous owner, receiver and nonce. While unresolved, further NFT transfers, repayment and default are blocked. A trusted accepted result keeps the receiver; rejection restores the prior owner. Duplicate/stale resolutions fail. There is no unsafe timeout unlock. Timestamp updates are nondecreasing harness actions; the future adapter must obtain them from env::block_timestamp, not public user input.

## Limits

These are inductive invariants over this engine's transition API, reinforced by runtime assertions and independent tests; randomized evidence is not exhaustive formal verification. Storage fees are illustrative model units and must be replaced by measured prepaid storage. Engine account IDs are registered local integers; chain identity/access control is not implemented. Full-state clone/check and BTreeMaps are suitable for Gate 1, not a gas-scalable production storage layout. The in-flight state machine needs actual receipt verification and callback-liveness tests. NFT/FT standards, runtime storage refunds, public methods, gas budgeting, deployed immutability and independent security review remain future gates.
