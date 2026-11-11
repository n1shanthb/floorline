# FloorKit Phase 1 security review

Verdict: **BLOCKED for public deployment; no backing/solvency counterexample
observed in the executed admitted scenarios.** This is an implementation review,
not an independent audit or formal verification.

The funded partition is P=R+C+F+H+K+O. Executed checks require A>=P and actual
storage stake<=K+O. I represents unresolved sends and is outside P; always
requiring A>=P+I would double-count debited payouts. Known-failure restoration
alone requires A>=P+I. It converts one funded failed entitlement back to C and
never touches R. Unknown attempts cannot be retried, timed out or swept.

Private callbacks consume actual bounded PromiseResult data and matching IDs/
nonces, not caller-supplied success flags. Payment is recognized only on a real
successful callback. Failure does not optimistically credit C. Redemption and
creator conversion each replace their original bucket exactly once. FT resolver
refund is capped by available receiver tokens and cannot burn a missing sender;
participant references prevent unregister until settlement. Source review found
no setters, reserve/O/U sweep, arbitrary burn, loan, factory, migration or owner
dispatch method.

Release blocker: the fault test lost eight pooled-refund callbacks. The pool
remained occupied permanently; an unrelated newly registered empty user could
not unregister. The ninth refund and unrelated unregister rejected atomically,
so reserve and liabilities remained funded. The model has no safe recovery for
unknown outcomes: the original transfers may already have paid. Recycling these
slots or timeout repayment would weaken safety. A larger pool postpones the
limit without resolving it. This is an unacceptable unresolved global availability
failure for a publicly offered reference coin; do not hide it behind solvency.

Important boundary: callback loss was induced with a separately compiled
0.001-Tgas artifact. Normal 30-Tgas callbacks passed measured cases. We did NOT
prove that an ordinary attacker can force those losses on the normal artifact.
We also did not prove they can never occur. Known-failure retry can remain blocked
by another paid-but-unacknowledged attempt even after its own refund returns;
actual receipts reproduced this conservative liveness tradeoff.

Upgrade/key review: local accounts retain disposable full-access keys. A local
fault fixture was explicitly redeployed to normal callback gas while preserving
an old unknown attempt; this is test preparation, not an admitted economic
operation or immutability demonstration. No existing Floorline/DAO keys were read,
changed or deleted. No public keys were deleted for lock-down.

The generated normal WASM retains SDK generic Promise imports for deploy, keys,
delete-account and globals. An initial import-absence assertion FAILED and is
recorded in ARTIFACT_AUDIT.json. Inspection of near-sdk 5.30.1 promise.rs shows
generic action dispatch retains these branches. FloorKit source constructs only
transfer and bounded function-call actions with fixed method names; no JSON
action dispatcher or privileged exported method was found. Import presence is
not itself an exploit, and import/export listing is not a complete bytecode
reachability proof. Do not claim that such a proof passed.

Future lock-down would require a separately authorized regular local-code
deployment+atomic initialization, exact artifact/code-reference match, complete
reachable action review, verified zero-key evidence after separately authorized
lock-down, and checks excluding mutable global aliases. Zero keys alone is not
sufficient. Current actual immutability: **NO**.

Other limits: ordering/slippage and dust; size-dependent tax/full-exit exemption;
permanent terminal closure; gas rewards/direct cash trapped as unallocated;
no market floor, callback-delivery guarantee or future-protocol guarantee;
uint macro compiler warnings; incomplete exhaustive runtime ordering coverage.
Do not modify the approved Phase 0 model to conceal these findings.
