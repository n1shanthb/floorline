//! Exact Phase 0 arithmetic port, with an optional isolated NEAR adapter.
//! Native math tests alone do not certify the adapter or real receipt behavior.
use uint::construct_uint;

#[cfg(all(feature = "contract", target_arch = "wasm32"))]
mod contract;

construct_uint! { pub struct U512(8); }

pub const SCALE: u128 = 1_000_000_000_000_000_000_000_000;
pub const BPS: u128 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    InvalidConfig,
    Inactive,
    InvalidAmount,
    Dust,
    Overflow,
    Slippage,
    Expired,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Config {
    pub initial_price: u128,
    pub markup_bps: u16,
    pub tax_bps: u16,
    pub creator_fee_bps: u16,
}

impl Config {
    pub fn validate(&self) -> Result<(), Error> {
        if self.initial_price == 0
            || self.markup_bps > 10_000
            || self.tax_bps > 5_000
            || self.creator_fee_bps > 500
        {
            return Err(Error::InvalidConfig);
        }
        Ok(())
    }
}

pub fn add(a: u128, b: u128) -> Result<u128, Error> {
    a.checked_add(b).ok_or(Error::Overflow)
}

pub fn sub(a: u128, b: u128) -> Result<u128, Error> {
    a.checked_sub(b).ok_or(Error::InvalidAmount)
}

pub fn narrow(n: U512) -> Result<u128, Error> {
    if n > U512::from(u128::MAX) {
        Err(Error::Overflow)
    } else {
        Ok(n.low_u128())
    }
}

fn product(values: &[u128]) -> Result<U512, Error> {
    values.iter().try_fold(U512::one(), |acc, value| {
        acc.checked_mul(U512::from(*value)).ok_or(Error::Overflow)
    })
}

pub fn bootstrap(seed: u128, cfg: &Config) -> Result<u128, Error> {
    cfg.validate()?;
    if seed == 0 {
        return Err(Error::InvalidAmount);
    }
    let tokens = narrow(product(&[seed, SCALE])? / U512::from(cfg.initial_price))?;
    if tokens == 0 {
        return Err(Error::Dust);
    }
    Ok(tokens)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MintQuote {
    pub tokens: u128,
    pub fee: u128,
    pub net: u128,
}

pub fn mint_quote(r: u128, t: u128, deposit: u128, cfg: &Config) -> Result<MintQuote, Error> {
    cfg.validate()?;
    if r == 0 || t == 0 || deposit == 0 {
        return Err(Error::Inactive);
    }
    let fee = narrow(product(&[deposit, cfg.creator_fee_bps.into()])? / U512::from(BPS))?;
    let net = sub(deposit, fee)?;
    let tokens =
        narrow(product(&[net, t, BPS])? / product(&[r, add(BPS, cfg.markup_bps.into())?])?)?;
    if tokens == 0 {
        return Err(Error::Dust);
    }
    Ok(MintQuote { tokens, fee, net })
}

/// One final floor; in particular amount==t returns EXACTLY r.
/// A zero quote is valid for this view; execution must reject it.
pub fn redeem_quote(r: u128, t: u128, amount: u128, cfg: &Config) -> Result<u128, Error> {
    cfg.validate()?;
    if r == 0 || t == 0 || amount == 0 || amount > t {
        return Err(Error::InvalidAmount);
    }
    let tax = u128::from(cfg.tax_bps);
    let factor = product(&[BPS - tax, t])?
        .checked_add(product(&[tax, amount])?)
        .ok_or(Error::Overflow)?;
    let numerator = product(&[r, amount])?
        .checked_mul(factor)
        .ok_or(Error::Overflow)?;
    narrow(numerator / product(&[BPS, t, t])?)
}

pub fn backing_nondecreasing(old_r: u128, old_t: u128, r: u128, t: u128) -> bool {
    old_t > 0 && t > 0 && U512::from(r) * U512::from(old_t) >= U512::from(old_r) * U512::from(t)
}

/// Pure economic transition port only. No holder/storage/native-cash state.
/// Fields are private and all fallible work precedes assignment, so rejection
/// cannot partially update state even outside NEAR transaction rollback.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Economics {
    config: Config,
    reserve: u128,
    supply: u128,
    fees: u128,
    closed: bool,
}

impl Economics {
    pub fn new(seed: u128, config: Config) -> Result<Self, Error> {
        let supply = bootstrap(seed, &config)?;
        Ok(Self {
            config,
            reserve: seed,
            supply,
            fees: 0,
            closed: false,
        })
    }

    pub fn snapshot(&self) -> (u128, u128, u128, bool) {
        (self.reserve, self.supply, self.fees, self.closed)
    }

    fn active(&self) -> Result<(), Error> {
        if self.closed || self.reserve == 0 || self.supply == 0 {
            Err(Error::Inactive)
        } else {
            Ok(())
        }
    }

    pub fn mint(
        &mut self,
        deposit: u128,
        minimum: u128,
        now: u64,
        deadline: u64,
    ) -> Result<MintQuote, Error> {
        self.active()?;
        if now > deadline {
            return Err(Error::Expired);
        }
        let q = mint_quote(self.reserve, self.supply, deposit, &self.config)?;
        if q.tokens < minimum {
            return Err(Error::Slippage);
        }
        let r = add(self.reserve, q.net)?;
        let t = add(self.supply, q.tokens)?;
        let f = add(self.fees, q.fee)?;
        self.reserve = r;
        self.supply = t;
        self.fees = f;
        Ok(q)
    }

    /// Returns the cash that an adapter MUST put into a funded claim. It does
    /// not issue a claim or pay anyone, and is not a public contract method.
    pub fn redeem(
        &mut self,
        amount: u128,
        minimum: u128,
        now: u64,
        deadline: u64,
    ) -> Result<u128, Error> {
        self.active()?;
        if now > deadline {
            return Err(Error::Expired);
        }
        let q = redeem_quote(self.reserve, self.supply, amount, &self.config)?;
        if q == 0 {
            return Err(Error::Dust);
        }
        if q < minimum {
            return Err(Error::Slippage);
        }
        let r = sub(self.reserve, q)?;
        let t = sub(self.supply, amount)?;
        self.reserve = r;
        self.supply = t;
        self.closed = t == 0;
        Ok(q)
    }

    pub fn contribute(&mut self, deposit: u128) -> Result<(), Error> {
        self.active()?;
        if deposit == 0 {
            return Err(Error::InvalidAmount);
        }
        self.reserve = add(self.reserve, deposit)?;
        Ok(())
    }
}
