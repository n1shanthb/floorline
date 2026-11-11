# FloorKit implementation plan and repository safety

This is a plan for a **separately authorized** future phase, not a contract build or deployment instruction to execute now. All work in this phase is under `E:\near-2\floorkit\research`.

## Protected existing product

Baseline Git commit: `b4d9d7dcd101a85bfe6b4b4b37309ef451d4705a`. `REPOSITORY_SAFETY.json` hashes all 215 preexisting tracked files plus the approved ignored Wasm where applicable. The test runner verifies these before/after the randomized suite. A final unchanged-file audit is required before delivery. No credentials are read, including while constructing the manifest.

Approved existing artifact: `runtime/artifacts/floorline.wasm`, SHA-256 `529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`. Existing Floorline account: `floor.floorline-g3-20261111-6702ea.testnet`; existing code hash: `6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9`. Existing DAO: `floorline-g3-20261111-6702ea.sputnikv2.testnet`.

Leave untouched: `src/`, `Cargo.toml`, `Cargo.lock`, `fixtures/`, `tests/`, `runtime/` including both normal/fault artifacts and evidence, `testnet/`, `TESTNET_EVIDENCE.json`, all Gate 1/2/3 documents, `frontend/`, design pack/archive, existing root tooling/config/docs and Git history. Never read/change `.testnet-credentials/`, `.sandbox/` signer material, wallet sessions or deployment keys. Existing ignored caches/targets are not a place to put FloorKit source. Do not recompile/redeploy Floorline or modify its DAO.

New research files: six required specs/decision documents, model/tests, deterministic runner, source/result/seed evidence and safety/hosting records. Python stdlib only; no dependency download. There is no Phase 0 frontend, near-sdk contract, funded account, factory, signer or on-chain result.

## Proposed future stages and effort

1. **Pure core port, 6–8 engineering hours:** a new isolated Rust package, immutable config, bounded input/metadata, U512 math and exact oracle matching. No state migration, loans, factory, reserve sweep or UI. Verify after-fee pricing/full-exit closure/counter exhaustion before state adapter work.
2. **Persistent token/storage/claims, 8–12 hours:** bounded maps/counters, measured prepaid storage, FT methods/events, restricted NEP-145 force profile, native state machine and code/state funding. Standard interface return/null cases require explicit adapter tests; the reference is not a generated ABI.
3. **Real runtime adversarial gate, 10–14 hours:** actual receipts and balances for failure/refund/callback-loss/overlap; receiver forwarding/redemption before resolution; full closure with outstanding claims; saturated refund pool and cleanup; serialized maximum storage and history/gas profiles. If refund-pool exhaustion produces an unacceptable public availability failure, redesign that part before release rather than increasing a constant and declaring the risk solved.
4. **Review and one-instance controlled testnet demonstration, 5–8 hours:** only after user authorization and newly configured funding/signing. Verify source/Wasm/hash/init/balances/metadata/access policy, actual buy/redemption payout/creator-credit segregation/closure receipts. Account IDs and budget remain unassigned in Phase 0. No faucet budget or signer availability is presumed; no credential reuse is authorized here.
5. **Submission packaging, 3–6 hours:** accurate manual-template product wording, public proof links and current known limits. Do not redesign the existing frontend. Hosting/repository publication for existing Floorline is a separate authorized task.

Total estimate: **32–48 focused engineering hours** for one controlled testnet reference coin, excluding unexpected runtime faults, funding delay or independent review scheduling. Add approximately 2–4 hours plus funding for a second manual instance if the first is already green. A permissionless factory requires a separate multi-day project; no credible fixed estimate fits the remaining window.

Today is November 11; target deadline is November 14, 2026 as supplied by the user. No precise cutoff/timezone was independently reconfirmed. One instance is plausible with dedicated effort, early funding and no unresolved runtime gate failure; it is not a reliable promise alongside other unfinished submission work. Choose a hard cutoff at least 24 hours before the actual submission deadline: if the single-instance runtime suite is not green by then, drop FloorKit from the submission and finish the existing product. Do not rush a financial contract or call the model deployed.

## Decision gates

The pure mathematical gate passes only if the exact assertions and all 10,000 sequences pass. No claiming proof of runtime timing from model flags. The next gate requires the actual model→runtime balance/refund correspondence, bounded storage, gas, public return shapes and a complete privilege/upgrade review. The deployment gate requires separate authorization, testnet-only funds and an explicit access policy. A factory or shared treasury is not an implicit extension.

Do not weaken B to a convenient denominator or treat old assets as a new minter's bootstrap. If a required invariant fails, preserve seed/trace, stop and report. If runtime tests fail, fix the implementation/design and re-prove/re-run; the deadline never licenses hiding a failing financial guarantee. In Phase 0 there are no native transactions to fabricate or interpret as passing.

## Existing frontend hosting and public submission

`HOSTING_STATUS.json` records read-only repository checks. The remote repository is currently **private**; GitHub Pages returned HTTP 404; the repository has zero GitHub deployment records and zero Actions runs. The previous frontend artifacts establish a working local Vite app and production build, not a verified public URL. This does not rule out an unknown third-party deployment, but none is evidenced in this repository or this session.

Therefore the repository is **not yet ready as a public submission**. Remaining work outside this phase: authorize and verify an HTTPS frontend host with SPA rewrites; decide whether to make this repository public or provide judges access; rerun public-bundle/credential/dependency checks; ensure receipt URLs and all demo limitations are visible; test a fresh browser on the hosted URL. Existing frontend audit still reports ten low-severity transitive SDK findings and documented build warnings. Do not call it audited, immutable or independently governed. No publication/deployment is performed by this plan.
