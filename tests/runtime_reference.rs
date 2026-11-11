//! Produces economic checkpoints for the real sandbox harness; storage differs by design.
use floorline_kill_test::*;
use serde_json::{json, Value};
const N: u128 = 1_000_000_000_000_000_000_000_000;
fn record(e: &Engine, name: &str, out: &mut Vec<Value>) {
    let c = e.cash().unwrap();
    let locked = e
        .offers()
        .values()
        .filter(|o| matches!(o.state, LoanState::Active { .. }))
        .map(|o| o.terms.collateral)
        .sum::<u128>();
    out.push(json!({"name":name,"L":e.backing().to_string(),"T":e.supply().to_string(),"locked":locked.to_string(),"unused_lender":c.unused_lender.to_string(),"borrower_claims":c.borrower_claims.to_string(),"lender_claims":c.lender_claims.to_string(),"redemption_claims":e.claims().values().filter(|c|c.kind==ClaimKind::Redemption&&c.state==ClaimState::Available).map(|c|c.amount).sum::<u128>().to_string(),"balances":(1..=6).map(|a|e.accounts()[&a].available.to_string()).collect::<Vec<_>>()}));
}
fn pay(e: &mut Engine, a: Account, id: Id) {
    let n = e.begin_withdrawal(a, id).unwrap();
    e.withdrawal_result(CALLBACK, id, n, true).unwrap();
}
#[test]
fn export_runtime_reference() {
    let mut e = Engine::new(Config {
        tax_bps: 2000,
        issuance_numerator: 1,
        issuance_denominator: 1,
    })
    .unwrap();
    for a in 1..=6 {
        e.storage_deposit(a, 10000).unwrap();
    }
    let mut out = vec![];
    e.issue(1, 100 * N, 0).unwrap();
    record(&e, "issue", &mut out);
    e.transfer_floor(1, 3, 10 * N).unwrap();
    record(&e, "ft_carol", &mut out);
    e.transfer_floor(1, 2, 10 * N).unwrap();
    record(&e, "ft_bob", &mut out);
    let r = e.redeem(2, N, 0).unwrap();
    record(&e, "redeem", &mut out);
    pay(&mut e, 2, r);
    record(&e, "withdraw_redemption", &mut out);
    let loan = e
        .fund_offer(
            5,
            Terms {
                principal: N,
                repayment: 11 * N / 10,
                collateral: 2 * N,
                duration_ns: 3_600_000_000_000,
            },
            N,
        )
        .unwrap();
    record(&e, "fund", &mut out);
    let (_, c) = e.accept_offer(3, loan).unwrap();
    record(&e, "accept", &mut out);
    pay(&mut e, 3, c);
    record(&e, "withdraw_borrower", &mut out);
    e.transfer_nft(3, loan, 4).unwrap();
    record(&e, "nft_transfer", &mut out);
    let c = e.repay(4, loan, 11 * N / 10).unwrap();
    record(&e, "repay", &mut out);
    pay(&mut e, 5, c);
    record(&e, "withdraw_lender", &mut out);
    let loan = e
        .fund_offer(
            5,
            Terms {
                principal: N / 2,
                repayment: 55 * N / 100,
                collateral: N,
                duration_ns: 1,
            },
            N / 2,
        )
        .unwrap();
    record(&e, "fund_default", &mut out);
    e.accept_offer(3, loan).unwrap();
    record(&e, "accept_default", &mut out);
    e.advance_time(1).unwrap();
    e.default_loan(2, loan).unwrap();
    record(&e, "default", &mut out);
    e.contribute(6, N / 10).unwrap();
    record(&e, "donate", &mut out);
    std::fs::create_dir_all("runtime/evidence").unwrap();
    std::fs::write(
        "runtime/evidence/reference.json",
        serde_json::to_vec_pretty(&out).unwrap(),
    )
    .unwrap();
}
