# Minimal proposed FloorKit contract architecture

Design only. No Rust contract, scaffolding, deployment, wallet interaction or frontend implementation is authorized by this Phase 0 deliverable. Every method below is **proposed**, not a claim about an existing Floorline API.

## Isolation and deployment choices

A. One manually deployed coin: smallest credible reference kit. One NEAR account, one local Wasm, one private state namespace, one native reserve, one immutable configuration. Shows genuine token mechanics without pretending to be a launchpad. Start here if a separate build phase is authorized.

B. Two manual instances: same audited artifact, distinct accounts, economics, balances and storage. Stronger proof of independent reserves, with no factory. Requires second bootstrap/storage/operations funding and a cross-instance noninterference test. An optional extension after all single-instance gates, not a prerequisite disguised as a factory.

C. Permissionless factory: adds child creation, naming, code/version pinning, deployment/init callbacks, launch-fee segregation, failed-launch refunds, ownership/key policy and spam/storage attack surfaces. Global-by-account code adds mutable upstream trust. This is not credible before this deadline alongside existing submission work. **NO-GO for the factory.**

Recommendation: A, accurately labeled a manually deployed template/reference coin. Do not market a permissionless community launch flow. B may follow only if A has passed and time/funding remain. There is no pooled reserve, cross-coin liquidity, Floorline treasury integration or DAO controller.

## Storage layout and arithmetic

Use pinned Rust near-sdk and audited existing standards components as references, with a **new isolated package** in a future phase. Do not modify the approved Floorline package. Pure economic functions port the reference equations with U512 intermediates and checked U128 narrowing. `new` is initialization-only, with bounded NEP-148 metadata and immutable fields.

Persistent maps: account balance/storage/reference record; claim record keyed by checked U64; transfer-call resolution keyed by U64; fixed-capacity operational refund records. Store aggregate R,T,F,H,K,O,I and available category totals in fixed-width fields. `accounting` is O(1); ordinary changes/callbacks touch bounded rows. The Python model's full scans and rollback cloning are not a contract architecture.

Prepay measured record bytes at maximum serialized account lengths before first allocation. Keep paid claim rows until permissionless bounded cleanup returns allocated credit to the original payer. Participant reference counts prevent unregister during FT resolution. Use unique nonces even if record slots are reused. New operational refund entries must fit their pre-funded fixed pool; reject atomically if full. No history-sized Vector scan in a write path. Indexing may use events outside this contract.

Actual storage stake is measured at the current protocol rate and must fit K+O; H is refundable, not a free subsidy. Fixed operational/code/headroom O0 is separately funded; no method spends/sweeps it. Native fees are gas paid by originating callers. If later design needs O expenses/top-ups/reclassification, add an explicit modeled transition and re-run the gate; do not infer free operations cash from A-P.

## Public change methods: exact proposed arguments

All U128/U64 JSON values below are canonical decimal **strings**. AccountId is runtime-validated. `predecessor_account_id` is the actor; actor/time/success/returned-funds are never supplied as financial-authority JSON.

- `new({metadata: FungibleTokenMetadata, initial_price: U128, markup_bps: u16, redemption_tax_bps: u16, creator_fee_bps: u16, creator_id: AccountId, bootstrap_recipient: AccountId, seed_reserve: U128, recipient_storage: U128, operational_reserve: U128}) -> BootstrapView`. Initialization once, deployment+init atomic, exact sum attached; separately classify preexisting account cash. Bootstrap cannot be re-entered or reopened.
- `mint({min_tokens: U128, deadline_ns: U64}) -> U128`. Positive attached d is solely buy principal; recipient=self; separately registered/prepaid storage required. Net-of-fee pricing and checked counters before effects.
- `redeem({amount: U128, min_near: U128, deadline_ns: U64}) -> U64`. Exactly one yocto to O. Burns only caller's available units and creates a funded redemption claim. Full supply exit closes forever.
- `contribute({}) -> null`. Positive attached native amount adds to R only while active; no donor row unless separately paid for, no creator fee or mint.
- `claim_creator_fees({amount: U128}) -> U64`. Exactly one yocto; immutable creator only, registered with enough record credit; amount<=F. Creates replacement creator claim; no sweep of R.
- `withdraw_claim({claim_id: U64}) -> Promise`. Exactly one yocto; owner/Available only. Set InFlight+new nonce before scheduling a native transfer to the immutable owner, then private callback.
- `retry_failed_claim({claim_id: U64}) -> null`. Exactly one yocto; owner/RefundPending and A>=P+I. Restores availability only, never dispatches unknown cash automatically.
- `cleanup_claim({claim_id: U64}) -> null`. Permissionless zero attached; Paid only. Release original record payer's credit or an operations-funded slot. No redirectable native transfer.
- `ft_transfer({receiver_id: AccountId, amount: U128, memo: Option<String>}) -> null`. Exactly one yocto to O; distinct registered parties, positive balance, bounded memo. No token fee or supply mutation.
- `ft_transfer_call({receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String}) -> Promise<U128>`. Exactly one yocto; prepay pending record and retain both registration references; bounded memo/msg. Receiver receives existing FT, resolver returns the standard used amount.
- `storage_deposit({account_id: Option<AccountId>, registration_only: Option<bool>}) -> StorageBalance`. Supports third-party sponsorship. Retain appropriate minimum/credit and automatically Promise-refund excess to predecessor via its pre-funded slot. All accepted native credit is H/K or refund liability, never R.
- `storage_withdraw({amount: Option<U128>}) -> StorageBalance`. Exactly one yocto; None means all available H; cannot remove token data. Atomically reserve/debit H and schedule refund, with one outstanding fixed-width per-user refund slot.
- `storage_unregister({force: Option<bool>}) -> bool`. Exactly one yocto. Unregistered caller returns false, without panic or a native claim; one yocto is operational credit. For a registered user, reject any tokens/live rights/callbacks/uncleaned records even with force=true. Empty unregister returns true, removes registration and schedules the **entire** freed storage credit to the same account using a bounded operations-funded slot. Force-burning economic rights is deliberately unsupported.

