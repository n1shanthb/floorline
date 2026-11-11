//! Isolated persistent adapter. No administrative action executor or upgrade.
use crate::{add, bootstrap, mint_quote, redeem_quote, sub, Config};
use near_sdk::base64::{engine::general_purpose::STANDARD, Engine as _};
use near_sdk::{
    collections::LookupMap,
    env, near,
    serde_json::{json, Value},
    AccountId, Gas, GasWeight, NearToken, PanicOnDefault, Promise, PromiseError,
};

// Reject noncanonical financial JSON before near-sdk erases its textual form.
macro_rules! decimal_json {
    ($name:ident,$inner:ty) => {
        #[derive(Clone, Copy)]
        pub struct $name(pub $inner);
        impl near_sdk::serde::Serialize for $name {
            fn serialize<S: near_sdk::serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                s.serialize_str(&self.0.to_string())
            }
        }
        impl<'de> near_sdk::serde::Deserialize<'de> for $name {
            fn deserialize<D: near_sdk::serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
                let text = <String as near_sdk::serde::Deserialize>::deserialize(d)?;
                let value = text
                    .parse::<$inner>()
                    .map_err(near_sdk::serde::de::Error::custom)?;
                if text != value.to_string() {
                    return Err(near_sdk::serde::de::Error::custom(
                        "noncanonical decimal string",
                    ));
                }
                Ok(Self(value))
            }
        }
    };
}
decimal_json!(U128, u128);
decimal_json!(U64, u64);

