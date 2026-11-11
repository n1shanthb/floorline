# Floorline — local Gate 2

Current implementation: a NEAR Rust adapter for the externally funded economic engine, with persistent token/loan/claim records and real local sandbox receipts. **Not publicly deployed, audited, ownerless or production-approved.** Treasury-funded lending remains rejected.

Start with [GATE2_RESULTS.md](GATE2_RESULTS.md), [RUNTIME_ACCOUNTING.md](RUNTIME_ACCOUNTING.md), [STANDARDS_COMPLIANCE.md](STANDARDS_COMPLIANCE.md) and [TESTNET_DEPLOY_PLAN.md](TESTNET_DEPLOY_PLAN.md). The earlier Gate 1 documents preserve the reference mathematics and historical API; they are not the current runtime compliance checklist.

Run `.\run-tests.ps1` for host/reference checks. For runtime tests, start the existing E:-backed Ubuntu sandbox in a separate terminal with `wsl -d Ubuntu -- sh /mnt/e/near-2/runtime/start-sandbox.sh`, then run `.\runtime\run.ps1`. The official sandbox binary must already be extracted under `.sandbox/bin` and npm dependencies installed under `runtime/node_modules` using an E: cache. This task used near-sandbox 2.14.0 and near-api-js 5.1.1, not public testnet. All test keys/data live under E:; keep `.sandbox` private and ignored. The harness refuses a non-local RPC or non-sandbox chain.

`runtime/artifacts/floorline.wasm` is the normal artifact. **Never deploy floorline-fault.wasm**, whose deliberately insufficient callback gas exists only for local failure tests. The receiver fixture is open test orchestration code, not a production contract. See the evidence summary for artifact/source hashes.

SALVAGE_DECISION.md is the accepted architecture baseline. KILL_TEST.md and TEST_RESULTS.md describe the rejected earlier model and are historical evidence only. Their old test counts do not validate this redesign. The old sputnik-proposal.json is an unexecuted payload template, not transaction evidence or a verified DAO deployment.
