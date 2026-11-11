# FloorKit Phase 0 decision

**Executive verdict: BUILD — one manually deployed, separately gated testnet reference coin only. NO-GO for a permissionless factory before November 14.** This is a recommendation for a possible next phase, not authorization to deploy, sign, modify Floorline or start a frontend.

## What passed

Reasoned inductive proofs: after-fee/marked-up mint cannot reduce R/T; admitted partial redemptions cannot reduce it; explicit donations increase it; ownership/storage/creator/native-claim operations leave it unchanged. Full exit returns all R and irreversibly closes the lifetime. T equals holder balances. Creator fees and every replacement claim are funded exactly once. The local cash/queued-send partition proves immediate liabilities remain covered across overlapping sends; the known-failure P+I gate prevents queued cash masking a missing refund. Storage allocation is segregated; bounded-width arithmetic fits U512 before checked U128 narrowing.

Tested: **19 boundary/adversarial tests plus 10,000 reproducible sequences**, seeds 0–9999, 96 randomized steps plus four setup operations per sequence: **1,000,000 operations**. All 192 sampled price/markup/tax/fee combinations occurred. Every modeled transition had successful randomized executions, including known-failure restoration, native callbacks/refunds and FT resolution. `TEST_RESULTS.json` contains accepted/rejected coverage, source hashes and trace digest. No admitted-model invariant failed, so there is no failing seed or minimal failing trace to report. Rejected-design examples are separate and must not be confused with model failures.

The measured run is a deterministic pure Python model, not exhaustive formal verification, Rust execution, a byte/storage/gas measurement, or a public receipt. No new account/contract/signature/transaction is claimed.

Additional independent checks passed: 10,000 full-width rational `Fraction` oracle cases, including expected zero/overflow quote rejections, and mutation/closure isolation between two independent model instances. Seed 42 was replayed twice with an identical trace digest. These artifacts are `EXTRA_CHECKS.json` and `REPLAY_CHECK.json`; they do not replace the full 10,000-sequence result or prove two deployed contracts.

## Product meaning and unresolved issues

There is no remaining counterexample to the admitted **accounting B** invariant in the stated transition system. Two stronger claims are explicitly rejected: gross-priced minting with fee extraction can dilute; nondecreasing B does not ensure a fixed-size redemption quote rises. Flat-tax residue plus reopening lets a newcomer capture prior reserves. These are derived counterexamples, not hidden changes to the chosen guarantee.

Permanent closure, size-dependent tax with full-exit exemption, no forced burning of live rights, fixed fee beneficiary, no reserve/operational sweeps and immutable bounded economics are part of the design. If the desired product changes any of them, this pass cannot simply be reused.

Unresolved runtime/security gates: real NEAR debit/refund/callback correspondence; measured prepaid bytes and fixed callback allocations; gas on maximum/history states; exact NEP-141/145 return/false/force behavior; checked Rust port; actual code/key/global-reference immutability. There is no unsafe assumption that pure model success proves these. Unknown callbacks may strand paid/unpaid bookkeeping indefinitely. The operations-funded refund pool is bounded but can be saturated, including by failed recipients; it protects solvency, **not public availability**. Its denial-of-service behavior must be evaluated in the runtime gate. Increasing the pool size is not a proof that the issue is solved.

Other conditional assumptions: no adversarial full-access spender or hidden self-upgrade/action executor; user-funded execution gas; adequate separate code/storage/operations cash; no unmodeled reclassification of unexplained balance; protocol behavior remains within the admitted funding/storage regime. Zero access keys alone does not establish these conditions. No unconditional liquidity, price/yield, independent-community or production-security guarantee is approved.

## Feasibility

One isolated manual coin is the smallest credible demo of the new mechanics; two manual accounts would strengthen isolation evidence but are optional after the first passes. A factory adds deployment/refund/versioning/key and spam risks with no need for the core demonstration.

Estimate **32–48 focused engineering hours** for the one-instance core, persistent adapter, real runtime tests, review, controlled testnet evidence and packaging. With roughly three calendar days until the user-supplied November 14 deadline, that is **plausible but tight and conditional**, not an assurance. Fresh testnet funding/signing authorization is not supplied for FloorKit. Runtime failures or unavailable funding invalidate the optimistic schedule. Do not replace the existing proven product with an unfinished launchpad.

Release cutoff: if the real single-instance runtime gate is not green at least 24 hours before the actual hackathon cutoff, **STOP FloorKit for this hackathon**. Abandon the new module's submission claims rather than ship an unsafe guarantee. Do not weaken the existing Floorline NFT/DAO tracks to create time for a factory.

## Existing submission readiness

Floorline frontend remains evidenced as a **local app/production build**, not a verified public deployment. Repository visibility is **private**; Pages API returned 404 and repository deployment/Actions counts were zero when checked. No external frontend URL was verified. A 404 does not prove that unrelated hosting cannot exist; it is not public-hosting proof.

**Public submission readiness: NO-GO until public hosting/judge access, fresh-browser QA and accurate disclosure are completed under separate authorization.** Existing testnet receipts remain valid, but neither private source nor localhost is a public product URL. No publishing/deploying or access-key operation was done in Phase 0. Existing simulated-council governance must retain that label.