const EMPTY: u64 = u64::MAX;
#[cfg(not(feature = "fault-callback"))]
const CALLBACK_GAS: u64 = 30_000_000_000_000;
#[cfg(feature = "fault-callback")]
const CALLBACK_GAS: u64 = 1_000_000_000;
const RECEIVER_GAS: u64 = 50;
// Claim states: Available=0, InFlight=1, RefundPending=2, Paid=3.
#[near(serializers=[borsh])]
#[derive(Clone)]
struct User {
    tokens: u128,
    free: u128,
    used: u128,
    refs: u64,
    claims: u64,
    storage_slot: u64,
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
    pool: u8,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Call {
    sender: AccountId,
    receiver: AccountId,
    amount: u128,
    cost: u128,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct FloorKit {
    price: u128,
    markup: u16,
    tax: u16,
    fee: u16,
    creator: AccountId,
    metadata: ValueMetadata,
    r: u128,
    t: u128,
    f: u128,
    c: [u128; 5],
    h: u128,
    k: u128,
    o: u128,
    i: u128,
    closed: bool,
    next: u64,
    base_cost: u128,
    claim_cost: u128,
    call_cost: u128,
    pool: [u64; 8],
    users: LookupMap<AccountId, User>,
    claims: LookupMap<u64, Claim>,
    calls: LookupMap<u64, Call>,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct ValueMetadata {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub icon: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
}
fn plus(a: u128, b: u128) -> u128 {
    add(a, b).expect("overflow")
}
fn minus(a: u128, b: u128) -> u128 {
    sub(a, b).expect("insufficient balance")
}
fn attached() -> u128 {
    env::attached_deposit().as_yoctonear()
}
fn caller() -> AccountId {
    env::predecessor_account_id()
}
fn cost(bytes: u64) -> u128 {
    u128::from(bytes)
        .checked_mul(env::storage_byte_cost().as_yoctonear())
        .expect("storage overflow")
}
fn emit(standard: &str, event: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({"standard":standard,"version":"1.0.0","event":event,"data":[data]})
    ));
}
fn log(event: &str, data: Value) {
    emit("floorkit", event, data);
}
fn max_account() -> AccountId {
    "a".repeat(64).parse().unwrap()
}

#[near]
impl FloorKit {
    #[init]
    #[payable]
    pub fn new(
        metadata: ValueMetadata,
        initial_price: U128,
        markup_bps: u16,
        redemption_tax_bps: u16,
        creator_fee_bps: u16,
        creator_id: AccountId,
        bootstrap_recipient: AccountId,
        seed_reserve: U128,
        recipient_storage: U128,
        operational_reserve: U128,
    ) -> Self {
        let cfg = Config {
            initial_price: initial_price.0,
            markup_bps,
            tax_bps: redemption_tax_bps,
            creator_fee_bps,
        };
        cfg.validate().expect("invalid configuration");
        assert_ne!(creator_id, env::current_account_id(), "invalid creator");
        assert_ne!(
            bootstrap_recipient,
            env::current_account_id(),
            "invalid recipient"
        );
        assert!(
            metadata.spec == "ft-1.0.0" && metadata.decimals == 24,
            "metadata spec/decimals"
        );
        assert!(
            !metadata.name.is_empty()
                && metadata.name.len() <= 64
                && !metadata.symbol.is_empty()
                && metadata.symbol.len() <= 16,
            "metadata bounds"
        );
        // Minimal supported metadata: optional extensions deliberately bounded.
        assert!(
            metadata.icon.as_ref().map_or(true, |x| x.len() <= 2048),
            "icon bounds"
        );
        assert!(
            metadata.reference.as_ref().map_or(true, |x| x.len() <= 256),
            "reference bounds"
        );
        assert_eq!(
            metadata.reference.is_some(),
            metadata.reference_hash.is_some(),
            "reference pair"
        );
        // Base64-encoded SHA256 is 44 ASCII bytes. The hash is metadata, not authority.
        if let Some(h) = &metadata.reference_hash {
            let decoded = STANDARD.decode(h).expect("base64 reference hash");
            assert!(
                decoded.len() == 32 && STANDARD.encode(&decoded) == *h,
                "canonical SHA256 reference hash"
            );
        }
        assert_eq!(
            attached(),
            plus(
                seed_reserve.0,
                plus(recipient_storage.0, operational_reserve.0)
            ),
            "exact bootstrap allocation"
        );
        let supply = bootstrap(seed_reserve.0, &cfg).expect("bootstrap output");
        let mut s = Self {
            price: initial_price.0,
            markup: markup_bps,
            tax: redemption_tax_bps,
            fee: creator_fee_bps,
            creator: creator_id,
            metadata,
            r: seed_reserve.0,
            t: supply,
            f: 0,
            c: [0; 5],
            h: 0,
            k: 0,
            o: operational_reserve.0,
            i: 0,
            closed: false,
            next: 0,
            base_cost: 0,
            claim_cost: 0,
            call_cost: 0,
            pool: [EMPTY; 8],
            users: LookupMap::new(b"u"),
            claims: LookupMap::new(b"c"),
            calls: LookupMap::new(b"x"),
        };
        // Measure maximum serialized keys/values using actual persistent map writes.
        // Remove probes; reserve their maximum costs BEFORE any real allocation.
        let a = max_account();
        let before = env::storage_usage();
        s.users.insert(&a, &Self::empty_user());
        let user_bytes = env::storage_usage().checked_sub(before).unwrap();
        s.users.remove(&a);
        let c = Claim {
            owner: a.clone(),
            payer: a.clone(),
            amount: 1,
            kind: 0,
            state: 0,
            attempt: 0,
            cost: 0,
            pool: 0,
        };
        let before = env::storage_usage();
        s.claims.insert(&0, &c);
        let claim_bytes = env::storage_usage().checked_sub(before).unwrap();
        s.claims.remove(&0);
        let before = env::storage_usage();
        s.calls.insert(
            &0,
            &Call {
                sender: a.clone(),
                receiver: a,
                amount: 1,
                cost: 0,
            },
        );
        let call_bytes = env::storage_usage().checked_sub(before).unwrap();
        s.calls.remove(&0);
        s.claim_cost = cost(claim_bytes);
        s.call_cost = cost(call_bytes);
        // Base prepays one future per-user storage-withdrawal claim slot.
        s.base_cost = plus(cost(user_bytes), s.claim_cost);
        assert!(recipient_storage.0 >= s.base_cost, "bootstrap storage");
        let u = User {
            tokens: supply,
            free: minus(recipient_storage.0, s.base_cost),
            used: s.base_cost,
            ..Self::empty_user()
        };
        s.h = u.free;
        s.k = u.used;
        s.users.insert(&bootstrap_recipient, &u);
        let state_len = u64::try_from(borsh::to_vec(&s).unwrap().len()).unwrap();
        let required_ops = plus(
            cost(
                env::storage_usage()
                    .checked_add(state_len)
                    .unwrap()
                    .checked_add(4096)
                    .unwrap(),
            ),
            s.claim_cost.checked_mul(8).expect("pool overflow"),
        );
        assert!(
            s.o >= required_ops,
            "separate code/state/pool reserve required"
        );
        s.check();
        emit(
            "nep141",
            "ft_mint",
            json!({"owner_id":bootstrap_recipient,"amount":U128(supply),"memo":"bootstrap"}),
        );
        log(
            "bootstrap",
            json!({"reserve":seed_reserve,"supply":U128(supply),"recipient":bootstrap_recipient}),
        );
        s
    }
    pub fn get_config(&self) -> Value {
        json!({"initial_price":U128(self.price),"markup_bps":self.markup,"redemption_tax_bps":self.tax,"creator_fee_bps":self.fee,"creator_id":self.creator,"closed":self.closed,"refund_pool_capacity":8})
    }
    pub fn ft_metadata(&self) -> ValueMetadata {
        self.metadata.clone()
    }
    pub fn ft_total_supply(&self) -> U128 {
        U128(self.t)
    }
    pub fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        U128(self.users.get(&account_id).map_or(0, |u| u.tokens))
    }
    pub fn accounting(&self) -> Value {
        json!({"R":U128(self.r),"T":U128(self.t),"F":U128(self.f),"C":U128(self.available()),"claim_categories":self.c.map(U128),
            "H":U128(self.h),"K":U128(self.k),"O":U128(self.o),"I":U128(self.i),"P":U128(self.required()),"A":U128(Self::balance()),
            "storage_bytes":env::storage_usage(),"storage_stake":U128(cost(env::storage_usage())),"closed":self.closed,
            "backing":if self.t>0{Some(json!({"numerator":U128(self.r),"denominator":U128(self.t)}))}else{None},
            "base_storage":U128(self.base_cost),"claim_storage":U128(self.claim_cost),"ft_call_storage":U128(self.call_cost),
            "refund_pool_used":self.pool.iter().filter(|id|**id!=EMPTY).count()})
    }
    pub fn quote_mint(&self, deposit: U128) -> Value {
        match mint_quote(self.r, self.t, deposit.0, &self.cfg()) {
            Ok(q) => json!({"tokens":U128(q.tokens),"fee":U128(q.fee),"net":U128(q.net)}),
            Err(e) => json!({"error":format!("{e:?}")}),
        }
    }
    pub fn quote_redeem(&self, amount: U128) -> Value {
        match redeem_quote(self.r, self.t, amount.0, &self.cfg()) {
            Ok(q) => json!({"near":U128(q)}),
            Err(e) => json!({"error":format!("{e:?}")}),
        }
    }
    pub fn get_claim(&self, claim_id: U64) -> Option<Value> {
        self.claims.get(&claim_id.0).map(|c|json!({"owner":c.owner,"payer":c.payer,"amount":U128(c.amount),"kind":c.kind,"state":(["available","inflight","refund_pending","paid"][c.state as usize]),"attempt_id":U64(c.attempt),"storage_cost":U128(c.cost)}))
    }
    pub fn get_pending_ft_call(&self, call_id: U64) -> Option<Value> {
        self.calls.get(&call_id.0).map(|c|json!({"sender":c.sender,"receiver":c.receiver,"amount":U128(c.amount),"storage_cost":U128(c.cost)}))
    }
    #[payable]
    pub fn mint(&mut self, min_tokens: U128, deadline_ns: U64) -> U128 {
        self.active();
        Self::deadline(deadline_ns.0);
        let a = caller();
        let mut u = self.user(&a);
        let q = mint_quote(self.r, self.t, attached(), &self.cfg()).expect("invalid mint");
        assert!(q.tokens >= min_tokens.0, "mint slippage");
        self.r = plus(self.r, q.net);
        self.t = plus(self.t, q.tokens);
        self.f = plus(self.f, q.fee);
        u.tokens = plus(u.tokens, q.tokens);
        self.users.insert(&a, &u);
        self.check();
        emit(
            "nep141",
            "ft_mint",
            json!({"owner_id":a,"amount":U128(q.tokens)}),
        );
        log(
            "mint_quote_execution",
            json!({"owner":a,"deposit":U128(attached()),"net":U128(q.net),"fee":U128(q.fee),"tokens":U128(q.tokens)}),
        );
        if q.fee > 0 {
            log("creator_fee_accrued", json!({"amount":U128(q.fee)}));
        }
        U128(q.tokens)
    }
    #[payable]
    pub fn redeem(&mut self, amount: U128, min_near: U128, deadline_ns: U64) -> U64 {
        self.active();
        Self::deadline(deadline_ns.0);
        self.one();
        let a = caller();
        let mut u = self.user(&a);
        assert!(amount.0 > 0 && amount.0 <= u.tokens, "available tokens");
        let q = redeem_quote(self.r, self.t, amount.0, &self.cfg()).unwrap();
        assert!(q > 0 && q >= min_near.0, "zero/slippage redemption");
        u.tokens = minus(u.tokens, amount.0);
        self.users.insert(&a, &u);
        self.r = minus(self.r, q);
        self.t = minus(self.t, amount.0);
        let id = self.new_claim(a.clone(), q, 0, a.clone(), false);
        if self.t == 0 {
            assert_eq!(self.r, 0);
            self.closed = true;
            log("terminal_closed", json!({"final_claim":U64(id)}));
        }
        self.check();
        emit("nep141", "ft_burn", json!({"owner_id":a,"amount":amount}));
        log(
            "redemption_claim",
            json!({"claim_id":U64(id),"owner":a,"amount":U128(q)}),
        );
        U64(id)
    }
    #[payable]
    pub fn contribute(&mut self) {
        self.active();
        assert!(attached() > 0, "positive contribution");
        self.r = plus(self.r, attached());
        self.check();
        log(
            "contribution",
            json!({"sender":caller(),"amount":U128(attached())}),
        );
    }
    #[payable]
    pub fn claim_creator_fees(&mut self, amount: U128) -> U64 {
        self.one();
        assert_eq!(caller(), self.creator, "creator only");
        assert!(amount.0 > 0 && amount.0 <= self.f, "earned fees only");
        self.f = minus(self.f, amount.0);
        let id = self.new_claim(caller(), amount.0, 1, caller(), false);
        self.check();
        U64(id)
    }
    #[payable]
    pub fn withdraw_claim(&mut self, claim_id: U64) -> Promise {
        self.one();
        let c = self.claims.get(&claim_id.0).expect("claim missing");
        assert_eq!(c.owner, caller(), "claim owner");
        let p = self.dispatch(claim_id.0);
        self.check();
        p
    }
    #[private]
    pub fn on_native_result(&mut self, claim_id: U64, attempt_id: U64) {
        assert_eq!(env::promise_results_count(), 1, "one promise result");
        let mut c = self.claims.get(&claim_id.0).expect("claim missing");
        assert!(
            c.state == 1 && c.attempt == attempt_id.0,
            "duplicate/stale callback"
        );
        let success = match env::promise_result_checked(0, 0) {
            Ok(_) => true,
            Err(PromiseError::Failed) => false,
            Err(_) => env::panic_str("unexpected native result; remain unresolved"),
        };
        if success {
            c.state = 3;
            self.i = minus(self.i, c.amount);
        } else {
            c.state = 2;
        }
        self.claims.insert(&claim_id.0, &c);
        self.check();
        log(
            "claim_result",
            json!({"claim_id":claim_id,"attempt_id":attempt_id,"state":if success{"paid"}else{"refund_pending"}}),
        );
    }
    #[payable]
    pub fn retry_failed_claim(&mut self, claim_id: U64) {
        self.one();
        let mut c = self.claims.get(&claim_id.0).expect("claim missing");
        assert!(
            c.owner == caller() && c.state == 2,
            "known failed owner only"
        );
        assert!(
            Self::balance() >= plus(self.required(), self.i),
            "refund/cushion unavailable"
        );
        self.i = minus(self.i, c.amount);
        self.c[c.kind as usize] = plus(self.c[c.kind as usize], c.amount);
        c.state = 0;
        self.claims.insert(&claim_id.0, &c);
        self.check();
        log("claim_restored", json!({"claim_id":claim_id}));
    }
    pub fn cleanup_claim(&mut self, claim_id: U64) {
        let c = self.claims.get(&claim_id.0).expect("claim missing");
        assert_eq!(c.state, 3, "paid only");
        if c.pool < 8 {
            assert_eq!(self.pool[c.pool as usize], claim_id.0);
            self.pool[c.pool as usize] = EMPTY;
        } else {
            let mut u = self.user(&c.payer);
            u.claims = u.claims.checked_sub(1).expect("claim refs");
            if c.kind == 2 {
                assert_eq!(u.storage_slot, claim_id.0);
                u.storage_slot = EMPTY;
            }
            self.users.insert(&c.payer, &u);
            if c.cost > 0 {
                self.release(&c.payer, c.cost);
            }
        }
        self.claims.remove(&claim_id.0);
        self.check();
    }
    pub fn storage_balance_bounds(&self) -> Value {
        json!({"min":U128(self.base_cost),"max":null})
    }
    pub fn storage_balance_of(&self, account_id: AccountId) -> Option<Value> {
        self.users
            .get(&account_id)
            .map(|u| json!({"total":U128(plus(u.free,u.used)),"available":U128(u.free)}))
    }
    #[payable]
    pub fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> Value {
        let a = account_id.unwrap_or_else(caller);
        assert_ne!(a, env::current_account_id(), "contract cannot register");
        assert!(attached() > 0, "positive storage deposit");
        let old = self.users.get(&a);
        let exists = old.is_some();
        let only = registration_only.unwrap_or(false);
        let retained = if exists && only {
            0
        } else if only {
            self.base_cost
        } else {
            attached()
        };
        assert!(attached() >= retained, "storage minimum");
        let mut u = old.unwrap_or_else(Self::empty_user);
        if !exists {
            assert!(retained >= self.base_cost, "storage minimum");
            u.used = self.base_cost;
            u.free = minus(retained, self.base_cost);
            self.k = plus(self.k, u.used);
            self.h = plus(self.h, u.free);
        } else {
            u.free = plus(u.free, retained);
            self.h = plus(self.h, retained);
        }
        self.users.insert(&a, &u);
        let excess = minus(attached(), retained);
        if excess > 0 {
            let id = self.new_claim(caller(), excess, 4, caller(), true);
            self.dispatch(id).detach();
            log(
                "storage_refund",
                json!({"claim_id":U64(id),"amount":U128(excess)}),
            );
        }
        self.check();
        self.storage_balance_of(a).unwrap()
    }
    #[payable]
    pub fn storage_withdraw(&mut self, amount: Option<U128>) -> Value {
        self.one();
        let a = caller();
        let mut u = self.user(&a);
        let n = amount.map_or(u.free, |v| v.0);
        assert!(n <= u.free, "free storage credit");
        if n > 0 {
            assert_eq!(u.storage_slot, EMPTY, "storage refund slot busy");
            u.free = minus(u.free, n);
            self.h = minus(self.h, n);
            self.users.insert(&a, &u);
            let id = self.new_claim(a.clone(), n, 2, a.clone(), false);
            self.dispatch(id).detach();
        }
        self.check();
        self.storage_balance_of(a).unwrap()
    }
    #[payable]
    pub fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.one();
        let a = caller();
        let Some(u) = self.users.get(&a) else {
            self.check();
            return false;
        };
        let _ = force;
        assert!(
            u.tokens == 0 && u.refs == 0 && u.claims == 0 && u.used == self.base_cost,
            "live rights remain; force burning unsupported"
        );
        for id in self.pool {
            if id != EMPTY {
                assert_ne!(
                    self.claims.get(&id).unwrap().owner,
                    a,
                    "pooled claim rights remain"
                );
            }
        }
        self.h = minus(self.h, u.free);
        self.k = minus(self.k, u.used);
        self.users.remove(&a);
        let id = self.new_claim(a.clone(), plus(u.free, u.used), 3, a, true);
        self.dispatch(id).detach();
        self.check();
        true
    }
    #[payable]
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.one();
        Self::memo(&memo);
        self.move_tokens(&caller(), &receiver_id, amount.0);
        self.check();
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
        Self::gas(150);
        Self::memo(&memo);
        assert!(msg.len() <= 1024, "message bounds");
        let sender = caller();
        self.move_tokens(&sender, &receiver_id, amount.0);
        self.charge(&sender, self.call_cost);
        self.refs(&sender, true);
        self.refs(&receiver_id, true);
        let id = self.id();
        self.calls.insert(
            &id,
            &Call {
                sender: sender.clone(),
                receiver: receiver_id.clone(),
                amount: amount.0,
                cost: self.call_cost,
            },
        );
        self.check();
        Promise::new(receiver_id)
            .function_call_weight(
                "ft_on_transfer",
                near_sdk::serde_json::to_vec(
                    &json!({"sender_id":sender,"amount":amount,"msg":msg}),
                )
                .unwrap(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(RECEIVER_GAS),
                GasWeight(0),
            )
            .then(Self::callback(
                "ft_resolve_transfer",
                json!({"call_id":U64(id)}),
            ))
    }
    #[private]
    pub fn ft_resolve_transfer(&mut self, call_id: U64) -> U128 {
        assert_eq!(env::promise_results_count(), 1);
        let c = self.calls.get(&call_id.0).expect("resolved/missing call");
        let wanted = match env::promise_result_checked(0, 128) {
            Ok(bytes) => near_sdk::serde_json::from_slice::<U128>(&bytes)
                .map_or(c.amount, |v| v.0.min(c.amount)),
            _ => c.amount,
        };
        let mut target = self.user(&c.receiver);
        let refunded = wanted.min(target.tokens);
        target.tokens = minus(target.tokens, refunded);
        self.users.insert(&c.receiver, &target);
        let mut source = self.user(&c.sender);
        source.tokens = plus(source.tokens, refunded);
        self.users.insert(&c.sender, &source);
        self.refs(&c.sender, false);
        self.refs(&c.receiver, false);
        self.release(&c.sender, c.cost);
        self.calls.remove(&call_id.0);
        self.check();
        if refunded > 0 {
            emit(
                "nep141",
                "ft_transfer",
                json!({"old_owner_id":c.receiver,"new_owner_id":c.sender,"amount":U128(refunded),"memo":"refund"}),
            );
        }
        U128(minus(c.amount, refunded))
    }
}

