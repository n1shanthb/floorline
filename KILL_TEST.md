# Floorline kill test — 10 November 2026

## Decision

**NO-GO for Floorline's proposed unconditional monotonic, immediately redeemable floor.** A locked-collateral loan reduces liquid backing while token claims remain. Distributions and dilutive issuance also break the claim. This is a mathematical failure, not a Rust limitation. Do not ship that guarantee by November 14. Abandon Floorline in its proposed form if that guarantee is essential.

A smaller treasury-token experiment without loans or withdrawals of backing is mathematically viable under the admission rule below. It is a changed product. No frontend has been scaffolded.

## Evidence and limits

The workspace was empty. No proposed Floorline formula, implementation, deployed account, DAO ID, or signer was provided. Accordingly this report tests an explicitly stated candidate: the Juicebox-style taxed redemption curve, native NEAR only, no external asset prices. It cannot certify equivalence with an unspecified Floorline specification.

`src/lib.rs` is an executable, checked-u128 reference model, not a deployed contract. `src/contract.rs` is a separate near-sdk NEP-171 core **fixture experiment**, with native collateral, zero principal, and no collateral withdrawal endpoint. It is not the economic model ported on chain, not a funded transferable loan demonstration, and not audited NEP-171 compliance. These are material unmet acceptance gates.

No real testnet transaction was submitted. No standard local testnet credentials were found. Real Sputnik execution, deployed WASM runtime compatibility, storage pricing, cross-contract receipts and NFT callback behavior are unverified. A DAO source review is not transaction evidence.

## 1. Quantities and the actual redemption rule

Let A be actual native NEAR held by the account at a specified receipt boundary; K storage and operational reserves; L unencumbered liquid redemption backing; W unpaid claims still held locally; D reserved community distributions; F payable external fees. Partition cash, never double count: A >= K + L + W + D + F.

Let S be all existing token claims, including locked collateral; C locked collateral; S-C freely circulating claims; P outstanding contractual loan principal. All quantities use atomic units. Pending-redemption tokens have been burned and excluded from S. Native NEAR/USD price changes remain outside this invariant.

L/(S-C) is liquid backing per freely circulating token, where that denominator is positive. L/S is liquid backing per existing token claim. They are different. (L+P)/S is nominal book backing, not liquid backing or guaranteed recovery: own-token collateral has no independent NEAR liquidation value. If collateral is burned with a remint right, add that contingent supply back to the economic denominator, even though NEP-141 total_supply excludes it.

For q tokens, 0<q<=S, and tax fraction t, the idealized redemption is

    R(q) = L (q/S) [1-t+t(q/S)].

Per token this is L/S [1-t+t q/S]. It depends on size. The marginal limit as q tends to zero is (1-t)L/S, not L/S. This is a continuous curve lower bound before rounding, fees and liquidity restrictions, not a guaranteed atomic payout.

With integer arithmetic our explicit staged quote is:

    base = floor(L*q/S)
    factor = 10000-tax + floor(tax*q/S)
    payout = floor(base*factor/10000)

Zero supply and q>S are rejected. At tax=10000, return zero, including q=S. Otherwise q=S returns all L. Checked intermediate multiplication rejects overflow; it does not silently wrap. This restriction can reject otherwise representable quotients. Production should use an audited wide mul_div or explicit admitted range.

There need not be a positive minimum realizable per-token payout: L=1, S=100, q=1 gives zero. The model rejects zero-output redemptions. For any specific admissible q, only its integer quote, protected by an execution-time min_out, could be promised. Across future states no positive universal price is established here. The minimum across allowed atomic batch sizes must include rounding; the continuous limit cannot be advertised as that minimum.

