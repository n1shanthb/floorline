# FloorKit Phase 0 research

This directory is isolated research. It contains no near-sdk contract, frontend, RPC client, account signer or deployment command. All actors in the model are symbolic. Nothing here is public-testnet transaction evidence.

Start with [GO_NO_GO.md](GO_NO_GO.md), [ECONOMIC_SPEC.md](ECONOMIC_SPEC.md), [INVARIANTS.md](INVARIANTS.md), [THREAT_MODEL.md](THREAT_MODEL.md), [CONTRACT_ARCHITECTURE.md](CONTRACT_ARCHITECTURE.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

Run the complete economic gate from `E:\near-2`:

```powershell
.\floorkit\research\run-tests.ps1
```

Python 3.11+ standard library only; no installation. The wrapper runs discarded-design examples, 19 adversarial/boundary tests and 10,000 distinct SplitMix64 sequences. Every sequence has 96 random operations plus four registered-actor setup calls. It sets TEMP/TMP on E: and disables bytecode caches. On this machine the million-operation run took about five minutes; progress appears every 1,000 sequences.

The wrapper also runs `verify_extras.py`: 10,000 independently factorized `Fraction` oracle cases and a two-instance reserve/closure isolation check. `EXTRA_CHECKS.json` records those results. `REPLAY_CHECK.json` records an identical seed-42 digest across two actual replay executions.

Cross-platform equivalent for the reference suite, from this directory:

```text
python -B rejected_designs.py
python -B verify_extras.py
python -B run_tests.py --sequences 10000 --steps 96
python -B run_tests.py --seed 42 --steps 96
```

`TEST_RESULTS.json` records the complete run. Seed replays write a separate `REPLAY_SEED_<seed>.json`, not a new public transaction or replacement for full-run evidence. The explicit PRNG and source hashes make traces reproducible. `UNIT_TEST_RESULTS.txt` records the unit assertions. Every expected rejection is checked for full atomic rollback. Every accepted transition asserts cash, storage, supply, bounds, closure and positive-supply backing monotonicity.

On the first invariant failure, randomized generation stops. The runner saves `FAILING_SEED.json` and a deletion-1-minimal `MINIMAL_COUNTEREXAMPLE.json`, then exits nonzero. It does not silently change the invariant. No such failure was observed in the recorded run. Deletion-1-minimal is not a claim of globally minimal amounts/configuration. An unexpected Python error also stops the run; it cannot produce a new pass.

`REPOSITORY_SAFETY.json` records the existing approved deployment identifiers/Wasm and hashes 215 protected preexisting files. Research tests verify those files before/after a run. No credential paths are read. `HOSTING_STATUS.json` records only read-only GitHub metadata. All new work stays here; the existing contracts, DAO, evidence, frontend and Git history are unchanged by this research phase.

The model's small storage units are abstract, and its `env_send`/`env_refund` helpers are trusted simulator events, not proposed public methods. Public contract types/authentication, actual storage bytes and callback timing must pass a future runtime gate. In particular, the reference's internal registered-case storage methods do not themselves certify every NEP-145 wrapper return case.