Reference-model methods return record IDs for inspection and reject missing-user unregister as a stricter internal precondition; the public adapter's false/null/StorageBalance cases above must be separately tested. They change no R/T; the unregistered false branch only credits the authorization yocto to O. This is an explicit adapter coverage boundary, not an already tested standards-conformance claim.

NEP-141/145 public shapes are based on [NEP-141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md) and [NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md). Restricted force-unregistration must be disclosed. No approvals/allowances/burn API is introduced. Ordinary total-supply/balance/metadata views use NEP-141/148 units. Interface compliance, event shapes and real refund behavior need runtime tests; using method names does not certify them.

## Views

`get_config({})`, `accounting({})`, `quote_mint({deposit:U128})`, `quote_redeem({amount:U128})`, `get_claim({claim_id:U64})`, `get_pending_ft_call({call_id:U64})`, `ft_total_supply({})`, `ft_balance_of({account_id:AccountId})`, `ft_metadata({})`, `storage_balance_bounds({})`, `storage_balance_of({account_id:AccountId})`.

Expose config/closed, R,T, nullable exact backing numerator/denominator, F, available claim category totals, H,K,O,I,A, measured stake and P. Never publish A-P as spendable cash. `backing` is null at T=0. Quotes explicitly report inactive/dust/overflow, fee and retained-net amounts; they do not promise their result survives transaction ordering. Claims expose owner/amount/kind/state/nonce/payer cost. No unchecked whole-history enumeration or fake liquidity view.

## Private callbacks and state machines

`on_native_result({claim_id:U64, attempt_id:U64})`: private predecessor=self, exactly one actual PromiseResult, matching state and nonce. Success→Paid; failure→RefundPending without balance credit. `retry_failed_claim` uses current native balance plus all unresolved I, not a user attestation of refund. A callback that never runs leaves InFlight locked.

`ft_resolve_transfer({call_id:U64}) -> U128`: private actual PromiseResult; bounded U128 parsing, malformed/failure requests full original unused amount. Return at most receiver availability to still-registered sender; no mint/burn of unavailable units; remove pending reference/cost once. No timeout ownership/balance guess.

Before any Promise is scheduled, all local token/native/storage effects and the unique attempt state must be persisted. Reentrant public calls then see a locked claim; duplicate/stale callback has no payout authority. The contract must never export `env_send`, `env_refund`, a caller-set clock or a `successful`/`refund_received` boolean.

## Events and operational limits

NEP-297 envelope with NEP-141 `ft_mint`, `ft_burn`, `ft_transfer`; proposed `floorkit` version `1.0.0` events `bootstrap`, `mint_quote_execution`, `redemption_claim`, `creator_fee_accrued`, `claim_dispatched`, `claim_result`, `claim_restored`, `storage_refund`, `terminal_closed`, `contribution`. Amounts/IDs are strings. Emit actual state transitions, never a dispatch as a successful payment. Include separate fee/net/markup parameters and closure status; logs are not an alternative authority for callbacks.

Initial benchmark budgets, **not measured guarantees**: 40 Tgas for bounded simple math/storage writes; 150 Tgas for native withdrawal/automatic refund/FT call paths, initially 30 Tgas for private resolver and explicitly capped receiver gas. Enforce a measured minimum before effect, zero unused-gas weight for bounded callbacks, and enough separately funded native gas liquidity in the calling wallet. Profile against actual target protocol and maximum serialized records. Insufficient-gas callback must remain safely unresolved, not optimistic Paid. Do not copy Floorline's measured gas as proof for a new artifact.

## Access and immutability

No owner/admin/DAO setters. Creator only withdraws its funded entitlement. Use local Wasm rather than publisher-ID global binding. Exclude upgrade/migration, generic Promise/action executor, key-add/restore, delete-account, arbitrary transfer and reserve-spend paths. During future authorized deployment, retained signing keys make the account mutable until separately verified lock-down; zero-key and code-reference evidence must be independently captured. Never describe the currently retained-key Floorline as immutable. No key operation is authorized in Phase 0.

## Required integration gate before any public deployment

1. Actual near-sdk sandbox deployment+atomic initialization of a **new** artifact; compare exact checkpoints/quotes against this model, including maximal intermediates and overflow rollback.
2. Real NEP-141 receiver receipts for accept/reject/panic/malformed/forward/redeem-before-resolution; missing callback; duplicate/stale/private-call rejection; no unregistration/resolver burn causing R>0,T=0.
3. Real measured storage, longest AccountIds, all refund slots full, repeated sponsor excess, unregister false branch, restricted force profile, partial/all storage withdrawal, cleanup payers and history-size gas scaling.
4. Actual native transfer success/failure/refund ordering, missing/underfunded callback, overlapping promises, no automatic duplicate payment, conservative failed restoration and late old refunds. Confirm the abstract Q/debit/refund model corresponds to observed NEAR balances.
5. Creator/self purchase cycles, failed fee payment, full closure while fee/storage/claims/FT callbacks remain, unsolicited deposits/rewards before/after closure, cannot remint/reset/sweep.
6. Actual source/Wasm export/call graph review and access-key/global-code evidence for any eventual immutability claim. A second human security review is desirable; do not call this pure model an audit.
7. Only after authorization/funding and all gates: controlled testnet receipts for bootstrap, buy, redemption claim+completed withdrawal, creator fee segregation, closure/refusal to reopen. No frontend integration before the new instance is verified. Existing Floorline stays untouched.
