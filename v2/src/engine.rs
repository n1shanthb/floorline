use crate::math::{narrow, wide};
use crate::{backing_not_lower, redemption_quote};
use std::collections::BTreeMap;
pub type Account = u32;
pub type Id = u64;
pub type Result<T> = std::result::Result<T, Error>;
/// Reserved internal callback authority. Never register as an end user.
pub const CALLBACK: Account = 0;
pub const ACCOUNT_STORAGE: u128 = 4;
pub const OFFER_STORAGE: u128 = 4;
pub const CLAIM_STORAGE: u128 = 2;
pub const WITHDRAWAL_STORAGE: u128 = 2;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    Overflow,
    InvalidAmount,
    Unregistered,
    Unauthorized,
    InsufficientTokens,
    InsufficientStorage,
    Missing,
    WrongState,
    Dilution,
    ZeroSupply,
    Dust,
    Slippage,
    Expired,
    NotExpired,
    TransferPending,
    TimeReversed,
    Invariant,
    InvalidConfig,
}
fn add(a: u128, b: u128) -> Result<u128> {
    a.checked_add(b).ok_or(Error::Overflow)
}
fn sub(a: u128, b: u128) -> Result<u128> {
    a.checked_sub(b).ok_or(Error::InvalidAmount)
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Config {
    pub tax_bps: u16,
    pub issuance_numerator: u128,
    pub issuance_denominator: u128,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct AccountState {
    pub available: u128,
    pub storage_free: u128,
    pub storage_used: u128,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Terms {
    pub principal: u128,
    pub repayment: u128,
    pub collateral: u128,
    pub duration_ns: u64,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Transfer {
    pub previous: Account,
    pub receiver: Account,
    pub nonce: Id,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub enum LoanState {
    Funded,
    Active {
        owner: Account,
        borrower: Account,
        expiry: u64,
        pending: Option<Transfer>,
    },
    Repaid,
    Defaulted,
    Cancelled,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Offer {
    pub lender: Account,
    pub terms: Terms,
    pub state: LoanState,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub enum ClaimKind {
    Redemption,
    Borrower,
    LenderRepayment,
    OfferCancellation,
    StorageRefund,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub enum ClaimState {
    Available,
    InFlight { attempt: Id },
    AwaitRefund { attempt: Id },
    Paid,
}
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Claim {
    pub owner: Account,
    pub amount: u128,
    pub kind: ClaimKind,
    pub state: ClaimState,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Cash {
    pub local: u128,
    pub backing: u128,
    pub unused_lender: u128,
    pub borrower_claims: u128,
    pub lender_claims: u128,
    pub other_claims: u128,
    pub storage_free: u128,
    pub storage_locked: u128,
    pub operational: u128,
    pub in_flight: u128,
}
/// Clone/validate/commit models receipt rollback. Storage uses MODEL units, not NEAR bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    target_arch = "wasm32",
    derive(borsh::BorshSerialize, borsh::BorshDeserialize)
)]
pub struct Engine {
    config: Config,
    local: u128,
    backing: u128,
    supply: u128,
    operational: u128,
    now: u64,
    next_id: Id,
    next_nonce: Id,
    accounts: BTreeMap<Account, AccountState>,
    offers: BTreeMap<Id, Offer>,
    claims: BTreeMap<Id, Claim>,
}
impl Engine {
    pub fn new(config: Config) -> Result<Self> {
        if config.tax_bps >= 10000
            || config.issuance_numerator == 0
            || config.issuance_denominator == 0
        {
            return Err(Error::InvalidConfig);
        }
        Ok(Self {
            config,
            local: 0,
            backing: 0,
            supply: 0,
            operational: 0,
            now: 0,
            next_id: 0,
            next_nonce: 0,
            accounts: BTreeMap::new(),
            offers: BTreeMap::new(),
            claims: BTreeMap::new(),
        })
    }
    pub fn config(&self) -> &Config {
        &self.config
    }
    pub fn backing(&self) -> u128 {
        self.backing
    }
    pub fn supply(&self) -> u128 {
        self.supply
    }
    pub fn now(&self) -> u64 {
        self.now
    }
    pub fn accounts(&self) -> &BTreeMap<Account, AccountState> {
        &self.accounts
    }
    pub fn offers(&self) -> &BTreeMap<Id, Offer> {
        &self.offers
    }
    pub fn claims(&self) -> &BTreeMap<Id, Claim> {
        &self.claims
    }
    fn atomic<T>(&mut self, f: impl FnOnce(&mut Self) -> Result<T>) -> Result<T> {
        let mut next = self.clone();
        let value = f(&mut next)?;
        next.check()?;
        if !backing_not_lower(self.backing, self.supply, next.backing, next.supply) {
            return Err(Error::Invariant);
        }
        *self = next;
        Ok(value)
    }
    fn user(&self, who: Account) -> Result<()> {
        if who == CALLBACK {
            return Err(Error::Unauthorized);
        };
        if !self.accounts.contains_key(&who) {
            return Err(Error::Unregistered);
        };
        Ok(())
    }
    fn callback(who: Account) -> Result<()> {
        if who != CALLBACK {
            Err(Error::Unauthorized)
        } else {
            Ok(())
        }
    }
    fn charge(&mut self, who: Account, n: u128) -> Result<()> {
        self.user(who)?;
        let a = self.accounts.get_mut(&who).unwrap();
        a.storage_free = a
            .storage_free
            .checked_sub(n)
            .ok_or(Error::InsufficientStorage)?;
        a.storage_used = add(a.storage_used, n)?;
        Ok(())
    }
    fn credit(&mut self, who: Account, n: u128) -> Result<()> {
        self.user(who)?;
        let a = self.accounts.get_mut(&who).unwrap();
        a.available = add(a.available, n)?;
        Ok(())
    }
    fn debit(&mut self, who: Account, n: u128) -> Result<()> {
        self.user(who)?;
        let a = self.accounts.get_mut(&who).unwrap();
        a.available = a
            .available
            .checked_sub(n)
            .ok_or(Error::InsufficientTokens)?;
        Ok(())
    }
    fn id(&mut self) -> Result<Id> {
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).ok_or(Error::Overflow)?;
        Ok(id)
    }
    fn nonce(&mut self) -> Result<Id> {
        let id = self.next_nonce;
        self.next_nonce = self.next_nonce.checked_add(1).ok_or(Error::Overflow)?;
        Ok(id)
    }
    fn claim(
        &mut self,
        owner: Account,
        amount: u128,
        kind: ClaimKind,
        payer: Account,
    ) -> Result<Id> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        };
        self.user(owner)?;
        self.charge(payer, CLAIM_STORAGE)?;
        let id = self.id()?;
        self.claims.insert(
            id,
            Claim {
                owner,
                amount,
                kind,
                state: ClaimState::Available,
            },
        );
        Ok(id)
    }
    pub fn storage_deposit(&mut self, caller: Account, attached: u128) -> Result<()> {
        self.atomic(|s| {
            if caller == CALLBACK {
                return Err(Error::Unauthorized);
            };
            if attached == 0 {
                return Err(Error::InvalidAmount);
            };
            if let Some(a) = s.accounts.get_mut(&caller) {
                a.storage_free = add(a.storage_free, attached)?
            } else {
                let free = attached
                    .checked_sub(ACCOUNT_STORAGE)
                    .ok_or(Error::InsufficientStorage)?;
                s.accounts.insert(
                    caller,
                    AccountState {
                        available: 0,
                        storage_free: free,
                        storage_used: ACCOUNT_STORAGE,
                    },
                );
            };
            s.local = add(s.local, attached)?;
            Ok(())
        })
    }
    pub fn storage_withdraw(&mut self, caller: Account, amount: u128) -> Result<Id> {
        self.atomic(|s| {
            s.user(caller)?;
            let a = s.accounts.get_mut(&caller).unwrap();
            a.storage_free = a
                .storage_free
                .checked_sub(amount)
                .ok_or(Error::InsufficientStorage)?;
            s.claim(caller, amount, ClaimKind::StorageRefund, caller)
        })
    }
    pub fn fund_operational(&mut self, caller: Account, attached: u128) -> Result<()> {
        self.atomic(|s| {
            s.user(caller)?;
            if attached == 0 {
                return Err(Error::InvalidAmount);
            };
            s.local = add(s.local, attached)?;
            s.operational = add(s.operational, attached)?;
            Ok(())
        })
    }
    /// Immutable issuance weight. No arbitrary minted amount or admin bypass.
    pub fn issue(&mut self, caller: Account, net_deposit: u128, min_tokens: u128) -> Result<u128> {
        self.atomic(|s| {
            s.user(caller)?;
            if net_deposit == 0 {
                return Err(Error::InvalidAmount);
            };
            let minted = narrow(
                wide(net_deposit) * wide(s.config.issuance_numerator)
                    / wide(s.config.issuance_denominator),
            )?;
            if minted == 0 {
                return Err(Error::Dust);
            };
            if minted < min_tokens {
                return Err(Error::Slippage);
            };
            if s.supply > 0 && wide(net_deposit) * wide(s.supply) < wide(s.backing) * wide(minted) {
                return Err(Error::Dilution);
            };
            s.local = add(s.local, net_deposit)?;
            s.backing = add(s.backing, net_deposit)?;
            s.supply = add(s.supply, minted)?;
            s.credit(caller, minted)?;
            Ok(minted)
        })
    }
    pub fn contribute(&mut self, caller: Account, attached: u128) -> Result<()> {
        self.atomic(|s| {
            s.user(caller)?;
            if s.supply == 0 {
                return Err(Error::ZeroSupply);
            };
            if attached == 0 {
                return Err(Error::InvalidAmount);
            };
            s.local = add(s.local, attached)?;
            s.backing = add(s.backing, attached)?;
            Ok(())
        })
    }
    pub fn quote(&self, amount: u128) -> Result<u128> {
        redemption_quote(self.backing, self.supply, amount, self.config.tax_bps)
    }
    pub fn redeem(&mut self, caller: Account, amount: u128, min_out: u128) -> Result<Id> {
        self.atomic(|s| {
            let n = s.quote(amount)?;
            if n == 0 {
                return Err(Error::Dust);
            };
            if n < min_out {
                return Err(Error::Slippage);
            };
            s.debit(caller, amount)?;
            s.supply = sub(s.supply, amount)?;
            s.backing = sub(s.backing, n)?;
            s.claim(caller, n, ClaimKind::Redemption, caller)
        })
    }
    pub fn transfer_floor(&mut self, caller: Account, to: Account, amount: u128) -> Result<()> {
        self.atomic(|s| {
            if amount == 0 || caller == to {
                return Err(Error::InvalidAmount);
            };
            s.debit(caller, amount)?;
            s.credit(to, amount)
        })
    }
    pub fn fund_offer(&mut self, caller: Account, terms: Terms, attached: u128) -> Result<Id> {
        self.atomic(|s| {
            s.user(caller)?;
            if terms.principal == 0
                || terms.repayment < terms.principal
                || terms.collateral == 0
                || terms.duration_ns == 0
                || attached != terms.principal
            {
                return Err(Error::InvalidAmount);
            };
            s.charge(caller, OFFER_STORAGE)?;
            let id = s.id()?;
            s.local = add(s.local, attached)?;
            s.offers.insert(
                id,
                Offer {
                    lender: caller,
                    terms,
                    state: LoanState::Funded,
                },
            );
            Ok(id)
        })
    }
    pub fn cancel_offer(&mut self, caller: Account, id: Id) -> Result<Id> {
        self.atomic(|s| {
            let o = s.offers.get(&id).ok_or(Error::Missing)?.clone();
            if o.lender != caller {
                return Err(Error::Unauthorized);
            };
            if o.state != LoanState::Funded {
                return Err(Error::WrongState);
            };
            s.offers.get_mut(&id).unwrap().state = LoanState::Cancelled;
            s.claim(
                caller,
                o.terms.principal,
                ClaimKind::OfferCancellation,
                caller,
            )
        })
    }
    pub fn accept_offer(&mut self, caller: Account, id: Id) -> Result<(Id, Id)> {
        self.atomic(|s| {
            let o = s.offers.get(&id).ok_or(Error::Missing)?.clone();
            if o.state != LoanState::Funded {
                return Err(Error::WrongState);
            };
            s.debit(caller, o.terms.collateral)?;
            let expiry = s
                .now
                .checked_add(o.terms.duration_ns)
                .ok_or(Error::Overflow)?;
            let claim = s.claim(caller, o.terms.principal, ClaimKind::Borrower, caller)?;
            s.offers.get_mut(&id).unwrap().state = LoanState::Active {
                owner: caller,
                borrower: caller,
                expiry,
                pending: None,
            };
            Ok((id, claim))
        })
    }
    fn active(&self, id: Id) -> Result<(Offer, Account, u64)> {
        let o = self.offers.get(&id).ok_or(Error::Missing)?.clone();
        match o.state {
            LoanState::Active {
                owner,
                expiry,
                ref pending,
                ..
            } => {
                if pending.is_some() {
                    return Err(Error::TransferPending);
                };
                Ok((o.clone(), owner, expiry))
            }
            _ => Err(Error::WrongState),
        }
    }
    pub fn nft_owner(&self, id: Id) -> Option<Account> {
        match self.offers.get(&id)?.state {
            LoanState::Active { owner, .. } => Some(owner),
            _ => None,
        }
    }
    pub fn transfer_nft(&mut self, caller: Account, id: Id, to: Account) -> Result<()> {
        self.atomic(|s| {
            s.user(to)?;
            let (_, owner, _) = s.active(id)?;
            if caller != owner {
                return Err(Error::Unauthorized);
            };
            if caller == to {
                return Err(Error::InvalidAmount);
            };
            if let LoanState::Active { owner, .. } = &mut s.offers.get_mut(&id).unwrap().state {
                *owner = to
            };
            Ok(())
        })
    }
    pub fn begin_nft_transfer(&mut self, caller: Account, id: Id, to: Account) -> Result<Id> {
        self.atomic(|s| {
            s.user(to)?;
            let (_, owner, _) = s.active(id)?;
            if caller != owner {
                return Err(Error::Unauthorized);
            };
            if caller == to {
                return Err(Error::InvalidAmount);
            };
            let nonce = s.nonce()?;
            if let LoanState::Active { owner, pending, .. } =
                &mut s.offers.get_mut(&id).unwrap().state
            {
                *owner = to;
                *pending = Some(Transfer {
                    previous: caller,
                    receiver: to,
                    nonce,
                });
            };
            Ok(nonce)
        })
    }
    pub fn resolve_nft_transfer(
        &mut self,
        caller: Account,
        id: Id,
        nonce: Id,
        accepted: bool,
    ) -> Result<()> {
        self.atomic(|s| {
            Self::callback(caller)?;
            let o = s.offers.get_mut(&id).ok_or(Error::Missing)?;
            if let LoanState::Active { owner, pending, .. } = &mut o.state {
                let p = pending.as_ref().ok_or(Error::WrongState)?;
                if p.nonce != nonce {
                    return Err(Error::WrongState);
                };
                if !accepted {
                    *owner = p.previous
                };
                *pending = None;
                Ok(())
            } else {
                Err(Error::WrongState)
            }
        })
    }
    pub fn repay(&mut self, caller: Account, id: Id, attached: u128) -> Result<Id> {
        self.atomic(|s| {
            let (o, owner, expiry) = s.active(id)?;
            if caller != owner {
                return Err(Error::Unauthorized);
            };
            if s.now >= expiry {
                return Err(Error::Expired);
            };
            if attached != o.terms.repayment {
                return Err(Error::InvalidAmount);
            };
            s.local = add(s.local, attached)?;
            let claim = s.claim(o.lender, attached, ClaimKind::LenderRepayment, caller)?;
            s.credit(owner, o.terms.collateral)?;
            s.offers.get_mut(&id).unwrap().state = LoanState::Repaid;
            Ok(claim)
        })
    }
    pub fn default_loan(&mut self, caller: Account, id: Id) -> Result<()> {
        self.atomic(|s| {
            s.user(caller)?;
            let (o, _, expiry) = s.active(id)?;
            if s.now < expiry {
                return Err(Error::NotExpired);
            };
            s.credit(o.lender, o.terms.collateral)?;
            s.offers.get_mut(&id).unwrap().state = LoanState::Defaulted;
            Ok(())
        })
    }
    pub fn advance_time(&mut self, now: u64) -> Result<()> {
        self.atomic(|s| {
            if now < s.now {
                return Err(Error::TimeReversed);
            };
            s.now = now;
            Ok(())
        })
    }
    pub fn begin_withdrawal(&mut self, caller: Account, id: Id) -> Result<Id> {
        self.atomic(|s| {
            let c = s.claims.get(&id).ok_or(Error::Missing)?.clone();
            if c.owner != caller {
                return Err(Error::Unauthorized);
            };
            if c.state != ClaimState::Available {
                return Err(Error::WrongState);
            };
            s.charge(caller, WITHDRAWAL_STORAGE)?;
            let attempt = s.nonce()?;
            s.local = sub(s.local, c.amount)?;
            s.claims.get_mut(&id).unwrap().state = ClaimState::InFlight { attempt };
            Ok(attempt)
        })
    }
    pub fn withdrawal_result(
        &mut self,
        caller: Account,
        id: Id,
        attempt: Id,
        success: bool,
    ) -> Result<()> {
        self.atomic(|s| {
            Self::callback(caller)?;
            let c = s.claims.get_mut(&id).ok_or(Error::Missing)?;
            if c.state != (ClaimState::InFlight { attempt }) {
                return Err(Error::WrongState);
            };
            c.state = if success {
                ClaimState::Paid
            } else {
                ClaimState::AwaitRefund { attempt }
            };
            Ok(())
        })
    }
    pub fn confirm_refund(&mut self, caller: Account, id: Id, attempt: Id) -> Result<()> {
        self.atomic(|s| {
            Self::callback(caller)?;
            let c = s.claims.get_mut(&id).ok_or(Error::Missing)?;
            if c.state != (ClaimState::AwaitRefund { attempt }) {
                return Err(Error::WrongState);
            };
            s.local = add(s.local, c.amount)?;
            c.state = ClaimState::Available;
            Ok(())
        })
    }
    pub fn cash(&self) -> Result<Cash> {
        let mut c = Cash {
            local: self.local,
            backing: self.backing,
            unused_lender: 0,
            borrower_claims: 0,
            lender_claims: 0,
            other_claims: 0,
            storage_free: 0,
            storage_locked: 0,
            operational: self.operational,
            in_flight: 0,
        };
        for a in self.accounts.values() {
            c.storage_free = add(c.storage_free, a.storage_free)?;
            c.storage_locked = add(c.storage_locked, a.storage_used)?;
        }
        for o in self.offers.values() {
            if o.state == LoanState::Funded {
                c.unused_lender = add(c.unused_lender, o.terms.principal)?
            }
        }
        for q in self.claims.values() {
            match q.state {
                ClaimState::Available => match q.kind {
                    ClaimKind::Borrower => c.borrower_claims = add(c.borrower_claims, q.amount)?,
                    ClaimKind::LenderRepayment => c.lender_claims = add(c.lender_claims, q.amount)?,
                    _ => c.other_claims = add(c.other_claims, q.amount)?,
                },
                ClaimState::InFlight { .. } | ClaimState::AwaitRefund { .. } => {
                    c.in_flight = add(c.in_flight, q.amount)?
                }
                ClaimState::Paid => {}
            }
        }
        Ok(c)
    }
    pub fn check(&self) -> Result<()> {
        let c = self.cash()?;
        let mut promised = 0;
        for n in [
            c.backing,
            c.unused_lender,
            c.borrower_claims,
            c.lender_claims,
            c.other_claims,
            c.storage_free,
            c.storage_locked,
            c.operational,
        ] {
            promised = add(promised, n)?
        }
        if promised != c.local {
            return Err(Error::Invariant);
        };
        let mut tokens = 0;
        for (&id, a) in &self.accounts {
            if id == CALLBACK || a.storage_used < ACCOUNT_STORAGE {
                return Err(Error::Invariant);
            };
            tokens = add(tokens, a.available)?;
        }
        for o in self.offers.values() {
            self.user(o.lender)?;
            if let LoanState::Active {
                owner,
                borrower,
                ref pending,
                ..
            } = o.state
            {
                self.user(owner)?;
                self.user(borrower)?;
                tokens = add(tokens, o.terms.collateral)?;
                if let Some(p) = pending {
                    self.user(p.previous)?;
                    self.user(p.receiver)?;
                    if owner != p.receiver {
                        return Err(Error::Invariant);
                    }
                }
            }
        }
        for c in self.claims.values() {
            self.user(c.owner)?;
            if c.amount == 0 {
                return Err(Error::Invariant);
            }
        }
        if tokens != self.supply || (self.supply == 0 && self.backing != 0) {
            return Err(Error::Invariant);
        };
        Ok(())
    }
}
