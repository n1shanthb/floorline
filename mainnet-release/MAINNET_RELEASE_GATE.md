# Mainnet release gate

## Decision

**NO-GO — MAINNET NOT READY.** No mainnet transaction was executed.

The approved bytes reproduce exactly and the existing economic/runtime evidence
is strong. Those positives do not clear the release because:

1. Callback loss can leave claims/refunds permanently InFlight with no safe
   recovery path (**High, unacceptable**).
2. No independent professional audit has reviewed the exact financial artifact.
3. Full-access custody/upgrade policy for a new mainnet account is unresolved.
4. There is no on-chain exposure cap, allowlist or pause.
5. Production monitoring, complete indexing, incident ownership and a real-money
   budget are absent; authorized exposure remains zero.
6. The supplied task document is truncated in section 7, so later requirements
   cannot be verified from the provided text.

## Evidence completed in this worktree

- Clean independent branch from `6ee055e4afde448d0b05bc557a1036825827a6c6`.
- Locked host tests: 16 gate tests + 1 runtime-reference test passed, including
  10,000 randomized economic sequences.
- Rust 1.99.1 isolated WASM build: 443,613 bytes; byte-for-byte equal to the
  approved artifact; SHA-256 is the required
  `529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`.
- Existing local sandbox evidence: 31 scenario groups, 234 measured calls and
  455 receipt outcomes, covering issuance/redemption/payout, lending/NFT
  settlement/default, transfer-call races, storage paths and deliberate callback
  exhaustion. No public-network signing was performed in this review.

## Required path to reconsideration

Design and independently review a recovery mechanism that cannot double-pay an
unknown transfer; pass fresh economic, host-property and real sandbox gates on a
new candidate; obtain an independent audit; approve key/upgrade custody; deploy
multi-source monitoring and an incident runbook; set a reviewed exposure cap;
then rerun this gate on the exact candidate bytes. Any contract change creates a
new candidate and invalidates the current approved-artifact clearance.

