use floorline_kill_test::*;
use num_bigint::BigUint;
fn big(n: u128) -> BigUint {
    BigUint::from(n)
}
fn setup() -> Engine {
    let mut e = Engine::new(Config {
        tax_bps: 2000,
        issuance_numerator: 1,
        issuance_denominator: 1,
    })
    .unwrap();
    for a in 1..=5 {
        e.storage_deposit(a, 10000).unwrap();
    }
    e.issue(1, 100000, 100000).unwrap();
    e.transfer_floor(1, 2, 1000).unwrap();
    e.transfer_floor(1, 3, 1000).unwrap();
    e
}
fn terms() -> Terms {
    Terms {
        principal: 100,
        repayment: 110,
        collateral: 200,
        duration_ns: 10,
    }
}
fn active(e: &mut Engine) -> (Id, Id) {
    let o = e.fund_offer(2, terms(), 100).unwrap();
    e.accept_offer(1, o).unwrap()
}
fn reject<T: std::fmt::Debug>(
    e: &mut Engine,
    expected: Error,
    f: impl FnOnce(&mut Engine) -> Result<T>,
) {
    let before = e.clone();
    assert_eq!(f(e).unwrap_err(), expected);
    assert_eq!(*e, before);
}
/// Independent BigUint oracle: does not invoke Engine::check/cash/math helpers.
fn audit(e: &Engine) {
    let mut cash = big(e.backing());
    let mut tokens = big(0);
    let mut inflight = big(0);
    for (&who, a) in e.accounts() {
        assert_ne!(who, 0);
        cash += big(a.storage_free) + big(a.storage_used);
        tokens += big(a.available);
    }
    // Operational funds only come from separately modeled attached deposits.
    cash += big(e.cash().unwrap().operational);
    for o in e.offers().values() {
        match &o.state {
            LoanState::Funded => cash += big(o.terms.principal),
            LoanState::Active {
                owner,
                borrower,
                pending,
                ..
            } => {
                tokens += big(o.terms.collateral);
                assert!(e.accounts().contains_key(owner));
                assert!(e.accounts().contains_key(borrower));
                if let Some(p) = pending {
                    assert_eq!(*owner, p.receiver)
                }
            }
            _ => {}
        }
    }
    for c in e.claims().values() {
        assert!(c.amount > 0);
        assert!(e.accounts().contains_key(&c.owner));
        match c.state {
            ClaimState::Available => cash += big(c.amount),
            ClaimState::InFlight { .. } | ClaimState::AwaitRefund { .. } => {
                inflight += big(c.amount)
            }
            ClaimState::Paid => {}
        }
    }
    assert_eq!(cash, big(e.cash().unwrap().local));
    assert_eq!(inflight, big(e.cash().unwrap().in_flight));
    assert_eq!(tokens, big(e.supply()));
    if e.supply() == 0 {
        assert_eq!(e.backing(), 0)
    }
}
#[test]
fn bootstrap_and_full_exit() {
    let mut e = Engine::new(Config {
        tax_bps: 9999,
        issuance_numerator: 1,
        issuance_denominator: 1,
    })
    .unwrap();
    assert_eq!(e.backing(), 0);
    assert_eq!(e.supply(), 0);
    e.storage_deposit(1, 100).unwrap();
    reject(&mut e, Error::ZeroSupply, |e| e.contribute(1, 5));
    assert!(e.quote(1).is_err());
    assert_eq!(e.issue(1, 1, 1), Ok(1));
    assert_eq!(e.quote(1), Ok(1));
    let id = e.redeem(1, 1, 1).unwrap();
    assert_eq!((e.backing(), e.supply()), (0, 0));
    assert_eq!(e.claims()[&id].amount, 1);
    e.issue(1, 2, 2).unwrap();
    audit(&e);
}
#[test]
fn zero_supply_nonzero_backing_unreachable() {
    let mut e = setup();
    let t = e.supply();
    e.transfer_floor(2, 1, 1000).unwrap();
    e.transfer_floor(3, 1, 1000).unwrap();
    e.contribute(5, 5).unwrap();
    e.redeem(1, t, 1).unwrap();
    assert_eq!((e.backing(), e.supply()), (0, 0));
    reject(&mut e, Error::ZeroSupply, |e| e.contribute(5, 1));
}
#[test]
fn zero_tokens_dust_and_minimum_outputs() {
    let mut e = Engine::new(Config {
        tax_bps: 5000,
        issuance_numerator: 1,
        issuance_denominator: 10,
    })
    .unwrap();
    e.storage_deposit(1, 100).unwrap();
    reject(&mut e, Error::Dust, |e| e.issue(1, 9, 0));
    reject(&mut e, Error::InvalidAmount, |e| e.issue(1, 0, 0));
    reject(&mut e, Error::Slippage, |e| e.issue(1, 10, 2));
    e.issue(1, 10, 1).unwrap();
    assert_eq!(redemption_quote(1, 100, 1, 2000), Ok(0));
    let mut e = setup();
    reject(&mut e, Error::Dust, |e| e.redeem(1, 1, 0));
    reject(&mut e, Error::Slippage, |e| e.redeem(1, 100, 1000));
    reject(&mut e, Error::InvalidAmount, |e| e.redeem(1, 0, 0));
}
#[test]
fn issuance_after_increase_has_no_bypass() {
    let mut e = setup();
    e.contribute(5, 100).unwrap();
    reject(&mut e, Error::Dilution, |e| e.issue(1, 100, 0));
    let mut e = Engine::new(Config {
        tax_bps: 2000,
        issuance_numerator: 1,
        issuance_denominator: 10,
    })
    .unwrap();
    e.storage_deposit(1, 100).unwrap();
    e.issue(1, 100, 10).unwrap();
    e.contribute(1, 1).unwrap();
    assert_eq!(e.issue(1, 19, 1), Ok(1));
    assert!(big(e.backing()) * big(10) >= big(101) * big(e.supply()));
}
#[test]
fn exact_curve_rounds_once_and_maximum_values() {
    // A staged floor(base)*factor implementation incorrectly returns zero here.
    assert_eq!(redemption_quote(2, 3, 2, 2000), Ok(1));
    for tax in [0, 1, 2000, 9999] {
        for (l, t, c) in [
            (u128::MAX, u128::MAX, u128::MAX),
            (u128::MAX, u128::MAX, u128::MAX - 1),
            (u128::MAX, 2, 1),
            (1, u128::MAX, 1),
        ] {
            let expected =
                big(l) * big(c) * (big(10000 - tax as u128) * big(t) + big(tax as u128) * big(c))
                    / (big(10000) * big(t) * big(t));
            assert_eq!(big(redemption_quote(l, t, c, tax).unwrap()), expected);
        }
    }
    assert!(redemption_quote(1, 1, 1, 10000).is_err());
    let mut e = Engine::new(Config {
        tax_bps: 0,
        issuance_numerator: 1,
        issuance_denominator: 1,
    })
    .unwrap();
    e.storage_deposit(1, 100).unwrap();
    e.issue(1, u128::MAX - 100, 0).unwrap();
    reject(&mut e, Error::Overflow, |e| e.issue(1, 1, 0));
    // Net deposit may be representable while minted output is not.
    let mut e = Engine::new(Config {
        tax_bps: 0,
        issuance_numerator: u128::MAX,
        issuance_denominator: 1,
    })
    .unwrap();
    e.storage_deposit(1, 100).unwrap();
    reject(&mut e, Error::Overflow, |e| e.issue(1, 2, 0));
}
#[test]
fn carol_to_dave_repayment() {
    let mut e = setup();
    let (l, t) = (e.backing(), e.supply());
    let (id, payout) = active(&mut e);
    assert_eq!((e.backing(), e.supply()), (l, t));
    assert_eq!(e.cash().unwrap().borrower_claims, 100);
    assert_eq!(e.cash().unwrap().lender_claims, 0);
    let fixed = e.offers()[&id].terms.clone();
    e.transfer_nft(1, id, 3).unwrap();
    assert_eq!(e.nft_owner(id), Some(3));
    assert_eq!(e.offers()[&id].terms, fixed);
    reject(&mut e, Error::Unauthorized, |e| e.repay(1, id, 110));
    reject(&mut e, Error::InvalidAmount, |e| e.repay(3, id, 109));
    let before = e.accounts()[&3].available;
    let claim = e.repay(3, id, 110).unwrap();
    assert_eq!(e.accounts()[&3].available, before + 200);
    assert_eq!(e.claims()[&claim].owner, 2);
    assert_eq!(e.claims()[&claim].amount, 110);
    assert_eq!(e.nft_owner(id), None);
    assert_eq!(e.claims()[&payout].state, ClaimState::Available);
    assert_eq!((e.backing(), e.supply()), (l, t));
    reject(&mut e, Error::WrongState, |e| e.repay(3, id, 110));
    reject(&mut e, Error::WrongState, |e| e.default_loan(4, id));
    audit(&e);
}
#[test]
fn locked_tokens_and_default_boundary() {
    let mut e = setup();
    let (id, _) = active(&mut e);
    let available = e.accounts()[&1].available;
    reject(&mut e, Error::InsufficientTokens, |e| {
        e.redeem(1, available + 1, 0)
    });
    reject(&mut e, Error::InsufficientTokens, |e| {
        e.transfer_floor(1, 3, available + 1)
    });
    reject(&mut e, Error::NotExpired, |e| e.default_loan(4, id));
    e.advance_time(9).unwrap();
    let mut just_before = e.clone();
    just_before.repay(1, id, 110).unwrap();
    e.advance_time(10).unwrap();
    reject(&mut e, Error::Expired, |e| e.repay(1, id, 110));
    let before = e.accounts()[&2].available;
    let pair = (e.backing(), e.supply());
    e.default_loan(4, id).unwrap();
    assert_eq!(e.accounts()[&2].available, before + 200);
    assert_eq!((e.backing(), e.supply()), pair);
    reject(&mut e, Error::WrongState, |e| e.default_loan(4, id));
    reject(&mut e, Error::WrongState, |e| e.repay(1, id, 110));
    reject(&mut e, Error::TimeReversed, |e| e.advance_time(9));
    audit(&e);
}
#[test]
fn cancellation_and_acceptance_are_exclusive() {
    let mut e = setup();
    reject(&mut e, Error::InvalidAmount, |e| {
        e.fund_offer(2, terms(), 99)
    });
    let id = e.fund_offer(2, terms(), 100).unwrap();
    assert_eq!(e.cash().unwrap().unused_lender, 100);
    reject(&mut e, Error::Unauthorized, |e| e.cancel_offer(1, id));
    let c = e.cancel_offer(2, id).unwrap();
    assert_eq!(e.claims()[&c].amount, 100);
    reject(&mut e, Error::WrongState, |e| e.accept_offer(1, id));
    reject(&mut e, Error::WrongState, |e| e.cancel_offer(2, id));
    let (id, _) = active(&mut e);
    reject(&mut e, Error::WrongState, |e| e.accept_offer(1, id));
    reject(&mut e, Error::WrongState, |e| e.cancel_offer(2, id));
    audit(&e);
}
#[test]
fn unresolved_nft_call_freezes_settlement_and_stale_callbacks() {
    let mut e = setup();
    let (id, _) = active(&mut e);
    let n = e.begin_nft_transfer(1, id, 3).unwrap();
    reject(&mut e, Error::TransferPending, |e| e.repay(3, id, 110));
    reject(&mut e, Error::TransferPending, |e| e.transfer_nft(3, id, 4));
    reject(&mut e, Error::Unauthorized, |e| {
        e.resolve_nft_transfer(3, id, n, true)
    });
    e.advance_time(10).unwrap();
    reject(&mut e, Error::TransferPending, |e| e.default_loan(2, id));
    e.resolve_nft_transfer(CALLBACK, id, n, false).unwrap();
    assert_eq!(e.nft_owner(id), Some(1));
    let n2 = e.begin_nft_transfer(1, id, 3).unwrap();
    reject(&mut e, Error::WrongState, |e| {
        e.resolve_nft_transfer(CALLBACK, id, n, true)
    });
    e.resolve_nft_transfer(CALLBACK, id, n2, true).unwrap();
    assert_eq!(e.nft_owner(id), Some(3));
    e.default_loan(4, id).unwrap();
    audit(&e);
}
#[test]
fn dispatch_failure_refund_retry_and_double_withdrawal() {
    let mut e = setup();
    let c = e.redeem(1, 100, 1).unwrap();
    let amount = e.claims()[&c].amount;
    let cash = e.cash().unwrap().local;
    reject(&mut e, Error::Unauthorized, |e| e.begin_withdrawal(3, c));
    let n = e.begin_withdrawal(1, c).unwrap();
    assert_eq!(e.cash().unwrap().local, cash - amount);
    assert_eq!(e.cash().unwrap().in_flight, amount);
    reject(&mut e, Error::WrongState, |e| e.begin_withdrawal(1, c));
    reject(&mut e, Error::Unauthorized, |e| {
        e.withdrawal_result(1, c, n, false)
    });
    reject(&mut e, Error::WrongState, |e| {
        e.confirm_refund(CALLBACK, c, n)
    });
    e.withdrawal_result(CALLBACK, c, n, false).unwrap();
    reject(&mut e, Error::WrongState, |e| e.begin_withdrawal(1, c));
    assert_eq!(e.cash().unwrap().local, cash - amount);
    e.confirm_refund(CALLBACK, c, n).unwrap();
    assert_eq!(e.cash().unwrap().local, cash);
    reject(&mut e, Error::WrongState, |e| {
        e.confirm_refund(CALLBACK, c, n)
    });
    let n2 = e.begin_withdrawal(1, c).unwrap();
    reject(&mut e, Error::WrongState, |e| {
        e.withdrawal_result(CALLBACK, c, n, true)
    });
    e.withdrawal_result(CALLBACK, c, n2, true).unwrap();
    reject(&mut e, Error::WrongState, |e| e.begin_withdrawal(1, c));
    audit(&e);
}
#[test]
fn storage_exhaustion_rolls_back_every_cash_and_token_move() {
    let mut e = Engine::new(Config {
        tax_bps: 2000,
        issuance_numerator: 1,
        issuance_denominator: 1,
    })
    .unwrap();
    e.storage_deposit(1, ACCOUNT_STORAGE).unwrap();
    e.issue(1, 1000, 0).unwrap();
    reject(&mut e, Error::InsufficientStorage, |e| e.redeem(1, 100, 0));
    reject(&mut e, Error::InsufficientStorage, |e| {
        e.fund_offer(1, terms(), 100)
    });
    e.storage_deposit(2, ACCOUNT_STORAGE + OFFER_STORAGE)
        .unwrap();
    let id = e.fund_offer(2, terms(), 100).unwrap();
    reject(&mut e, Error::InsufficientStorage, |e| {
        e.cancel_offer(2, id)
    });
    reject(&mut e, Error::InsufficientStorage, |e| {
        e.accept_offer(1, id)
    });
    e.storage_deposit(1, CLAIM_STORAGE).unwrap();
    let (_, c) = e.accept_offer(1, id).unwrap();
    reject(&mut e, Error::InsufficientStorage, |e| {
        e.begin_withdrawal(1, c)
    });
    reject(&mut e, Error::InsufficientStorage, |e| e.repay(1, id, 110));
    e.storage_deposit(1, 10).unwrap();
    e.repay(1, id, 110).unwrap();
    audit(&e);
}
#[test]
fn storage_refunds_and_operational_funds_are_segregated() {
    let mut e = setup();
    let pair = (e.backing(), e.supply());
    e.fund_operational(1, 123).unwrap();
    let c = e.storage_withdraw(1, 100).unwrap();
    assert_eq!(e.claims()[&c].kind, ClaimKind::StorageRefund);
    let n = e.begin_withdrawal(1, c).unwrap();
    e.withdrawal_result(CALLBACK, c, n, true).unwrap();
    assert_eq!(e.cash().unwrap().operational, 123);
    assert_eq!((e.backing(), e.supply()), pair);
    audit(&e);
}
#[test]
fn overlapping_redemptions_and_payouts_do_not_reuse_backing() {
    let mut e = setup();
    e.transfer_floor(2, 1, 1000).unwrap();
    e.transfer_floor(3, 1, 1000).unwrap();
    let a = e.redeem(1, 50000, 1).unwrap();
    let b = e.redeem(1, 50000, 1).unwrap();
    assert_eq!((e.backing(), e.supply()), (0, 0));
    assert_eq!(e.claims()[&a].amount + e.claims()[&b].amount, 100000);
    let x = e.begin_withdrawal(1, a).unwrap();
    let y = e.begin_withdrawal(1, b).unwrap();
    e.withdrawal_result(CALLBACK, b, y, true).unwrap();
    e.withdrawal_result(CALLBACK, a, x, false).unwrap();
    audit(&e);
}
#[test]
fn configuration_authority_and_timestamp_overflow() {
    assert!(Engine::new(Config {
        tax_bps: 10000,
        issuance_numerator: 1,
        issuance_denominator: 1
    })
    .is_err());
    assert!(Engine::new(Config {
        tax_bps: 0,
        issuance_numerator: 1,
        issuance_denominator: 0
    })
    .is_err());
    let mut e = setup();
    reject(&mut e, Error::Unauthorized, |e| {
        e.storage_deposit(CALLBACK, 100)
    });
    reject(&mut e, Error::Unregistered, |e| e.issue(999, 1, 0));
    e.advance_time(u64::MAX).unwrap();
    let id = e.fund_offer(2, terms(), 100).unwrap();
    reject(&mut e, Error::Overflow, |e| e.accept_offer(1, id));
}

