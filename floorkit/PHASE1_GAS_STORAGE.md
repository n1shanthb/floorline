# FloorKit Phase 1 gas and storage

Status: **PASS for measured cases; not an exhaustive protocol-cost guarantee.**
`contract/evidence/GAS_STORAGE.json` contains exact integer gas, prepaid budgets,
receipt IDs, storage deltas and history profiles. Raw outcomes are retained.

At 10^19 yoctoNEAR/byte, maximum serialized-row probes prepaid:

- User base plus one fixed refund slot: 4090000000000000000000 yoctoNEAR (409 bytes).
- Ordinary native claim: 2280000000000000000000 yoctoNEAR (228 bytes).
- Pending FT call: 2170000000000000000000 yoctoNEAR (217 bytes).

Actual accepted redemption row growth included [148, 150, 228] bytes;
228 occurred for the maximum-length owner/payer. Paid rows remain allocated until
cleanup. Unregister refunds the prepaid base; pooled replacement storage is
protected by separately funded O. Callback fields and pool slots are fixed width.
Every measured accounting snapshot covered actual storage stake with K+O.

Normal WASM size: 384646 bytes. The test separately declared 5 NEAR O;
initialization rejected an earlier 3-NEAR test setup that could not cover code,
state and pool headroom. Excess prefunding was never inferred as backing.

Normal callbacks receive 30 Tgas; FT receiver receives 50 Tgas, both zero unused
gas weight. Promise paths enforce 150 Tgas upfront. Normal FT cases ran at 150
Tgas, including receiver exhaustion and oversized data; a maximum-name redemption
ran at 40 Tgas and its native payout at 150 Tgas. Bounded result decoding avoids
copying an unbounded receiver return into callback memory. Native unexpected
result size leaves the attempt unresolved rather than labeling it a failed send.

The deliberately separate fault artifact allocates only 0.001 Tgas and produced
actual callback failure. It is never a deployable recommendation. A successful
normal callback sample does not prove the exact minimum necessary callback gas.

The 48 added historical redemptions reached 70 allocated claims.
First/last total receipt gas was 2663954570941 / 2663954570941, equal in
this run. Source writes touch bounded rows; the only pool walk is capped at eight.
This is measured history behavior, not an empirical test of every possible
history size, maximum metadata/string combination or future protocol revision.

Native/FT payouts use separately funded buckets; caller gas is not debited from R.
The test assumes the admitted storage/gas regime and excludes an adversarial
retained full-access spender. Local test keys were retained, so production
immutability cannot be inferred from these measurements.
