# Existing FLOOR mainnet assessment

**MAINNET NOT READY. No mainnet transaction or deployment was performed.**
Assessment applies to the existing approved FLOOR artifact, not FloorKit.

## Evidence and access policy

Approved normal WASM SHA-256:
`529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`.
Testnet code hash: `6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9`.
An isolated offline build with Rust 1.99.1, pinned Cargo.lock, `--cfg near`,
release WASM and feature `contract` reproduced those bytes. It used a NEW target
directory; approved source, lockfile and artifact were not changed. See
`product-review/REPRODUCIBLE_BUILD.json` and `rebuild-approved.ps1`.

Fresh public key listings show **one full-access key on FLOOR**. Its holder can
spend native funds, replace logic and manage keys. Therefore economic protection
is conditional on that authority not acting adversarially; calling the deployment
ownerless or immutable would be false. The DAO has zero access keys, which does
not independently exclude contract-programmed upgrade/privileged paths.
[NEAR access-key authority](https://docs.near.org/protocol/accounts-contracts/access-keys).

Source review found no exported Floorline economics setter, generic action
executor, pause or self-upgrade entrypoint. This is not a complete independent
reachable-bytecode audit. SDK Promise dispatch may retain privileged imports;
absence of an obvious export, or zero keys, is insufficient proof. Decide and
independently review key custody/global-code/reference/upgrade policy before any
mainnet lock-down. No keys were deleted here. Code replacement can preserve state,
and contracts can implement self-upgrade paths, as documented in
[NEAR upgrade guidance](https://docs.near.org/smart-contracts/release/upgrade).

## Required independent financial/security review

Review the exact artifact/source/build mapping, U512 arithmetic, all U128/U64
boundaries and bucket aggregates; issuance nondilution at positive supply;
full exit and zero-supply restart semantics; FT available versus locked custody;
NFT forwarding/resolution, current-owner repayment and expiry equality;
creator/lender/borrower/storage identities; funded replacement claims; actual
native debit/refund ordering; nonce/private-result safety; and callback loss.
FLOOR permits bootstrap again at zero supply; do not import FloorKit's permanent
closure guarantee into this protocol or claim a ratio exists through T=0.

Source preserves failed/unknown claims conservatively; unknown outcomes may
permanently strand rights. Known failure retry requires actual balance>=required
+inflight. Current browser tests do not constitute exhaustive protocol-order or
large-state adversarial review. Independent review and remediation sign-off are
**missing release requirements**, not an audit certification supplied here.

Current finalized native balance covers `local_required`; storage stake is
covered by reported storage/operations buckets. Loans use externally escrowed
principal; treasury backing is never lending capital. Total FT supply includes
locked collateral once, not an invented circulating denominator. Reconcile all
available claims, unresolved I, free/allocated user storage and operational
refund liabilities separately. Inflight cannot automatically be added as another
fully local liability after debit, nor treated as liquid backing.

The aggregate frontend check `storage_total+operational>=storage_stake` is an
observed coverage check, not a full independently audited allocated/free storage
proof. Inspect serialization maximums, all payer allocations and actual staking
after user withdrawals. Floorline's `send_refund` has finite prepaid operational
headroom; it is **not FloorKit's eight-slot pool**. Stress its own refund/cleanup
and callback-loss behavior independently; do not transfer one contract's result
to the other. Storage encumbers cash; network pricing/configuration must be
queried afresh. [NEAR storage staking](https://docs.near.org/protocol/storage/storage-staking).

## Gas, funding and exposure

Existing sandbox/testnet measurements and current frontend budgets establish
useful evidence, not a worst-case mainnet certificate. Review every receipt chain,
maximum messages/account lengths, failed receivers, payout overlaps and history
scaling. Frontend simple methods use 30 Tgas, native/storage payout paths 110
Tgas, Sputnik governance 250 Tgas. Contract callbacks use reserved gas; originating
wallet gas reservation is not an operational reserve and must never consume L.

Separately prefund code/state storage, operations/refund headroom and bootstrap
cash. Never infer backing from unexplained account balance or a testnet faucet
amount. **Authorized real-money exposure limit is currently zero.** Define a
future reviewed total/per-transaction exposure budget, monitoring owner and stop
conditions before requesting launch authorization. Current payable methods are
publicly callable; there is no on-chain allowlist or deposit cap. An unadvertised
deployment or frontend limit is not a technical restriction on third parties.

## Deployment and network separation: future procedure, not executed

1. Freeze the exact reviewed source/dependency/toolchain/artifact manifest and
   independent findings; rebuild in isolation and compare full hash. Keep the
   normal and fault artifacts unmistakably separate.
2. Obtain separate mainnet authorization, funding and explicit key/upgrade policy.
   Select a NEW verified account. Testnet IDs, balances, roles, receipts and DAO
   policy do not migrate automatically and are not mainnet evidence.
3. Prefund real code/storage/operations cash; deploy exact regular local WASM and
   initialize atomically using the actual nonpayable
   `new({tax_bps:2000,issuance_numerator:"1",issuance_denominator:"1"})` ABI
   if those parameters are independently approved. Initialization starts L=T=0;
   it does not mint a bootstrap supply or classify prefunding as backing. Register
   the initial holder with separately attached storage credit, then perform a
   separately approved initial `issue` deposit. Do not leave initialization open
   to capture or confuse FloorKit's different bootstrap API with FLOOR's.
4. Independently verify native account/code reference, view_code/hash, initialization,
   metadata, parameters, storage and buckets. Apply any separately authorized
   key policy only after checking reachable self-action/global-alias risks.
5. Prepare a separately reviewed mainnet frontend configuration with new fixed
   contract/DAO IDs, expected hashes, wallet URLs, helper/RPC/explorer endpoints
   and explicit network checks. Current frontend is intentionally testnet-only;
   changing only VITE_RPC_URL to mainnet must fail. Do not disable those checks.
6. Run independently witnessed tiny real-money acceptance within an explicitly
   approved exposure cap, recording all receipts and post-state. Verify a deployed
   HTTPS SPA, fresh devices, rejection/recovery behavior and code provenance.
7. Release only after reconciliation/monitoring and incident-response gates pass.

[Deployment and atomic initialization guidance](https://docs.near.org/smart-contracts/release/deploy).
No deployment script was run against mainnet and no mainnet account is selected.

## Operations and recovery limits

Build/run monitoring for code/access-key/global-reference changes, RPC disagreement,
native balance versus liabilities, storage stake/headroom, unexpected L/T changes,
queued/known-failed/unknown payouts, loan expiry and pending NFT transfers. Use
independent RPC sources, an event/receipt index and an alert owner. Current public
read-only audit is one-shot, not a deployed monitor or complete asset index.

Incident runbook must preserve raw hashes/state, suspend frontend action entry
and notify users without pretending that UI shutdown pauses the contract. There
is no existing pause/escrow recovery/admin refund facility to invent. Never
timeout-repay an unknown successful send. Replacing code using a retained key is
an authority/trust decision, not an audited emergency bypass. Resolve recovery
and governance-key risks before accepting real funds.

The fresh npm registry query recorded 10 low and zero moderate/high/critical
advisories; no dependencies were changed. Those transitive advisories and
production bundle warnings still need independent security/CSP review. Automated
advisory counts are not an independent dependency audit or physical-device
certification.

## FloorKit boundary

FloorKit remains **BLOCKED**, with no integration or edits. Its callback-loss
availability redesign must pass independent economic and actual runtime gates.
It cannot be deployed to bypass existing FLOOR's mainnet release requirements.
