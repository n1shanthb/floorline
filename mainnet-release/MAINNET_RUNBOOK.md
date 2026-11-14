# Controlled mainnet pilot runbook

Status: **future procedure only; do not execute while the gate is NO-GO**.

## Preconditions

1. Independent security review closes every Critical/High finding against the
   exact source, lockfile and WASM.
2. Artifact verification passes byte-for-byte using `verify-artifact.ps1`.
3. A new mainnet account, key custody/upgrade policy, incident owner, monitor
   owner and reviewed total/per-action exposure budget are documented.
4. Current official mainnet storage/gas configuration and deployment guidance
   are re-queried immediately before budgeting. Testnet measurements are not a
   mainnet quote.
5. The frontend uses a dedicated mainnet build with fixed mainnet contract/hash,
   RPC, wallet and explorer values and rejects testnet accounts/configuration.

## Ordered execution (requires separate authorization)

1. Freeze commit, `Cargo.lock`, compiler, flags, artifact bytes and manifest.
2. Create/fund the new account; record the account-creation receipt and keys
   visible on-chain without exporting private key material.
3. Deploy and atomically call `new({tax_bps:2000,
   issuance_numerator:"1",issuance_denominator:"1"})`. Prefunding is operational
   cash, not backing. Verify initialization and code hash independently.
4. Record access keys and confirm the approved custody policy. Verify `L=0,T=0`,
   metadata, storage bounds and accounting.
5. Register the pilot holder, then execute a separately capped tiny `issue`.
   Record wallet intent, root transaction, every receipt and post-state.
6. Quote and redeem a separately capped amount with explicit `min_out`; withdraw
   the resulting claim once. Do not retry an unknown result.
7. Require callback success, Paid claim state, treasury debit, holder credit and
   `account_balance >= local_required`. Reconcile supply and backing using integers.
8. Verify the isolated frontend only after receipts finalize. Keep it disabled
   if RPC providers disagree or monitoring is unhealthy.

## Stop conditions

Stop immediately on artifact/config/hash mismatch, unexpected access-key/code
change, unknown receipt/callback, native balance below `local_required`, storage
headroom breach, unapproved deposit/exposure, RPC disagreement, or any transaction
whose final child-receipt tree is incomplete. UI shutdown does not pause the
contract. Preserve raw evidence and do not resend or “timeout-repay” uncertainty.

