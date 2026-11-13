# Bounded acceptance evidence

This directory records the Nov 13 authorized public-testnet run. It stopped on
an unresolved withdrawal broadcast: eight final on-chain successes, one unlocated
broadcast attempt. Do not interpret read-only browser QA as wallet signing.

**Do not clear the journal or rerun `execute.mjs --execute`.** An active loan and
Available borrower claim remain. Resolve the existing hash first, then prepare
a state-aware continuation. No automatic retry, scheduled repayment or default
exists. Loan #15 expires **2026-11-14 04:04:11.656 UTC / 09:34:11.656 IST**.

- `execute.mjs`: narrowly bounded acceptance runner. Existing SDK signer only;
  no key generation/export, account creation, deploy, policy change or mainnet.
  Captures hashes before a single broadcast and checks final receipts/state.
- `capture-stop.mjs`: public RPC-only stop snapshot; never signs. The saved
  snapshot is the authoritative state *at stop*, not evidence of completion.
- `reconcile.mjs`: offline independent intention/receipt/accounting/budget checks.
- `browser-qa.mjs`: local production-build tests, real RPC, unauthenticated clean
  desktop/mobile contexts. No fake wallet, mock chain or CLI journal injection.
- `write-reports.mjs`: renders actual stopped-run reports from recorded evidence.
- `PREVIOUS_ACCEPTANCE_RESULTS.md`: exact historical prior unsigned review.
- `PROTECTED_BASELINE.json`, `ARTIFACT_BASELINE.json`: immutable-file baselines.
- `hash-recovery-*.json`: actual independent UNKNOWN_TRANSACTION responses;
  these are not final execution receipts or definitive nonexecution proofs.
- `FRONTEND_CHECKS.json`, task logs, `BROWSER_QA.json`, screenshots: current QA.

Offline reconciliation:

```powershell
node acceptance-execution/reconcile.mjs
node acceptance-execution/write-reports.mjs
```

Dependencies were reused from existing E-drive installs. No downloads/key
material were added. All new outputs, temporary browser files and build caches
were directed to E:. Original contract, FloorKit and historical evidence files
are unchanged. No public frontend or contract deployment occurred.

RPC recovery sources were checked against the
[NEAR provider directory](https://docs.near.org/api/rpc/providers) and
[FastNear RPC documentation](https://docs.fastnear.com/rpc). Alternative endpoints
were used only for public read-only recovery; the unresolved transaction was
never rebroadcast to another provider. No faucet calls or rate-limit evasion.

The first local preview attempt on port 4176 was unreachable; a fresh local-only
preview on port 4181 enabled read-only automated QA. The tool-observed initial
connection failure is summarized in `BROWSER_QA_INITIAL_CONNECTION_FAILURE.json`;
it is not presented as an unmodified raw test-run log.

The operator-controlled simulated council does not demonstrate independent human
control. No new DAO action was submitted in this stopped run. Historical DAO
proposal #0 remains historical.
