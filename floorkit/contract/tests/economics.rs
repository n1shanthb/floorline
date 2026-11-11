use floorkit_core::*;

fn cfg() -> Config {
    Config {
        initial_price: SCALE,
        markup_bps: 500,
        tax_bps: 2000,
        creator_fee_bps: 100,
    }
}

#[test]
fn bootstrap_rounding_and_limits() {
    let mut c = cfg();
    c.initial_price = 3 * SCALE;
    assert_eq!(bootstrap(10, &c), Ok(3));
    assert_eq!(bootstrap(1, &c), Err(Error::Dust));
    c.initial_price = 1;
    assert_eq!(bootstrap(u128::MAX, &c), Err(Error::Overflow));
    c.initial_price = 0;
    assert_eq!(bootstrap(1, &c), Err(Error::InvalidConfig));
}

#[test]
fn parameter_boundaries_are_exact() {
    let mut c = cfg();
    for (markup, tax, fee, valid) in [
        (10000, 5000, 500, true),
        (10001, 0, 0, false),
        (0, 5001, 0, false),
        (0, 0, 501, false),
    ] {
        c.markup_bps = markup;
        c.tax_bps = tax;
        c.creator_fee_bps = fee;
        assert_eq!(c.validate().is_ok(), valid);
    }
}

#[test]
fn net_fee_pricing_preserves_backing() {
    let mut c = cfg();
    c.markup_bps = 0;
    c.creator_fee_bps = 500;
    let q = mint_quote(100, 100, 100, &c).unwrap();
    assert_eq!((q.tokens, q.fee, q.net), (95, 5, 95));
    assert!(backing_nondecreasing(100, 100, 195, 195));
    assert!(!backing_nondecreasing(100, 100, 195, 200));
}

#[test]
fn size_dependent_curve_and_full_exit() {
    assert_eq!(redeem_quote(1000, 1000, 100, &cfg()), Ok(82));
    assert_eq!(redeem_quote(1000, 1000, 1000, &cfg()), Ok(1000));
    assert_eq!(redeem_quote(1, 1000, 1, &cfg()), Ok(0));
    assert_eq!(
        redeem_quote(u128::MAX, u128::MAX, u128::MAX, &cfg()),
        Ok(u128::MAX)
    );
}

#[test]
fn closure_is_irreversible_and_rejection_atomic() {
    let mut e = Economics::new(1000, cfg()).unwrap();
    assert_eq!(e.redeem(1000, 1000, 0, 0), Ok(1000));
    assert_eq!(e.snapshot(), (0, 0, 0, true));
    let frozen = e;
    assert_eq!(e.mint(1000, 1, 0, 0), Err(Error::Inactive));
    assert_eq!(e.contribute(1000), Err(Error::Inactive));
    assert_eq!(e.redeem(1, 0, 0, 0), Err(Error::Inactive));
    assert_eq!(e, frozen);
}

#[test]
fn stale_quotes_dust_and_supply_overflow_are_atomic() {
    let mut e = Economics::new(1000, cfg()).unwrap();
    let frozen = e;
    assert_eq!(e.mint(100, 1, 1, 0), Err(Error::Expired));
    assert_eq!(e.mint(100, 1000, 0, 0), Err(Error::Slippage));
    assert_eq!(e.redeem(1, 0, 0, 0), Err(Error::Dust));
    assert_eq!(e.redeem(100, 1000, 0, 0), Err(Error::Slippage));
    assert_eq!(e, frozen);
    let mut c = cfg();
    c.markup_bps = 0;
    c.creator_fee_bps = 0;
    let mut max = Economics::new(u128::MAX, c).unwrap();
    let before = max;
    assert_eq!(max.mint(1, 0, 0, 0), Err(Error::Overflow));
    assert_eq!(max.contribute(1), Err(Error::Overflow));
    assert_eq!(max, before);
}

#[test]
fn backing_does_not_imply_fixed_quote_monotonicity() {
    let mut c = cfg();
    c.markup_bps = 100;
    c.creator_fee_bps = 0;
    let mut e = Economics::new(10000, c).unwrap();
    assert_eq!(redeem_quote(10000, 10000, 1000, &c), Ok(820));
    assert_eq!(e.mint(10000, 0, 0, 0).unwrap().tokens, 9900);
    let (r, t, _, _) = e.snapshot();
    assert!(backing_nondecreasing(10000, 10000, r, t));
    assert_eq!(redeem_quote(r, t, 1000, &c), Ok(814));
}

#[test]
fn immediate_creator_buyer_round_trip_cannot_profit() {
    for markup in [0, 1, 500, 10000] {
        for tax in [0, 1, 2000, 5000] {
            for fee in [0, 1, 100, 500] {
                let mut c = cfg();
                c.markup_bps = markup;
                c.tax_bps = tax;
                c.creator_fee_bps = fee;
                for deposit in [10, 100, 1000, 10000] {
                    let mut e = Economics::new(10000, c).unwrap();
                    let q = e.mint(deposit, 0, 0, 0).unwrap();
                    let (r, t, _, _) = e.snapshot();
                    let payout = redeem_quote(r, t, q.tokens, &c).unwrap();
                    assert!(payout + q.fee <= deposit);
                }
            }
        }
    }
}