impl FloorKit {
    fn cfg(&self) -> Config {
        Config {
            initial_price: self.price,
            markup_bps: self.markup,
            tax_bps: self.tax,
            creator_fee_bps: self.fee,
        }
    }
    fn empty_user() -> User {
        User {
            tokens: 0,
            free: 0,
            used: 0,
            refs: 0,
            claims: 0,
            storage_slot: EMPTY,
        }
    }
    fn user(&self, a: &AccountId) -> User {
        self.users.get(a).expect("registration required")
    }
    fn active(&self) {
        assert!(
            !self.closed && self.r > 0 && self.t > 0,
            "permanently closed"
        );
    }
    fn deadline(deadline: u64) {
        assert!(env::block_timestamp() <= deadline, "expired quote");
    }
    fn one(&mut self) {
        near_sdk::assert_one_yocto();
        self.o = plus(self.o, 1);
    }
    fn balance() -> u128 {
        plus(
            env::account_balance().as_yoctonear(),
            env::account_locked_balance().as_yoctonear(),
        )
    }
    fn available(&self) -> u128 {
        self.c.iter().fold(0, |a, b| plus(a, *b))
    }
    fn required(&self) -> u128 {
        [self.r, self.available(), self.f, self.h, self.k, self.o]
            .iter()
            .fold(0, |a, b| plus(a, *b))
    }
    fn check(&self) {
        assert!(Self::balance() >= self.required(), "native solvency");
        // Include pending serialized STATE bytes conservatively. Actual runtime
        // storage measurement remains mandatory; this is not a gas benchmark.
        let extra = u64::try_from(borsh::to_vec(self).unwrap().len()).unwrap();
        assert!(
            cost(
                env::storage_usage()
                    .checked_add(extra)
                    .unwrap()
                    .checked_add(128)
                    .unwrap()
            ) <= plus(self.k, self.o),
            "storage stake coverage"
        );
        assert!(
            (self.closed && self.r == 0 && self.t == 0)
                || (!self.closed && self.r > 0 && self.t > 0),
            "closure invariant"
        );
    }
    fn id(&mut self) -> u64 {
        let id = self.next;
        self.next = self.next.checked_add(1).expect("id exhausted");
        id
    }
    fn charge(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.free = minus(u.free, n);
        u.used = plus(u.used, n);
        self.h = minus(self.h, n);
        self.k = plus(self.k, n);
        self.users.insert(a, &u);
    }
    fn release(&mut self, a: &AccountId, n: u128) {
        let mut u = self.user(a);
        u.used = minus(u.used, n);
        u.free = plus(u.free, n);
        self.k = minus(self.k, n);
        self.h = plus(self.h, n);
        self.users.insert(a, &u);
    }
    fn refs(&mut self, a: &AccountId, up: bool) {
        let mut u = self.user(a);
        u.refs = if up {
            u.refs.checked_add(1)
        } else {
            u.refs.checked_sub(1)
        }
        .expect("refs overflow");
        self.users.insert(a, &u);
    }
    fn new_claim(
        &mut self,
        owner: AccountId,
        n: u128,
        kind: u8,
        payer: AccountId,
        pooled: bool,
    ) -> u64 {
        assert!(n > 0);
        let id = self.id();
        let mut pool = 8;
        let allocation = if kind < 2 { self.claim_cost } else { 0 };
        if pooled {
            pool = u8::try_from(
                self.pool
                    .iter()
                    .position(|id| *id == EMPTY)
                    .expect("operational refund pool full"),
            )
            .unwrap();
            self.pool[pool as usize] = id;
        } else {
            if allocation > 0 {
                self.charge(&payer, allocation);
            }
            let mut u = self.user(&payer);
            u.claims = u.claims.checked_add(1).expect("claims overflow");
            if kind == 2 {
                assert_eq!(u.storage_slot, EMPTY);
                u.storage_slot = id;
            }
            self.users.insert(&payer, &u);
        }
        self.claims.insert(
            &id,
            &Claim {
                owner,
                payer,
                amount: n,
                kind,
                state: 0,
                attempt: 0,
                cost: allocation,
                pool,
            },
        );
        self.c[kind as usize] = plus(self.c[kind as usize], n);
        id
    }
    fn dispatch(&mut self, id: u64) -> Promise {
        Self::gas(150);
        let mut c = self.claims.get(&id).expect("claim missing");
        assert_eq!(c.state, 0, "claim unavailable");
        let nonce = self.id();
        c.state = 1;
        c.attempt = nonce;
        self.c[c.kind as usize] = minus(self.c[c.kind as usize], c.amount);
        self.i = plus(self.i, c.amount);
        self.claims.insert(&id, &c);
        log(
            "claim_dispatched",
            json!({"claim_id":U64(id),"attempt_id":U64(nonce),"owner":c.owner,"amount":U128(c.amount)}),
        );
        Promise::new(c.owner)
            .transfer(NearToken::from_yoctonear(c.amount))
            .then(Self::callback(
                "on_native_result",
                json!({"claim_id":U64(id),"attempt_id":U64(nonce)}),
            ))
    }
    fn callback(name: &str, args: Value) -> Promise {
        Promise::new(env::current_account_id()).function_call_weight(
            name,
            near_sdk::serde_json::to_vec(&args).unwrap(),
            NearToken::from_yoctonear(0),
            Gas::from_gas(CALLBACK_GAS),
            GasWeight(0),
        )
    }
    fn gas(tgas: u64) {
        assert!(
            env::prepaid_gas() >= Gas::from_tgas(tgas),
            "insufficient prepaid gas"
        );
    }
    fn memo(memo: &Option<String>) {
        assert!(
            memo.as_ref().map_or(true, |m| m.len() <= 256),
            "memo bounds"
        );
    }
    fn move_tokens(&mut self, from: &AccountId, to: &AccountId, n: u128) {
        assert!(n > 0 && from != to, "invalid transfer");
        let mut a = self.user(from);
        let mut b = self.user(to);
        a.tokens = minus(a.tokens, n);
        b.tokens = plus(b.tokens, n);
        self.users.insert(from, &a);
        self.users.insert(to, &b);
        emit(
            "nep141",
            "ft_transfer",
            json!({"old_owner_id":from,"new_owner_id":to,"amount":U128(n)}),
        );
    }
}
