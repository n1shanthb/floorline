# FloorKit Phase 1 deployment gate

**BLOCKED / NO-GO for public-testnet deployment. No deployment authorization is
being exercised. Stop new feature work and resolve the security/design gate.**

- Implementation: isolated Rust/near-sdk persistent contract, normal WASM,
  separate receiver and callback-loss artifacts, reproducible E-drive scripts.
- Rust: eight tests PASS; 10,000 economic sequences / 640,000 operations plus
  10,000 wide quote cases PASS against unchanged Python.
- Real WASM: 26 primary scenarios plus two supplemental scenarios PASS
  as tests of their stated outcomes. The reproduced denial is not an availability
  pass. 64 randomized WASM economic operations match Python R/T/F/C.
- Executed backing/solvency: PASS within recorded cases and stated environment.
  Full-exit closure, callback loss, real native failure, pending FT closure,
  creator segregation and failed-restoration cushion were exercised.
- Callbacks: no unfunded claim/double payment observed; unknown outcomes fail
  closed. **Availability FAILS after the reproduced pooled callback-loss case.**
- Storage/gas: measured byte costs and receipt gas passed recorded cases;
  40/150-Tgas calls and 30-Tgas callbacks worked, with bounded row growth and
  equal first/last gas over the 48 added historical claims. Not an exhaustive bound.
- Immutability: **NOT ESTABLISHED**. Local disposable full-access keys retained;
  SDK generic privileged imports remain. Source found no upgrade/admin dispatch,
  but a complete independent bytecode reachability proof is not claimed.
- Integrity: all 215 preexisting protected files and 22 Phase 0 files unchanged.
  Existing Floorline contracts, DAO, frontend, evidence and credentials untouched.

Normal artifact SHA-256: `a6f8f0c47f73a3eb7e5c85cc10b2a3b8773af4023ddf598d9d6fc15d91a19f13`.
Derived and locally verified NEAR code hash: `CEnqqiPTY2Fyj3k6jVLw4jDGZzEPazZTQNabfgXJk474`.
Compiler Rust 1.99.1; near-sdk 5.30.1; borsh 1.8.1; uint 0.9.5. Lockfiles and
ARTIFACT_AUDIT.json record build/source versions and all three artifact hashes.

The operational refund pool can permanently prevent unrelated empty users from
unregistering after eight unknown outcomes. Solvency holds, but promising normal
storage-refund availability would be misleading. The result was induced using
fault callback gas, not demonstrated as a normal-artifact attacker exploit.
Changing recovery semantics requires an explicitly reviewed design update and
new Phase 0/runtime evidence; timeout repayment or silently enlarging the pool
does not establish safety and liveness. Existing approved research remains frozen.

Remaining verification limits include arbitrary protocol callback/debit/refund
permutations, true duplicate/stale delivery, full native/storage/transport oracle
parity, exhaustive maximum-state gas and independent action-reachability review.
No fabricated receipts or public-testnet evidence are supplied.

Do not build a factory, frontend or public deployment around this artifact.
Keep the existing Floorline submission viable. If the revised design and actual
runtime gate are not green at least 24 hours before the supplied November 14
cutoff, drop FloorKit from this hackathon rather than ship a financial promise
whose availability limitations are unresolved. Further public deployment remains
separately authorized even if a later gate passes.