Source comparison: [JBCashOuts.sol, nana-core/main](https://raw.githubusercontent.com/Bananapus/nana-core/main/src/libraries/JBCashOuts.sol) uses surplus, staged mulDiv rounding, a maximum-tax zero branch before its full-supply branch, and accepts count>=supply at library level. Our model rejects count>supply. It normalizes the tax denominator to 10,000. A fixed proportional haircut L*q/S*(1-t) differs at every nonzero tax and positive share; notably a full redemption at nonmaximum tax returns all surplus in the reviewed library. Full token ownership does not override the maximum-tax zero branch. This source is a mutable main reference; a production equivalence audit needs a pinned dependency commit.

Current [REVLoans source](https://raw.githubusercontent.com/rev-net/revnet-core-v6/main/src/REVLoans.sol) burns collateral and remints on repayment. Its capacity calculation adds borrowed principal to surplus and burned loan collateral to supply; fresh borrowing is additionally capped by live surplus. It includes source validation, fees, and expiry mechanics absent from this model. Those nominal-accounting adjustments do not turn receivables into native cash. See [REVOwner runtime hooks](https://raw.githubusercontent.com/rev-net/revnet-core-v6/main/src/REVOwner.sol) for additional routing and cash-out behavior; the standalone curve is not the full deployed protocol.

## 2. Transition analysis

The following claims concern B=L/S with S>0. They must not be substituted for freely circulating backing or executable payout quotes.

**Initial issuance:** if S=0, B was undefined; issuance establishes d/m. It does not increase a previously defined floor. Donation to a zero-supply treasury requires an explicit policy; otherwise the first minter can capture it.

**Later deposit and issuance:** B'=(L+d)/(S+m). Nondecrease holds exactly when d*S>=L*m. Example L=S=100, d=10, m=20 gives 110/120, down from 1. Changed issuance rates need an execution-time admission check. With m=w*d, sufficient condition is w<=S/L. Storage and external fees reduce d to net backing added. Reserved/free token issuance counts in m, even if not yet distributed.

**Issuance cuts:** changing only a future weight changes neither L nor S. A lower future weight helps but does not prove subsequent deposits are nondilutive. Time itself changes nothing unless a transition mutates accounting. Auto-issuance without added backing dilutes.

**Redemption:** for q<S and R<=L*q/S, (L-R)/(S-q)>=L/S. For the continuous curve the increase equals t*L*q/S^2. Staged downward rounding preserves that inequality. It is strict only when positive value is retained; full redemption leaves no ratio. Small and large redemptions differ in average price; splitting is path dependent. Raising t reduces payout quotes even if B stays unchanged. Fix tax if a stable quote policy matters.

**Loan origination with locked tokens counted in S:** L'=L-p, S'=S, so B falls for every p>0. Minimal whole-unit example L=S=100, lock 20 tokens, lend 10: 1 becomes 0.9. Freely circulating backing instead becomes 90/80, demonstrating how a denominator switch can conceal this failure. It excludes the collateral's repayment rights.

**Burned collateral:** visible L/(S-c) may rise if p<=L*c/S, but (L-p)/(S+c_contingent-c) still falls with p>0. Omitting remint claims is not a solvency proof. Repayment later remints supply; its visible ratio is nondecreasing only if repayment per reminted token is at least the pre-repayment visible backing. Example L=90,S_visible=80, repayment 10, remint 20 yields 1.125 to 1. Counting contingent claims consistently avoids that apparent gain/loss, but does not solve liquidity.

**NFT transfer:** unchanged cash, principal and collateral; ratios unchanged. Rights must follow current NFT ownership. Freeze repayment, liquidation and further NFT transfers while a transfer_call is unresolved to avoid stale-owner settlement in this minimal design.

**Repayment with locked supply:** principal returned raises L while S is unchanged; B rises. Transfer locked tokens to the current NFT owner, close the position atomically. A pending payout for the original loan remains a separate liability even if repayment arrives first.

**Expiry/liquidation:** if collateral is burned on default, L stays fixed and S drops by c; liquid B rises. Nominal backing changes from (L+P)/S to (L+P-p)/(S-c), so it rises iff p/c <= (L+P)/S. Default does not recover any cash. Releasing collateral while forgiving the debt would make unsecured default trivial. Exact expiry rule used here: repayment only at now<expiry, liquidation at now>=expiry. Chain timestamps do not move backward; tests advance them only.

**DAO contribution:** net unencumbered attached NEAR increases L without S; B rises for S>0. Earmarked contributions may increase D rather than L. Calls from DAOs receive no special solvency exemption.

**Distributions, fees and storage growth:** reserving x out of L decreases B by x/S immediately, before payment. Paying an already segregated reserve changes neither L nor S. Example L=S=100, reserve 10 for community: B=0.9. Storage subsidized from backing has the same effect. Reserved token minting instead increases S and dilutes unless separately funded.

**Successful payout:** if quoted cash was segregated first, completing it reduces A and W equally, not L again. Failed payout must remain a creditor claim available for retry to the same beneficiary. Returning that cash to L while leaving the creditor claim live double counts. Restoring burned tokens on failure after other operations requires a separate proof and is deliberately excluded. Callbacks must be private, single-use and keyed to persistent payout IDs.

## 3. Solvency proof and asynchronous boundary

At a local reservation boundary maintain A=K+L+W+D+F+unallocated, with all terms nonnegative. A redemption allocates r<=L: decrease L by r and increase W by r **before** creating a transfer promise. A second request sees only the remaining L. Successful local settlement decreases A and W together; failed settlement preserves W. Principal P is never on the cash side of this equation. Fees payable elsewhere belong in F; a retained redemption tax stays in L, not both F and L.

Actual NEAR receipt execution requires an extra distinction absent from this synchronous model. Split W into locally held claims W_h and dispatched in-flight claims W_i; let I be NEAR already committed to receipts outside the account. Local cash must satisfy A>=K+L+W_h+D_h+F_h. Track I separately, never add it to L. Total pending W=W_h+W_i, but W_i must not be subtracted a second time from an account balance already debited by dispatch. Use per-payout states Reserved -> InFlight -> Paid or RefundConfirmed/Retryable, and confirm the refund before retry. Receipt failure, transfer failure and callback failure are separate events. A missing callback is unresolved, never assumed failed. Reconciliation must be idempotent and cannot depend on a user-provided success boolean.

Induction: every reservation moves cash between disjoint local buckets; every confirmed successful payment removes an equal asset and liability; every refund restores local cash and the corresponding local claim. Therefore no admitted *local immediate* claims exceed local controlled cash. This is a proposed adapter invariant, not runtime proof: the reference model collapses dispatch and settlement, `settle` is a model operation, and beneficiary authentication/retry state is not implemented there.

Collateral is an asset of its owner held in escrow, not another native NEAR reserve. Test model collateral is this treasury's own token. It cannot be independently valued at its redemption quote and simultaneously counted in L. If all loan repayments default, P can be marked zero without reducing already-held L; cash solvency survives only because P never backed immediate claims. It does not preserve the original book-value promise.

[NEAR storage guidance](https://docs.near.org/smart-contracts/security/storage) requires charging for state growth. Production K must cover serialized state, account records, loan NFTs, pending payouts, storage refunds and bounded emergency overhead. Rust in-memory BTreeMaps are serialized at receipt end: an immediate storage_usage delta around an insert does not measure their growth. The fixture reserves a conservative fixed allocation but is not storage-refund accounting. An ownerless contract also needs a credible key-removal and upgrade policy.

## 4. Loan rights and implementation evidence

Executable model test `carol_dave`: Carol deposits 1000 cash for 1000 token units, locks 100, borrows 50, settles its payout, transfers position to Dave, Carol's repayment is rejected, Dave repays 50 and receives 100 token units. Repeated repayment and liquidation are rejected after closure. Default tests enforce the exclusive expiry boundary. Operations clone-validate-commit to model NEAR receipt rollback on any arithmetic/error failure.

Prefer **locked** collateral for a minimal implementation: it avoids privileged reminting and makes rights explicit. Include it in supply; prevent the holder from redeeming locked units. This deliberately makes the liquid-backing decrease visible. Burn/remint may imitate REVLoans but needs contingent-supply bookkeeping and controlled mint authority; it cannot rescue the unconditional liquid guarantee.

The separate SDK fixture exposes nft_token, nft_transfer, nft_transfer_call and a private resolver, requires one yocto for transfers, and tests ownership conceptually through the model. It does not demonstrate an actual funded Carol-to-Dave loan in a NEAR runtime. Its native collateral fixture is different from the model's own-token collateral. No SDK runtime tests have been run. Keep this distinction in any demo. The [NEP-171 core](https://nomicon.io/Standards/Tokens/NonFungibleToken/Core) requires transfer-call resolution; a transfer-only record is insufficient compliance evidence.

## 5. Sputnik gate

[Sputnik proposals source](https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/src/proposals.rs) has FunctionCall {receiver_id, actions}; each action supplies method_name, base64 args, attached deposit and gas. Execution constructs actual cross-contract promises. Thus protocol-level attached-NEAR contribution is supported. The payable SDK fixture contribute method adds attached NEAR to its treasury counter and mints no tokens.

Prepared action payload is in `sputnik-proposal.json`; replace the receiver with a deployed contract. `{}` encodes to `e30=`. The DAO needs its own cash for the deposit and gas plus proposal bonds, and authorized council approvals under its actual policy. Proposal approval alone is insufficient: inspect terminal receipt outcomes and compare treasury and account balance before/after. Record proposal ID, deployment hash, proposal/approval transaction hashes, contribution receipt and view results. No hashes are supplied because no such execution happened. **Gate: NOT PASSED.**

## 6. Tests and coverage limits

Run `.\run-tests.ps1` from E:\near-2. Rust, Cargo cache, target and temporary directories are configured on E:. Dependencies are locked. Host tests can run offline from the existing cache. Raw WASM compilation requires near-sdk's `--cfg near`; it is not cargo-near deployment validation.

The randomized test uses deterministic xorshift64, seeds 1..10000 inclusive, 128 operations each: **1,280,000 operations**. Operations include deposits with nondilution enforcement, donations, redemptions, borrowing, NFT-owner changes, repayments, liquidation, successful/failed modeled settlement, storage/community reserve allocation and forward timestamp jumps. Each step checks cash, token supply and principal conservation; rejected operations must preserve all state. Explicit tests cover zero supply, atomic dust, maximum-u128 overflow, full redemption, maximum tax, overlapping payouts and repeated closure.

This is randomized state-machine property testing, not exhaustive verification or a shrinker. There are no failing invariant seeds in the passing run. The unconditional monotonicity claim is intentionally disproved by explicit tiny counterexamples, not asserted as a passing property. No automated minimality claim is made. Random generation uses modest amounts; near-maximum arithmetic cases are deterministic, not randomly distributed. Sender identities are restricted to two owners. Storage reserves are abstract amounts, not measured NEAR trie storage. No real asynchronous callbacks, gas failures, actual NFT receivers, schedule implementation, fee payout implementation or DAO contracts execute in these host tests. Therefore the requested end-to-end on-chain property-testing gate is **not passed**, even if all reference-model tests pass.

## 7. Smallest sound redesign and four-day scope

For an honest monotonic **liquid backing ratio** experiment, remove treasury-funded loans and all distributions from backing; fix a tax below maximum; reject any mint with d*S<L*m using net d after costs; charge storage separately; freeze issuance/tax rules; reserve every payout atomically. No mint permissions may bypass the admission check. Gifts increase backing. This proves B=L/S is nondecreasing for admitted transitions with S>0. It does not prove a positive minimum atomic quote or a USD floor. Add min_out and deadline checks to actual redemptions.

If loans are mandatory, abandon the monotonic immediate-floor promise explicitly. A lower-risk alternative is a separately funded external loan pool that cannot spend redemption reserves. Even then collateral rights, defaults and NFT callbacks require their own implementation and tests. Counting recoverable loans as cash is never the fix.

Four days before November 14, in Asia/Calcutta:

1. November 10: lock the economics and terminology; choose the no-loan variant or stop. Complete independent review of admission and reserve rules.
2. November 11: implement only native deposits, checked issuance, redemption min_out, persistent payout state and user-funded storage. Test real callbacks in sandbox. No community withdrawals or NFT loans.
3. November 12: deploy testnet, execute a real Sputnik proposal with attached NEAR; capture receipt evidence, overlapping payouts and storage failures. Stop if gates fail.
4. November 13: reproduce builds, review keys/upgrade policy and demo evidence. Add a minimal interface only after the economic and runtime gates pass. Submit by November 14; verify the organizer's exact deadline/timezone separately.

This reduced version has a clearer fit with Memecoins With Mechanics and potentially Social Money. NFTs That Do Something should be dropped from this MVP rather than adding unsafe lending to qualify. Track eligibility has not been independently verified.

Final recommendation: **NO-GO for the original Floorline proposal and financial guarantee.** Conditional research-only GO for the reduced model does not authorize presenting the current fixture as a finished product. Do not accept public funds until runtime, storage, NFT (if retained), Sputnik and independent security-review gates are satisfied.
