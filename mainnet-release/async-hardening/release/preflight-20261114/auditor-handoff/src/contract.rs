//! Bounded persistent NEAR adapter. Reference-engine scans stay off chain.
use crate::math::{narrow, wide};
use crate::redemption_quote;
use near_sdk::{
    collections::LookupMap,
    env,
    json_types::{U128, U64},
    near,
    serde_json::{json, Value},
    AccountId, Gas, GasWeight, NearToken, PanicOnDefault, Promise,
};
#[cfg(not(feature = "fault-injection"))]
const GAS_CB: u64 = 30;
#[cfg(feature = "fault-injection")]
const GAS_CB: u64 = 1;
const GAS_RECEIVER: u64 = 50;
const MAX_MEMO: usize = 256;
#[near(serializers=[borsh, json])]
#[derive(Clone, Default)]
pub struct PilotLimits {
    pub max_action: U128,
    pub max_gross: U128,
    pub max_storage: U128,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct User {
    tokens: u128,
    total: u128,
    used: u128,
    base: u128,
    refs: u64,
    refund: u128,
    refund_nonce: u64,
    refund_state: u8,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Loan {
    lender: AccountId,
    borrower: AccountId,
    owner: AccountId,
    principal: u128,
    repayment: u128,
    collateral: u128,
    duration: u64,
    expiry: u64,
    state: u8,
    pending: u32,
    cost: u128,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Claim {
    owner: AccountId,
    payer: AccountId,
    amount: u128,
    kind: u8,
    state: u8,
    attempt: u64,
    cost: u128,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Call {
    kind: u8,
    previous: AccountId,
    receiver: AccountId,
    loan: u64,
    amount: u128,
    cost: u128,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Refund {
    receiver: AccountId,
    amount: u128,
    state: u8,
    cost: u128,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    guardian: AccountId,
    stopped: bool,
    limits: PilotLimits,
    gross: u128,
    admission_count: u32,
    tax: u16,
    weight_num: u128,
    weight_den: u128,
    l: u128,
    t: u128,
    locked: u128,
    unused: u128,
    claims_cash: [u128; 5],
    storage_total: u128,
    operational: u128,
    operational_base: u128,
    refund_storage: u128,
    inflight: u128,
    next: u64,
    users: LookupMap<AccountId, User>,
    loans: LookupMap<u64, Loan>,
    claims: LookupMap<u64, Claim>,
    calls: LookupMap<u64, Call>,
    refunds: LookupMap<u64, Refund>,
    min_storage: u128,
}
fn plus(a: u128, b: u128) -> u128 {
    a.checked_add(b).expect("overflow")
}
fn minus(a: u128, b: u128) -> u128 {
    a.checked_sub(b).expect("insufficient balance")
}
fn amount() -> u128 {
    env::attached_deposit().as_yoctonear()
}
fn caller() -> AccountId {
    env::predecessor_account_id()
}
fn max_account() -> AccountId {
    "a".repeat(64).parse().unwrap()
}
fn bytes_cost(n: u64) -> u128 {
    u128::from(n)
        .checked_mul(env::storage_byte_cost().as_yoctonear())
        .expect("storage overflow")
}
fn event(standard: &str, version: &str, name: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({"standard":standard,"version":version,"event":name,"data":[data]})
    ));
}
fn floor_event(name: &str, data: Value) {
    event("floorline", "1.0.0", name, data)
}
fn memo_ok(memo: &Option<String>) {
    assert!(
        memo.as_ref().map(|x| x.len() <= MAX_MEMO).unwrap_or(true),
        "memo too long"
    )
}
#[near]
impl Contract {
    #[init]
    pub fn new(
        tax_bps: u16,
        issuance_numerator: U128,
        issuance_denominator: U128,
        pilot_limits: Option<PilotLimits>,
    ) -> Self {
        assert!(
            tax_bps < 10000 && issuance_numerator.0 > 0 && issuance_denominator.0 > 0,
            "invalid config"
        );
        let mut s = Self {
            guardian: caller(),
            stopped: false,
            limits: pilot_limits.unwrap_or_default(),
            gross: 0,
            admission_count: 0,
            tax: tax_bps,
            weight_num: issuance_numerator.0,
            weight_den: issuance_denominator.0,
            l: 0,
            t: 0,
            locked: 0,
            unused: 0,
            claims_cash: [0; 5],
            storage_total: 0,
            // Protect code/state and 128 prepaid 512-byte exit slots. Excess
            // deployment cash is unallocated, not a fixed liability: a retained
            // full-access key can spend transaction gas from that excess.
            operational: plus(
                bytes_cost(
                    env::storage_usage()
                        .checked_add(4096)
                        .expect("storage overflow"),
                ),
                bytes_cost(128 * 512),
            ),
            operational_base: bytes_cost(
                env::storage_usage()
                    .checked_add(4096)
                    .expect("storage overflow"),
            ),
            refund_storage: 0,
            inflight: 0,
            next: 0,
            users: LookupMap::new(b"u"),
            loans: LookupMap::new(b"l"),
            claims: LookupMap::new(b"c"),
            calls: LookupMap::new(b"x"),
            refunds: LookupMap::new(b"r"),
            min_storage: 0,
        };
        let before = env::storage_usage();
        let a = max_account();
        s.users.insert(&a, &Self::empty_user());
        s.min_storage = plus(bytes_cost(env::storage_usage() - before), bytes_cost(256));
        s.users.remove(&a);
        assert!(
            env::account_balance().as_yoctonear() >= s.operational,
            "pre-fund deployment storage and operational headroom"
        );
        s
    }
    pub fn accounting(&self) -> Value {
        json!({"L":U128(self.l),"T":U128(self.t),"locked":U128(self.locked),"unused_lender":U128(self.unused),"borrower_claims":U128(self.claims_cash[0]),"lender_claims":U128(self.claims_cash[1]),"redemption_claims":U128(self.claims_cash[2]),"cancellation_claims":U128(self.claims_cash[3]),"storage_refund_claims":U128(self.claims_cash[4]),"storage_total":U128(self.storage_total),"operational":U128(self.operational),"inflight":U128(self.inflight),"local_required":U128(self.required()),"operational_base":U128(self.operational_base),"refund_storage":U128(self.refund_storage),"unallocated_or_inflight":U128(env::account_balance().as_yoctonear().saturating_sub(self.required())),"account_balance":env::account_balance().as_yoctonear().to_string(),"storage_usage":env::storage_usage(),"storage_stake":U128(bytes_cost(env::storage_usage())),"tax_bps":self.tax})
    }
    pub fn admission_status(&self) -> Value {
        json!({"occupied":self.admission_count,"capacity":128,"exit_bytes_per_slot":512,"exit_reserve":U128(bytes_cost(128*512))})
    }
    pub fn pilot_status(&self) -> Value {
        json!({"guardian":self.guardian,"stopped":self.stopped,"gross":U128(self.gross),"limits":self.limits,"version":"floor-async-rc1"})
    }
    pub fn stop_new_risk(&mut self) {
        assert_eq!(caller(), self.guardian, "not guardian");
        self.stopped = true;
        floor_event("risk_stopped", json!({"guardian":self.guardian}));
    }
    pub fn user_state(&self, account_id: AccountId) -> Option<Value> {
        self.users.get(&account_id).map(|u|json!({"tokens":U128(u.tokens),"storage_total":U128(u.total),"storage_used":U128(u.used),"refs":u.refs,"refund":U128(u.refund),"refund_state":u.refund_state}))
    }
    pub fn get_loan(&self, loan_id: U64) -> Option<Value> {
        self.loans.get(&loan_id.0).map(|l|json!({"lender":l.lender,"borrower":l.borrower,"owner":l.owner,"principal":U128(l.principal),"repayment":U128(l.repayment),"collateral":U128(l.collateral),"expiry":U64(l.expiry),"state":l.state,"pending":l.pending,"storage_cost":U128(l.cost)}))
    }
    pub fn get_claim(&self, claim_id: U64) -> Option<Value> {
        self.claims.get(&claim_id.0).map(|c|json!({"owner":c.owner,"amount":U128(c.amount),"kind":c.kind,"state":c.state,"attempt":U64(c.attempt),"storage_cost":U128(c.cost)}))
    }
    pub fn quote(&self, amount: U128) -> U128 {
        U128(redemption_quote(self.l, self.t, amount.0, self.tax).expect("invalid redemption"))
    }
    pub fn ft_total_supply(&self) -> U128 {
        U128(self.t)
    }
    pub fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        if account_id == env::current_account_id() {
            U128(self.locked)
        } else {
            U128(self.users.get(&account_id).map(|u| u.tokens).unwrap_or(0))
        }
    }
    pub fn ft_metadata(&self) -> Value {
        json!({"spec":"ft-1.0.0","name":"Floorline","symbol":"FLOOR","decimals":24,"icon":null,"reference":null,"reference_hash":null})
    }
    #[payable]
    pub fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> Value {
        Self::gas();
        assert!(amount() <= self.limits.max_storage.0, "storage deposit cap");
        let id = account_id.unwrap_or_else(caller);
        assert_ne!(id, env::current_account_id(), "escrow cannot register");
        let deposit = amount();
        let exists = self.users.get(&id).is_some();
        if exists && registration_only.unwrap_or(false) {
            self.send_refund(caller(), deposit);
        } else {
            let mut u = self.users.get(&id).unwrap_or_else(Self::empty_user);
            assert_ne!(u.refund_state, 3, "unregistration pending");
            if !exists {
                assert!(self.admission_count < 128, "admission capacity exhausted");
                self.admission_count = self
                    .admission_count
                    .checked_add(1)
                    .expect("admission overflow");
                assert!(
                    deposit >= self.min_storage,
                    "insufficient registration deposit"
                );
                let before = env::storage_usage();
                self.users.insert(&id, &u);
                assert!(
                    bytes_cost(env::storage_usage() - before) <= bytes_cost(256),
                    "user exceeds reserved byte bound"
                );
                u.base = self.min_storage;
                u.used = u.base;
            }
            let retained = if registration_only.unwrap_or(false) {
                self.min_storage
            } else {
                deposit
            };
            u.total = plus(u.total, retained);
            assert!(u.total <= self.limits.max_storage.0, "storage credit cap");
            assert!(u.total >= u.used);
            self.storage_total = plus(self.storage_total, retained);
            self.users.insert(&id, &u);
            self.send_refund(caller(), deposit - retained);
        }
        self.storage_balance_of(id).unwrap()
    }
    pub fn storage_balance_bounds(&self) -> Value {
        json!({"min":U128(self.min_storage),"max":null})
    }
    pub fn storage_balance_of(&self, account_id: AccountId) -> Option<Value> {
        self.users
            .get(&account_id)
            .filter(|u| u.refund_state != 3)
            .map(|u| json!({"total":U128(u.total),"available":U128(minus(u.total,u.used))}))
    }
    #[payable]
    pub fn storage_withdraw(&mut self, amount: Option<U128>) -> Value {
        Self::gas();
        self.one();
        let who = caller();
        let mut u = self.user(&who);
        let n = amount.map(|n| n.0).unwrap_or(minus(u.total, u.used));
        assert!(n <= minus(u.total, u.used));
        if n > 0 {
            u.total = minus(u.total, n);
            self.storage_total = minus(self.storage_total, n);
            self.users.insert(&who, &u);
            self.send_refund(who.clone(), n);
        }
        self.storage_balance_of(who).unwrap()
    }
    #[payable]
    pub fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        Self::gas();
        self.one();
        let who = caller();
        let Some(u) = self.users.get(&who) else {
            return false;
        };
        if u.refund_state == 3 {
            return false;
        }
        let _ = force;
        assert!(
            u.tokens == 0 && u.refs == 0 && u.used == u.base && u.refund_state == 0,
            "live funds or rights; force cannot destroy them"
        );
        self.storage_total = minus(self.storage_total, u.total);
        let mut pending = u.clone();
        pending.refund_state = 3;
        self.users.insert(&who, &pending);
        self.send_refund(who, u.total);
        true
    }
    #[private]
    pub fn storage_refund_result(&mut self, refund_id: U64) {
        assert_eq!(env::promise_results_count(), 1);
        let Some(mut r) = self.refunds.get(&refund_id.0) else {
            return;
        };
        if r.state != 1 {
            return;
        }
        if env::promise_result_checked(0, 0).is_ok() {
            self.inflight = minus(self.inflight, r.amount);
            self.refund_storage = minus(self.refund_storage, r.cost);
            self.refunds.remove(&refund_id.0);
            if let Some(mut u) = self.users.get(&r.receiver) {
                if u.refund_state == 3 {
                    self.users.remove(&r.receiver);
                    self.admission_count = self
                        .admission_count
                        .checked_sub(1)
                        .expect("admission underflow");
                } else {
                    u.refund = 0;
                    u.refund_state = 0;
                    self.users.insert(&r.receiver, &u);
                }
            }
        } else {
            r.state = 2;
            self.refunds.insert(&refund_id.0, &r);
        }
    }
    pub fn retry_storage_refund(&mut self, refund_id: U64) -> Promise {
        Self::gas();
        let mut r = self.refunds.get(&refund_id.0).expect("missing refund");
        assert_eq!(caller(), r.receiver);
        assert_eq!(r.state, 2);
        assert!(
            env::account_balance().as_yoctonear() >= plus(self.required(), self.inflight),
            "refund not available"
        );
        r.state = 1;
        self.refunds.insert(&refund_id.0, &r);
        Promise::new(r.receiver)
            .transfer(NearToken::from_yoctonear(r.amount))
            .then(Self::callback(
                "storage_refund_result",
                json!({"refund_id":refund_id}),
                GAS_CB,
            ))
    }
    #[payable]
    pub fn issue(&mut self, min_tokens: U128) -> U128 {
        self.new_risk();
        let who = caller();
        let d = amount();
        assert!(d > 0);
        let m =
            narrow(wide(d) * wide(self.weight_num) / wide(self.weight_den)).expect("mint overflow");
        assert!(m > 0 && m >= min_tokens.0, "dust or slippage");
        assert!(
            self.t == 0 || wide(d) * wide(self.t) >= wide(self.l) * wide(m),
            "dilutive issuance"
        );
        self.credit(&who, m);
        self.l = plus(self.l, d);
        self.t = plus(self.t, m);
        event(
            "nep141",
            "1.0.0",
            "ft_mint",
            json!({"owner_id":who,"amount":U128(m)}),
        );
        U128(m)
    }
    #[payable]
    pub fn contribute(&mut self) {
        self.new_risk();
        let d = amount();
        assert!(
            d > 0 && self.t > 0,
            "positive contribution to live supply required"
        );
        self.l = plus(self.l, d);
        floor_event(
            "contribute",
            json!({"donor":caller(),"amount":U128(d),"L":U128(self.l),"T":U128(self.t)}),
        );
    }
    pub fn redeem(&mut self, amount: U128, min_out: U128) -> U64 {
        let who = caller();
        let n = self.quote(amount).0;
        assert!(n > 0 && n >= min_out.0, "dust or slippage");
        self.debit(&who, amount.0);
        self.l = minus(self.l, n);
        self.t = minus(self.t, amount.0);
        let id = self.new_claim(&who, &who, n, 2);
        event(
            "nep141",
            "1.0.0",
            "ft_burn",
            json!({"owner_id":who,"amount":amount}),
        );
        U64(id)
    }
    #[payable]
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.one();
        memo_ok(&memo);
        self.move_ft(&caller(), &receiver_id, amount.0);
    }
    #[payable]
    pub fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        self.one();
        Self::gas();
        memo_ok(&memo);
        assert!(msg.len() <= 1024);
        let who = caller();
        self.move_ft(&who, &receiver_id, amount.0);
        let id = self.new_call(Call {
            kind: 0,
            previous: who.clone(),
            receiver: receiver_id.clone(),
            loan: 0,
            amount: amount.0,
            cost: 0,
        });
        Promise::new(receiver_id)
            .function_call(
                "ft_on_transfer",
                near_sdk::serde_json::to_vec(&json!({"sender_id":who,"amount":amount,"msg":msg}))
                    .unwrap(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(GAS_RECEIVER),
            )
            .then(Self::callback(
                "ft_resolve_transfer",
                json!({"transfer_id":U64(id)}),
                GAS_CB,
            ))
    }
    #[private]
    pub fn ft_resolve_transfer(&mut self, transfer_id: U64) -> U128 {
        assert_eq!(env::promise_results_count(), 1);
        let c = self.calls.get(&transfer_id.0).expect("stale callback");
        assert_eq!(c.kind, 0);
        let requested = env::promise_result_checked(0, 64)
            .ok()
            .and_then(|v| near_sdk::serde_json::from_slice::<U128>(&v).ok())
            .map(|v| v.0.min(c.amount))
            .unwrap_or(c.amount);
        let available = self.user(&c.receiver).tokens;
        let refund = requested.min(available);
        if refund > 0 {
            self.move_ft(&c.receiver, &c.previous, refund)
        }
        self.finish_call(transfer_id.0, &c);
        U128(c.amount - refund)
    }
    #[payable]
    pub fn fund_offer(&mut self, repayment: U128, collateral: U128, duration_ns: U64) -> U64 {
        self.new_risk();
        assert!(
            repayment.0 <= self.limits.max_action.0,
            "debt admission cap"
        );
        let who = caller();
        let p = amount();
        assert!(p > 0 && repayment.0 >= p && collateral.0 > 0 && duration_ns.0 > 0);
        let id = self.id();
        let mut loan = Loan {
            lender: who.clone(),
            borrower: max_account(),
            owner: max_account(),
            principal: p,
            repayment: repayment.0,
            collateral: collateral.0,
            duration: duration_ns.0,
            expiry: 0,
            state: 0,
            pending: 0,
            cost: 0,
        };
        let before = env::storage_usage();
        let mut max = loan.clone();
        max.lender = max_account();
        self.loans.insert(&id, &max);
        loan.cost = bytes_cost(env::storage_usage() - before);
        self.charge(&who, loan.cost);
        self.refs(&who, true);
        self.loans.insert(&id, &loan);
        self.unused = plus(self.unused, p);
        U64(id)
    }
    pub fn cancel_offer(&mut self, loan_id: U64) -> U64 {
        let mut l = self.loans.get(&loan_id.0).expect("missing offer");
        assert_eq!(caller(), l.lender);
        assert_eq!(l.state, 0);
        l.state = 4;
        self.unused = minus(self.unused, l.principal);
        self.refs(&l.lender, false);
        let claim = self.new_claim(&l.lender, &l.lender, l.principal, 3);
        self.loans.insert(&loan_id.0, &l);
        U64(claim)
    }
    pub fn accept_offer(&mut self, loan_id: U64) -> U64 {
        assert!(!self.stopped, "new risk stopped");
        let mut l = self.loans.get(&loan_id.0).expect("missing offer");
        assert_eq!(l.state, 0);
        let who = caller();
        self.debit(&who, l.collateral);
        self.refs(&who, true);
        self.locked = plus(self.locked, l.collateral);
        self.unused = minus(self.unused, l.principal);
        l.owner = who.clone();
        l.borrower = who.clone();
        l.expiry = env::block_timestamp()
            .checked_add(l.duration)
            .expect("expiry overflow");
        l.state = 1;
        let claim = self.new_claim(&who, &who, l.principal, 0);
        self.loans.insert(&loan_id.0, &l);
        Self::ft_log(&who, &env::current_account_id(), l.collateral);
        event(
            "nep171",
            "1.2.0",
            "nft_mint",
            json!({"owner_id":who,"token_ids":[loan_id.0.to_string()]}),
        );
        U64(claim)
    }
    pub fn nft_token(&self, token_id: String) -> Option<Value> {
        let id = token_id.parse::<u64>().ok()?;
        if id.to_string() != token_id {
            return None;
        };
        self.loans.get(&id).filter(|l|l.state==1).map(|l|json!({"token_id":token_id,"owner_id":l.owner,"metadata":{"title":format!("Floorline loan {id}"),"description":"Exclusive right to repay fixed debt and reclaim locked FLOOR; not a personal debt obligation","expires_at":(l.expiry/1_000_000).to_string()}}))
    }
    pub fn nft_metadata(&self) -> Value {
        json!({"spec":"nft-1.0.0","name":"Floorline Loan Rights","symbol":"FLLOAN","icon":null,"base_uri":null,"reference":null,"reference_hash":null})
    }
    #[payable]
    pub fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        self.one();
        assert!(approval_id.is_none());
        memo_ok(&memo);
        self.move_nft(Self::token_key(&token_id), &caller(), &receiver_id);
    }
    #[payable]
    pub fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        self.one();
        Self::gas();
        assert!(approval_id.is_none());
        memo_ok(&memo);
        assert!(msg.len() <= 1024);
        let who = caller();
        let loan = Self::token_key(&token_id);
        self.move_nft(loan, &who, &receiver_id);
        let mut l = self.loans.get(&loan).unwrap();
        l.pending = l.pending.checked_add(1).expect("pending overflow");
        self.loans.insert(&loan, &l);
        let id = self.new_call(Call {
            kind: 1,
            previous: who.clone(),
            receiver: receiver_id.clone(),
            loan,
            amount: 0,
            cost: 0,
        });
        Promise::new(receiver_id)
            .function_call(
                "nft_on_transfer",
                near_sdk::serde_json::to_vec(
                    &json!({"sender_id":who,"previous_owner_id":who,"token_id":token_id,"msg":msg}),
                )
                .unwrap(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(GAS_RECEIVER),
            )
            .then(Self::callback(
                "nft_resolve_transfer",
                json!({"transfer_id":U64(id)}),
                GAS_CB,
            ))
    }
    #[private]
    pub fn nft_resolve_transfer(&mut self, transfer_id: U64) -> bool {
        assert_eq!(env::promise_results_count(), 1);
        let c = self.calls.get(&transfer_id.0).expect("stale callback");
        assert_eq!(c.kind, 1);
        let revert = env::promise_result_checked(0, 5)
            .ok()
            .and_then(|v| near_sdk::serde_json::from_slice::<bool>(&v).ok())
            .unwrap_or(true);
        let mut l = self.loans.get(&c.loan).expect("live loan missing");
        assert_eq!(l.state, 1);
        l.pending = l.pending.checked_sub(1).expect("no pending transfer");
        self.loans.insert(&c.loan, &l);
        let returned = revert && l.owner == c.receiver;
        if returned {
            self.move_nft(c.loan, &c.receiver, &c.previous)
        }
        self.finish_call(transfer_id.0, &c);
        !returned
    }
    #[payable]
    pub fn repay(&mut self, loan_id: U64) -> U64 {
        let mut l = self.active(loan_id.0);
        let who = caller();
        assert_eq!(who, l.owner, "not NFT owner");
        assert!(env::block_timestamp() < l.expiry, "expired");
        assert_eq!(amount(), l.repayment, "exact repayment required");
        let claim = self.new_claim(&l.lender, &who, l.repayment, 1);
        self.unlock(&mut l, 2);
        self.loans.insert(&loan_id.0, &l);
        self.burn_nft(loan_id.0, &who);
        U64(claim)
    }
    pub fn default_loan(&mut self, loan_id: U64) {
        let mut l = self.active(loan_id.0);
        assert!(env::block_timestamp() >= l.expiry, "not expired");
        let owner = l.owner.clone();
        self.unlock(&mut l, 3);
        self.loans.insert(&loan_id.0, &l);
        self.burn_nft(loan_id.0, &owner);
    }
    pub fn withdraw_claim(&mut self, claim_id: U64) -> Promise {
        Self::gas();
        let mut c = self.claims.get(&claim_id.0).expect("missing claim");
        assert_eq!(caller(), c.owner, "not claim owner");
        assert_eq!(c.state, 0, "claim not available");
        c.state = 1;
        c.attempt = self.id();
        self.claims_cash[c.kind as usize] = minus(self.claims_cash[c.kind as usize], c.amount);
        self.inflight = plus(self.inflight, c.amount);
        self.claims.insert(&claim_id.0, &c);
        Promise::new(c.owner.clone())
            .transfer(NearToken::from_yoctonear(c.amount))
            .then(Self::callback(
                "claim_result",
                json!({"claim_id":claim_id,"attempt":U64(c.attempt)}),
                GAS_CB,
            ))
    }
    #[private]
    pub fn claim_result(&mut self, claim_id: U64, attempt: U64) {
        assert_eq!(env::promise_results_count(), 1);
        let mut c = self.claims.get(&claim_id.0).expect("missing claim");
        if c.state != 1 || c.attempt != attempt.0 {
            return;
        }
        if env::promise_result_checked(0, 0).is_ok() {
            c.state = 3;
            self.inflight = minus(self.inflight, c.amount);
        } else {
            c.state = 2;
        }
        self.claims.insert(&claim_id.0, &c);
    }
    /// Only known transfer failure is retryable; unknown callback outcome stays locked.
    pub fn retry_failed_claim(&mut self, claim_id: U64) {
        let mut c = self.claims.get(&claim_id.0).expect("missing claim");
        assert_eq!(caller(), c.owner);
        assert_eq!(c.state, 2, "not a confirmed transfer failure");
        assert!(
            env::account_balance().as_yoctonear() >= plus(self.required(), self.inflight),
            "refund not locally available"
        );
        c.state = 0;
        self.inflight = minus(self.inflight, c.amount);
        self.claims_cash[c.kind as usize] = plus(self.claims_cash[c.kind as usize], c.amount);
        self.claims.insert(&claim_id.0, &c);
    }
    pub fn cleanup_claim(&mut self, claim_id: U64) {
        let c = self.claims.get(&claim_id.0).expect("missing claim");
        assert_eq!(c.state, 3, "unpaid claim");
        self.claims.remove(&claim_id.0);
        self.release(&c.payer, c.cost);
        self.refs(&c.owner, false);
    }
    pub fn cleanup_loan(&mut self, loan_id: U64) {
        let l = self.loans.get(&loan_id.0).expect("missing loan");
        assert!(l.state >= 2 && l.pending == 0, "live loan");
        self.loans.remove(&loan_id.0);
        self.release(&l.lender, l.cost);
    }
}
impl Contract {
    fn new_risk(&mut self) {
        assert!(!self.stopped, "new risk stopped");
        assert!(
            amount() > 0 && amount() <= self.limits.max_action.0,
            "native action cap"
        );
        self.gross = plus(self.gross, amount());
        assert!(self.gross <= self.limits.max_gross.0, "gross exposure cap");
    }
    fn token_key(token_id: &str) -> u64 {
        let n = token_id.parse::<u64>().expect("bad token id");
        assert_eq!(n.to_string(), token_id, "noncanonical token id");
        n
    }
    fn send_refund(&mut self, receiver: AccountId, n: u128) {
        if n == 0 {
            return;
        };
        Self::gas();
        let mut user = self.users.get(&receiver).unwrap_or_else(|| {
            assert!(self.admission_count < 128, "admission capacity exhausted");
            self.admission_count = self
                .admission_count
                .checked_add(1)
                .expect("admission overflow");
            let mut u = Self::empty_user();
            u.refund_state = 3;
            u
        });
        assert_eq!(user.refund, 0, "one pending refund per user");
        user.refund = n;
        if user.refund_state != 3 {
            user.refund_state = 1;
        }
        self.users.insert(&receiver, &user);
        let id = self.id();
        let before = env::storage_usage();
        self.refunds.insert(
            &id,
            &Refund {
                receiver: receiver.clone(),
                amount: n,
                state: 1,
                cost: 0,
            },
        );
        let cost = bytes_cost(env::storage_usage() - before);
        let mut r = self.refunds.get(&id).unwrap();
        r.cost = cost;
        self.refunds.insert(&id, &r);
        self.refund_storage = plus(self.refund_storage, cost);
        assert!(cost <= bytes_cost(256), "refund slot exceeds prepaid bound");
        assert!(
            plus(self.storage_total, self.operational) >= bytes_cost(env::storage_usage()),
            "refund storage coverage"
        );
        self.inflight = plus(self.inflight, n);
        Promise::new(receiver)
            .transfer(NearToken::from_yoctonear(n))
            .then(Self::callback(
                "storage_refund_result",
                json!({"refund_id":U64(id)}),
                GAS_CB,
            ))
            .detach();
    }
    fn empty_user() -> User {
        User {
            tokens: 0,
            total: 0,
            used: 0,
            base: 0,
            refs: 0,
            refund: 0,
            refund_nonce: 0,
            refund_state: 0,
        }
    }
    fn user(&self, a: &AccountId) -> User {
        let u = self.users.get(a).expect("unregistered");
        assert_ne!(u.refund_state, 3, "unregistration pending");
        u
    }
    fn one(&mut self) {
        near_sdk::assert_one_yocto();
        self.operational = plus(self.operational, 1);
    }
    fn gas() {
        assert!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(110).as_gas(),
            "attach at least 110 Tgas"
        );
        assert!(
            env::prepaid_gas()
                .as_gas()
                .saturating_sub(env::used_gas().as_gas())
                >= Gas::from_tgas(100).as_gas(),
            "insufficient remaining gas for receipt envelope"
        );
    }
    fn id(&mut self) -> u64 {
        let id = self.next;
        self.next = self.next.checked_add(1).expect("id overflow");
        id
    }
    fn charge(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.used = plus(u.used, n);
        assert!(u.total >= u.used, "insufficient prepaid storage");
        self.users.insert(a, &u);
    }
    fn release(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.used = minus(u.used, n);
        self.users.insert(a, &u);
    }
    fn refs(&mut self, a: &AccountId, up: bool) {
        let mut u = self.user(a);
        u.refs = if up {
            u.refs.checked_add(1)
        } else {
            u.refs.checked_sub(1)
        }
        .expect("reference overflow");
        self.users.insert(a, &u);
    }
    fn credit(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.tokens = plus(u.tokens, n);
        self.users.insert(a, &u);
    }
    fn debit(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.tokens = minus(u.tokens, n);
        self.users.insert(a, &u);
    }
    fn required(&self) -> u128 {
        let mut n = plus(
            plus(self.l, self.unused),
            plus(self.storage_total, self.operational),
        );
        for x in self.claims_cash {
            n = plus(n, x)
        }
        n
    }
    fn ft_log(from: &AccountId, to: &AccountId, n: u128) {
        event(
            "nep141",
            "1.0.0",
            "ft_transfer",
            json!({"old_owner_id":from,"new_owner_id":to,"amount":U128(n)}),
        );
    }
    fn move_ft(&mut self, from: &AccountId, to: &AccountId, n: u128) {
        assert!(n > 0 && from != to);
        assert_ne!(*from, env::current_account_id(), "escrow protected");
        assert_ne!(*to, env::current_account_id(), "use loan acceptance");
        self.debit(from, n);
        self.credit(to, n);
        Self::ft_log(from, to, n);
    }
    fn new_claim(&mut self, owner: &AccountId, payer: &AccountId, n: u128, kind: u8) -> u64 {
        assert!(n > 0);
        self.user(owner);
        let id = self.id();
        let mut c = Claim {
            owner: owner.clone(),
            payer: payer.clone(),
            amount: n,
            kind,
            state: 0,
            attempt: 0,
            cost: 0,
        };
        let before = env::storage_usage();
        self.claims.insert(&id, &c);
        c.cost = bytes_cost(env::storage_usage() - before);
        self.charge(payer, c.cost);
        self.refs(owner, true);
        self.claims.insert(&id, &c);
        self.claims_cash[kind as usize] = plus(self.claims_cash[kind as usize], n);
        id
    }
    fn new_call(&mut self, mut c: Call) -> u64 {
        let id = self.id();
        let before = env::storage_usage();
        self.calls.insert(&id, &c);
        c.cost = bytes_cost(env::storage_usage() - before);
        self.charge(&c.previous, c.cost);
        self.refs(&c.previous, true);
        self.refs(&c.receiver, true);
        self.calls.insert(&id, &c);
        id
    }
    fn finish_call(&mut self, id: u64, c: &Call) {
        self.calls.remove(&id);
        self.release(&c.previous, c.cost);
        self.refs(&c.previous, false);
        self.refs(&c.receiver, false);
    }
    fn move_nft(&mut self, id: u64, from: &AccountId, to: &AccountId) {
        assert_ne!(from, to);
        self.user(to);
        let mut l = self.loans.get(&id).expect("missing NFT");
        assert_eq!(l.state, 1);
        assert_eq!(*from, l.owner, "not NFT owner");
        self.refs(from, false);
        self.refs(to, true);
        l.owner = to.clone();
        self.loans.insert(&id, &l);
        event(
            "nep171",
            "1.2.0",
            "nft_transfer",
            json!({"old_owner_id":from,"new_owner_id":to,"token_ids":[id.to_string()]}),
        );
    }
    fn active(&self, id: u64) -> Loan {
        let l = self.loans.get(&id).expect("missing loan");
        assert_eq!(l.state, 1, "loan not active");
        assert_eq!(l.pending, 0, "NFT transfer pending");
        l
    }
    fn unlock(&mut self, l: &mut Loan, state: u8) {
        let receiver = if state == 2 { &l.owner } else { &l.lender };
        self.credit(receiver, l.collateral);
        self.locked = minus(self.locked, l.collateral);
        Self::ft_log(&env::current_account_id(), receiver, l.collateral);
        self.refs(&l.owner, false);
        self.refs(&l.lender, false);
        l.state = state;
    }
    fn burn_nft(&self, id: u64, owner: &AccountId) {
        event(
            "nep171",
            "1.2.0",
            "nft_burn",
            json!({"owner_id":owner,"token_ids":[id.to_string()]}),
        );
    }
    fn callback(method: &str, args: Value, gas: u64) -> Promise {
        let allocation = if cfg!(feature = "fault-injection") {
            Gas::from_gas(1_000_000_000)
        } else {
            Gas::from_tgas(gas)
        };
        Promise::new(env::current_account_id()).function_call_weight(
            method,
            near_sdk::serde_json::to_vec(&args).unwrap(),
            NearToken::from_yoctonear(0),
            allocation,
            GasWeight(0),
        )
    }
}
