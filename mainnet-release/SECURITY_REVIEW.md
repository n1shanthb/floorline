# FLOOR security review — release-gate assessment

Scope: exact source at commit `6ee055e4afde448d0b05bc557a1036825827a6c6`,
approved SHA-256 `529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6`,
near-sdk 5.30.1. This is a Codex engineering review, **not** an independent
professional audit.

## Release findings

### HIGH — callback loss can permanently strand claim or refund rights

`withdraw_claim` changes an Available claim to InFlight before emitting the
transfer and callback. Only `claim_result` can move it to Paid or KnownFailed.
If that callback never executes, no method can reconcile it. A second withdrawal
is correctly rejected, so the design fails closed against double payment, but
the claimant can remain stuck forever. Storage refunds have the same terminal
availability shape while their callback is missing. Sandbox fault injection
proved a real transfer followed by callback exhaustion leaves the claim InFlight
and rejects both retry and duplicate withdrawal (`GATE2_RESULTS.md`).

The effect is not necessarily isolated: every known-failure retry requires
`account_balance >= required + inflight`. An unresolved successful transfer can
therefore consume the unallocated buffer and prevent recovery of other users'
known-failed claims. Repeated lost storage-refund callbacks also retain refund
records and consume the finite prepaid `refund_storage` allowance until later
refund-producing operations reject. Ordinary issuance/redemption accounting is
not globally paused by one claim, but recovery/refund availability can degrade.

Impact: permanent user-fund availability loss and unresolved accounting on a
production incident. It does not by itself prove insolvency or allow a double
payout. Assessment: **UNACCEPTABLE for mainnet** without an independently
reviewed recovery design and fresh economic/runtime gates.

### HIGH — unrestricted full-access authority can replace code and spend funds

The deployed testnet account has a FullAccess key. The source has no exported
admin setter, pause or upgrade method, but account-level FullAccess authority can
replace code, delete/add keys and transfer native funds. A future mainnet custody
model is unspecified. “Ownerless” or “immutable” is therefore unproven.

Impact: total protocol compromise if that authority is compromised or abused.
Assessment: **release blocker** until custody, upgrade policy, initialization and
post-deployment key policy receive independent review and an operational owner.

### MEDIUM — no on-chain exposure cap, allowlist or pause

Payable issuance, contribution and lender funding are public. UI limits and an
unadvertised pilot cannot cap third-party exposure. There is no pause path during
an incident. A controlled pilot can bound project-originated funds, but not total
public calls after deployment.

### MEDIUM — incomplete on-chain discovery and monitoring surface

The contract exposes point lookups but no complete claim/loan enumeration.
Production reconciliation requires a trustworthy receipt/event indexer plus
multi-RPC monitoring. Missing callback history cannot be inferred from a UI
timeout or RPC `UNKNOWN_TRANSACTION` response.

### LOW — zero-supply restart semantics require explicit disclosure

When `T == 0`, `issue` intentionally admits a new bootstrap even if historical
economic context existed. The tested state machine prevents reachable `T=0,
L>0` during ordinary operations, but this is restart behavior, not permanent
closure and must not be described as such.

### INFORMATIONAL — economic and settlement protections observed

- Positive-supply issuance enforces `d*T >= L*m` with wide checked arithmetic.
- Redemption removes `L` and `T` before creating its funded claim; concurrent
  claims cannot reuse the same backing.
- Lender principal is tracked outside `L`; accepting an offer locks existing
  FLOOR and creates a funded borrower claim.
- Repayment requires the current NFT owner, exact debt and time `< expiry`;
  default requires `>= expiry`. Both require no pending NFT transfer and end in
  an exclusive terminal state.
- Checked integer operations, storage charging and conservation properties have
  host/property and local runtime evidence. This evidence is substantial but is
  not a substitute for an independent audit.

## Solvency statement

For locally held obligations the contract reports
`local_required = L + unused_lender + storage_total + operational + sum(claims_cash)`.
Available claims are reserved there. InFlight amounts are excluded after the
native transfer debit and tracked separately, avoiding double-counting them as
both local cash and paid value. A missing callback makes final disposition
unknown; it must never be automatically retried. Before launch, monitors must
compare native balance, `local_required`, `inflight`, storage stake and every
known claim/receipt across independent data sources.

