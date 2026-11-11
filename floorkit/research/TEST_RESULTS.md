# Recorded Phase 0 validation

**Passed, pure model only. No runtime or public transaction result is claimed.**

- 19 unittest boundary/adversarial tests, detailed in `UNIT_TEST_RESULTS.txt`.
- 10,000 distinct deterministic sequences, seeds 0–9999, each with four setup calls and 96 randomized operations: 1,000,000 total operations.
- 192 distinct sampled immutable parameter configurations.
- Checked state invariants and exact positive-supply cross-product monotonicity after every accepted transition; full-state rollback equality after every expected rejection.
- Every modeled operation had successful randomized coverage. Coverage totals and expected precondition rejections are in `TEST_RESULTS.json`.
- Trace digest: `48a8ed95f04ce27104273a3f9bdbf31edfc695a8da1f7c18542381daee7edfdd`.
- Run duration: 280.593 seconds on Python 3.11.9. Timing is informational and not a gas/performance claim for NEAR.
- Failing seeds: none. No admitted-model counterexample was observed; no fabricated minimal failing trace is supplied.
- Seed 42 repeated-replay digest: `9bed8c85c036dd009c948e6098296abc86a4a44132cbb681421e990146767e56`.
- 10,000 separate U128/full-width `Fraction` oracle cases passed; 2,139 oversized/dust mint quotes rejected as independently expected. Pure two-instance reserve/closure isolation passed. No second real coin was deployed.
- All 215 protected preexisting file hashes remained unchanged. The ignored approved Floorline Wasm was included in that check. Original evidence, source, frontend, contracts and DAO access material were not edited or used for signing.

The unit suite covers bootstrap/parameter bounds, fee-before-mint pricing, creator entitlement isolation, partial/full redemption, irreversible closure, dust/slippage, time ordering, contributions/transfers, storage/refund pools, native success/failure/refund/callback-loss, overlapping requests, late old refunds, stale/private callbacks, storage exhaustion/cleanup, FT forwarding/redemption before resolver, near-U128 products, U64 counter exhaustion and immediate round-trip no-profit.

`REJECTED_DESIGNS.json` separately records mathematical counterexamples to discarded gross-priced fee extraction, taxed-residue restart, and the stronger claim that a fixed-size redemption quote must rise with B. Those are not failures of the admitted invariant and are not testnet events.

Reproduce using `run-tests.ps1` or commands in `README.md`. A first invariant failure stops generation, preserves the exact initial configuration/seed/trace, runs deletion-based trace minimization and returns nonzero. Randomized evidence is not exhaustive formal verification. The future Rust/runtime, measured storage, actual async refunds, all standards wrapper cases, gas and immutability gates remain unverified.
