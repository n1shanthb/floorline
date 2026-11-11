# FloorKit Phase 1 model parity

Status: **PASS for the explicitly compared fields; full storage/transport parity
is not claimed.** The approved Phase 0 source was not edited.

Native Rust economic port: 10,000 sequences of 64 operations, 640,000 total;
292295 accepted and 347705 rejected, plus 10,000 full-width quote cases.
All accepted/rejected outcomes and R/T/F/closed snapshots matched Python. Rust
also checked rejection atomicity and positive-supply cross products per step.
Trace SHA-256: `c25e64894f6255ed1c18d75d4fabae5e59c5a9c43cc7fe355a6d4d11e9823dc3`. Seeds 0–9999; no failing economic seed.

Actual compiled WASM: 64 randomized mint/redeem/contribution operations,
generator seed `0x464c4f4f`. Python Coin replay compared acceptance and before/after
R/T/F/C for every operation. Trace SHA-256: `9b5afccdfdca17dbb676388b35685aea07d5ce4b1fb8c0b7674b9fead938dbbe`.
Expiry is modeled with now=1 against deadlines 0/MAX; actual chain timestamps
advance naturally. This does not pretend those timestamps are identical.

H/K use abstract units in Python and measured serialized bytes in Rust. A/U/Q
depend on real protocol transport, gas rewards and prefunding. Claim IDs differ
when setup/storage transitions differ. We therefore do not label normalized
economic parity as byte-for-byte full state-machine parity. Actual claims/storage/
transport were separately exercised in receipts and reconciled, not fabricated
as model oracle events.

Exact invariant for positive before/after supply:
`R_after*T_before >= R_before*T_after`. Net-priced mint satisfies mR<=nT;
partial redemption satisfies qT<=Rc. Transfers/storage/creator/native settlement
leave R/T unchanged. Full exit pays R into one funded claim, sets R=T=0, and
closes permanently. This is accounting backing, not a market-price guarantee or
a promise that every fixed-size redemption quote rises.

U512 intermediates and checked narrowing implement one final curve division.
Actual WASM bootstrapped supply 10^38 with price=1 and seed=10^14 yoctoNEAR,
redeemed half for exactly 45,000,000,000,000 yoctoNEAR, and rejected an overflowing
mint quote. Native tests also cover U128::MAX full redemption and aggregate
overflow rejection. The stronger fixed-size quote claim remains disproved.

Reference model SHA-256: `6724091faaf0936b67cc457a5ff33a42933b903a120d9bc0d18ae26852a1b738`.
Executed normal WASM SHA-256: `a6f8f0c47f73a3eb7e5c85cc10b2a3b8773af4023ddf598d9d6fc15d91a19f13`.
