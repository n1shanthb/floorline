# Gate 1 API and standards plan

## Implementation boundary

The Rust API below is implemented on Engine. Amounts are u128 atomic units; IDs, nonces, duration and timestamps are u64 (time units are nanoseconds). Account is a registered u32 local model identity; 0 is reserved for trusted callbacks. Parameters named caller are model inputs, not a safe public-chain authentication mechanism. Every mutating Result operation is transactional: failure preserves the entire engine state.

On-chain compilation currently exposes only `new(tax_bps:u16, issuance_numerator:U128, issuance_denominator:U128) -> Contract` and `gate1_status() -> String`. new is initialization-only, nonpayable and fixes config. gate1_status is a nonpayable view. The WASM shell embeds the same Borsh-serializable Engine but exposes no money or token mutators. Do not deploy this shell as a working Floorline protocol.

For future financial entrypoints, derive identity from predecessor_account_id and attached NEAR from attached_deposit; never expose caller, net_deposit, now, success or refund-confirmed as trusted user parameters. Persistent mapping must prevent any external account mapping to callback identity 0.

## Implemented engine methods

All functions below return Result<return-type,Error> except the listed views. Attached amounts are modeled external deposits; no actual NEAR moves in Gate 1.

- `Engine::new(Config) -> Engine`: tax_bps<10000, nonzero issuance numerator and denominator; empty cash and supply. No config setters or admin bypass.
- `storage_deposit(caller, attached) -> ()`: positive attached model cash; register a nonzero caller or top up. New registration needs ACCOUNT_STORAGE=4. No minted FLOOR. Other entrypoints require registration.
- `storage_withdraw(caller, amount) -> claim_id`: positive amount from caller's unused storage credit, with extra CLAIM_STORAGE=2 still available. Moves cash to a caller-owned StorageRefund claim; no external deposit.
- `fund_operational(caller, attached) -> ()`: registered caller, positive separate deposit. Increases operational reserves only. No operational withdrawal exists in this gate.
- `issue(caller, net_deposit, min_tokens) -> minted`: registered caller; modeled attached net deposit must be positive. Computes floor(net_deposit*fixed_weight), rejects zero, slippage, dilution and overflow. Increases L and T. Storage must be funded separately.
- `contribute(caller, attached) -> ()`: registered caller (including a future DAO), positive modeled deposit, T>0. Increases L only. Zero-supply contributions rejected.
- `quote(amount) -> payout`: no mutation or deposit; requires 0<amount<=T. Zero-value quotes are allowed.
- `redeem(caller, amount, min_out) -> claim_id`: unlocked tokens only; positive quote and min_out; caller pays claim-storage from prepaid credit. Burns amount, moves payout from L to caller-owned Redemption claim. No cash deposit.
- `transfer_floor(caller, to, amount) -> ()`: positive available tokens, distinct registered receiver; preserves T and L. No modeled cash deposit. Locked tokens are inaccessible here.
- `fund_offer(caller, Terms, attached) -> offer_id`: registered lender; attached must exactly equal principal>0, repayment>=principal, collateral>0, duration_ns>0. Charges OFFER_STORAGE=4 from lender credit and creates Funded. Principal goes to unused lender funding, never L.
- `cancel_offer(caller, offer_id) -> claim_id`: only lender, only Funded. Charges lender claim-storage; marks Cancelled and credits exactly unused principal as funded cancellation claim. No deposit.
- `accept_offer(caller, offer_id) -> (nft_id, borrower_claim_id)`: only Funded; borrower must have exact fixed collateral available and claim-storage credit. Checked expiry=now+duration. Moves collateral to locked custody, consumes funding into caller's borrower claim, creates Active loan NFT. No cash deposit or arbitrary terms override. NFT ID equals offer ID.
- `transfer_nft(caller, nft_id, to) -> ()`: active owner only, distinct registered receiver, no pending transfer. Updates NFT owner without changing original borrower, lender, collateral or debt terms. No modeled deposit.
- `begin_nft_transfer(caller, nft_id, to) -> nonce`: same owner/receiver controls; transfers ownership and saves a pending-resolution record. Blocks settlement and further transfers until resolution. No external receiver executes in this gate.
- `resolve_nft_transfer(caller, nft_id, nonce, accepted) -> ()`: caller=0 only; matching active pending nonce. Accept keeps receiver, reject returns prior owner. Clears pending once. No deposit.
- `repay(caller, nft_id, attached) -> lender_claim_id`: active current owner only, no pending transfer, now<expiry, exact attached repayment required. Caller pays claim-storage; lender claim is fully cash-backed by attached amount. Marks Repaid, invalidates NFT, unlocks collateral to caller. Preserves L and T.
- `default_loan(caller, nft_id) -> ()`: any registered processing caller; active/no pending transfer, now>=expiry. Marks Defaulted, invalidates NFT, gives collateral to immutable lender. No deposit, mint or burn.
- `advance_time(now) -> ()`: harness-only; reject reversal. Future adapter must use the chain clock and expose no public time setter.
- `begin_withdrawal(caller, claim_id) -> attempt`: owner only, Available only. Charges WITHDRAWAL_STORAGE=2 from caller credit; debits modeled local cash and moves claim InFlight. No public beneficiary override or partial withdrawal.
- `withdrawal_result(caller, claim_id, attempt, success) -> ()`: caller=0 only, matching InFlight attempt. Success -> Paid; failure -> AwaitRefund. Failure alone does not increase local cash.
- `confirm_refund(caller, claim_id, attempt) -> ()`: caller=0 only, matching AwaitRefund attempt. Adds the simulated returned cash and makes claim Available. Not a deployed refund-verification mechanism.