#[derive(Clone, Debug)]
enum Op {
    Issue(Account, u128),
    Gift(u128),
    Redeem(Account, u128),
    Fund(u128),
    Accept(Id),
    Cancel(Account, Id),
    Transfer(Account, Id, Account),
    BeginTransfer(Account, Id, Account),
    Resolve(Account, Id, Id, bool),
    Repay(Account, Id, u128),
    Default(Id),
    Time(u64),
    Withdraw(Account, Id),
    Result(Account, Id, Id, bool),
    Refund(Account, Id, Id),
    Storage(Account, u128),
    StorageOut(Account, u128),
    Floor(Account, Account, u128),
    Operational(u128),
}
impl Op {
    fn run(&self, e: &mut Engine) -> Result<()> {
        match *self {
            Self::Issue(a, n) => e.issue(a, n, 0).map(|_| ()),
            Self::Gift(n) => e.contribute(5, n),
            Self::Redeem(a, n) => e.redeem(a, n, 0).map(|_| ()),
            Self::Fund(n) => e
                .fund_offer(
                    2,
                    Terms {
                        principal: n,
                        repayment: n + 3,
                        collateral: n + 5,
                        duration_ns: 10,
                    },
                    n,
                )
                .map(|_| ()),
            Self::Accept(id) => e.accept_offer(1, id).map(|_| ()),
            Self::Cancel(a, id) => e.cancel_offer(a, id).map(|_| ()),
            Self::Transfer(a, id, b) => e.transfer_nft(a, id, b),
            Self::BeginTransfer(a, id, b) => e.begin_nft_transfer(a, id, b).map(|_| ()),
            Self::Resolve(a, id, n, b) => e.resolve_nft_transfer(a, id, n, b),
            Self::Repay(a, id, n) => e.repay(a, id, n).map(|_| ()),
            Self::Default(id) => e.default_loan(4, id),
            Self::Time(n) => e.advance_time(n),
            Self::Withdraw(a, id) => e.begin_withdrawal(a, id).map(|_| ()),
            Self::Result(a, id, n, b) => e.withdrawal_result(a, id, n, b),
            Self::Refund(a, id, n) => e.confirm_refund(a, id, n),
            Self::Storage(a, n) => e.storage_deposit(a, n),
            Self::StorageOut(a, n) => e.storage_withdraw(a, n).map(|_| ()),
            Self::Floor(a, b, n) => e.transfer_floor(a, b, n),
            Self::Operational(n) => e.fund_operational(5, n),
        }
    }
}
fn rng(r: &mut u64) -> u64 {
    *r ^= *r << 13;
    *r ^= *r >> 7;
    *r ^= *r << 17;
    *r
}
#[test]
fn wide_curve_against_independent_bigint_10000_cases() {
    let mut r = 0x94d0_381a_c3b5_778du64;
    for case in 0..10000 {
        let l = ((rng(&mut r) as u128) << 64) | rng(&mut r) as u128;
        let t = (((rng(&mut r) as u128) << 64) | rng(&mut r) as u128).max(1);
        let c = (((rng(&mut r) as u128) << 64) | rng(&mut r) as u128) % t + 1;
        let tax = (rng(&mut r) % 10000) as u16;
        let expected =
            big(l) * big(c) * (big(10000 - tax as u128) * big(t) + big(tax as u128) * big(c))
                / (big(10000) * big(t) * big(t));
        let payout = redemption_quote(l, t, c, tax).unwrap();
        assert_eq!(big(payout), expected, "curve case={case}");
        assert!(
            big(payout) * big(t) <= big(l) * big(c),
            "pro-rata bound case={case}"
        );
        if c < t {
            assert!(
                big(l - payout) * big(t) >= big(l) * big(t - c),
                "backing case={case}"
            );
        }
    }
}
#[test]
fn redesigned_10000_sequences() {
    let mut accepted = [0u64; 20];
    let mut rejected = 0u64;
    for seed in 10001..=20000u64 {
        let mut e = setup();
        let mut random = seed;
        let mut trace = Vec::new();
        for step in 0..128 {
            let r = rng(&mut random);
            let n = (r % 20 + 1) as u128;
            let role = (r % 5 + 1) as Account;
            let offer = e
                .offers()
                .iter()
                .nth((r as usize) % e.offers().len().max(1))
                .map(|(&id, o)| (id, o.clone()));
            let (id, owner, debt, nonce, expiry) = match offer {
                Some((id, o)) => {
                    let (owner, nonce, expiry) = match o.state {
                        LoanState::Active {
                            owner,
                            expiry,
                            pending,
                            ..
                        } => (owner, pending.map(|p| p.nonce).unwrap_or(r), expiry),
                        _ => (1, r, e.now()),
                    };
                    (id, owner, o.terms.repayment, nonce, expiry)
                }
                None => (999, 1, n, r, e.now()),
            };
            let claim = e
                .claims()
                .iter()
                .nth((r as usize) % e.claims().len().max(1))
                .map(|(&id, c)| (id, c.clone()));
            let (cid, co, attempt) = match claim {
                Some((id, c)) => (
                    id,
                    c.owner,
                    match c.state {
                        ClaimState::InFlight { attempt } | ClaimState::AwaitRefund { attempt } => {
                            attempt
                        }
                        _ => r,
                    },
                ),
                None => (999, role, r),
            };
            let kind = (r % 20) as usize;
            let op = match kind {
                0 => Op::Issue(role, n),
                1 => Op::Gift(n),
                2 => Op::Redeem(role, n),
                3 => Op::Fund(n),
                4 => Op::Accept(id),
                5 => Op::Cancel(if r & 32 == 0 { 2 } else { role }, id),
                6 => Op::Transfer(owner, id, 3),
                7 => Op::BeginTransfer(owner, id, if owner == 3 { 1 } else { 3 }),
                8 => Op::Resolve(
                    if r & 32 == 0 { CALLBACK } else { role },
                    id,
                    nonce,
                    r & 64 == 0,
                ),
                9 => Op::Repay(if r & 32 == 0 { owner } else { role }, id, debt),
                10 => Op::Default(id),
                11 => Op::Time(if r & 32 == 0 {
                    expiry
                } else {
                    e.now().saturating_add(r % 5)
                }),
                12 => Op::Withdraw(co, cid),
                13 => Op::Result(
                    if r & 32 == 0 { CALLBACK } else { role },
                    cid,
                    attempt,
                    r & 64 == 0,
                ),
                14 => Op::Refund(CALLBACK, cid, attempt),
                15 => Op::Storage(role, n),
                16 => Op::StorageOut(role, n),
                17 => Op::Floor(role, if role == 1 { 3 } else { 1 }, n),
                18 => Op::Operational(n),
                _ => Op::Repay(4, id, debt + 1),
            };
            let before = e.clone();
            trace.push(op.clone());
            let result = op.run(&mut e);
            let verify = std::panic::catch_unwind(|| {
                assert_ne!(
                    result,
                    Err(Error::Invariant),
                    "engine invariant guard triggered"
                );
                if result.is_err() {
                    assert_eq!(e, before)
                } else {
                    // Independent cash-flow oracle: future debt is never an inflow.
                    let local_before = big(before.cash().unwrap().local);
                    let local_after = big(e.cash().unwrap().local);
                    let expected = match op {
                        Op::Issue(_, n)
                        | Op::Gift(n)
                        | Op::Fund(n)
                        | Op::Storage(_, n)
                        | Op::Operational(n) => local_before + big(n),
                        Op::Repay(_, _, n) => local_before + big(n),
                        Op::Withdraw(_, id) => local_before - big(before.claims()[&id].amount),
                        Op::Refund(_, id, _) => local_before + big(before.claims()[&id].amount),
                        _ => local_before,
                    };
                    assert_eq!(local_after, expected, "unexpected external cash movement");
                    if before.supply() > 0 && e.supply() > 0 {
                        assert!(
                            big(e.backing()) * big(before.supply())
                                >= big(before.backing()) * big(e.supply())
                        )
                    }
                    if matches!(
                        op,
                        Op::Fund(_)
                            | Op::Accept(_)
                            | Op::Cancel(..)
                            | Op::Transfer(..)
                            | Op::BeginTransfer(..)
                            | Op::Resolve(..)
                            | Op::Repay(..)
                            | Op::Default(_)
                    ) {
                        assert_eq!(
                            (e.backing(), e.supply()),
                            (before.backing(), before.supply())
                        );
                    }
                };
                audit(&e);
            });
            assert!(
                verify.is_ok(),
                "REPRO seed={seed} step={step} result={result:?} trace={trace:#?}"
            );
            if result.is_ok() {
                accepted[kind] += 1
            } else {
                rejected += 1
            }
        }
    }
    for (k, n) in accepted.iter().enumerate().take(19) {
        assert!(*n > 0, "no successful coverage for op {k}")
    }
    println!("NEW_GATE1 seeds=10001..20000 sequences=10000 steps=128 operations=1280000 rejected={rejected} accepted_by_kind={accepted:?} invariant_failures=0");
}