Views: `config() -> &Config`, `backing()/supply() -> u128`, `now() -> u64`, `accounts()/offers()/claims() -> immutable map references`, `nft_owner(id) -> Option<Account>`, `cash() -> Result<Cash>`, `check() -> Result<()>`. No mutable state reference is exposed. Free functions redemption_quote and backing_not_lower implement exact arithmetic queries.

## Exact standards implementation plan — not yet compliance

**NEP-141**: implement ft_total_supply, ft_balance_of, ft_transfer, ft_transfer_call, and private ft_resolve_transfer with standard JSON U128 amounts and authenticated predecessor identity. Supply includes locked collateral; represent that custody as the contract's escrow FT balance, not as spendable borrower balance. ft_balance_of(user) exposes available tokens; ft_balance_of(contract) includes the locked escrow tokens once. Internal acceptance/repayment/default movements must emit the appropriate transfer events. No user, even the contract identity as a caller, may use public transfers to drain encumbered escrow. Standard receiver refunds must use only available returned balances and a separate transfer-call reservation proof; they must not mint or consume loan collateral. Attach exactly one yocto for protected FT transfer methods and account for it outside backing. Metadata NEP-148 and standard NEP-297 events are planned supporting interfaces. [Official NEP-141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md).

**NEP-145**: implement storage_deposit(account_id?,registration_only?), storage_withdraw(amount?), storage_unregister(force?), storage_balance_bounds, storage_balance_of with standard return shapes. Use measured persistent bytes and env storage price; prepay account, loan, NFT resolution and payout records without L subsidies. Unregister must reject accounts with token balances, live roles/collateral, claims or unresolved transfers; force must not destroy other parties' rights. Gate 1 storage constants, claim IDs and integer accounts are not these interfaces. Locked tombstone allocations are not refundable until storage is actually reclaimed. Reserve callback and refund state before dispatch; resolve how an entire available-storage withdrawal funds its own refund receipt without charging backing. [Official NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md).

**NEP-171**: implement nft_token, nft_transfer, nft_transfer_call and private nft_resolve_transfer; string token IDs, AccountId ownership, exact one-yocto transfer protection, bounded promise-result parsing and gas, events for mint/transfer/burn. Approvals/enumeration are excluded unless a core interface requires their optional fields; no approval capability is advertised. A false nft_on_transfer result accepts the NFT, true requests return; malformed result/failed receiver requests return. Translate this correctly to the engine's accepted flag (inverse of return request). Verify the receiver/current-owner check and the standard resolver return boolean. This is not the same boolean convention as Engine::resolve_nft_transfer's Result<()>.

No settlement while a transfer-call is pending. Gate 1 conservatively blocks subsequent transfers as well. Before claiming compliance, test that restriction and forwarding behavior against the core standard; if forwarding is required, retain the settlement lock and resolve against the actual current owner without creating a second recovery right. A missing callback must remain unresolved, never unlock by a guessed timeout. Public APIs and runtime interoperability are not implemented/tested here. [Official NEP-171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md).

## Pending runtime callback requirements

Private callbacks must authenticate self-call, validate promise count, correlate the exact nonce and inspect actual promise outcomes. Reserve gas and all storage before starting a receipt chain. Unknown/missing callbacks must not authorize retries. Actual account-balance debit/refund ordering, receipt idempotency and recovery from callback failure need sandbox verification before exposing withdrawals. The model's independent failure/refund-confirmation events deliberately avoid assuming that failure proves local refund availability. User-supplied callback booleans are never acceptable on chain.
