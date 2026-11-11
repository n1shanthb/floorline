//! Local stdin/stdout oracle; NOT a chain adapter and never signs anything.
use floorkit_core::*;
use serde_json::{json, Value};
use std::io::{self, BufRead};
fn n(v: &Value) -> u128 {
    v.as_str().unwrap().parse().unwrap()
}
fn config(v: &Value) -> Config {
    Config {
        initial_price: n(&v["initial_price"]),
        markup_bps: v["markup"].as_u64().unwrap() as u16,
        tax_bps: v["tax"].as_u64().unwrap() as u16,
        creator_fee_bps: v["fee"].as_u64().unwrap() as u16,
    }
}
fn main() {
    for line in io::stdin().lock().lines() {
        let v: Value = serde_json::from_str(&line.unwrap()).unwrap();
        let cfg = config(&v);
        let result = if v["kind"] == "quotes" {
            let r = n(&v["r"]);
            let t = n(&v["t"]);
            let m = mint_quote(r, t, n(&v["d"]), &cfg).ok();
            json!({"mint":m.map(|q|vec![q.tokens.to_string(),q.fee.to_string()]),
                "redeem":redeem_quote(r,t,n(&v["c"]),&cfg).ok().map(|q|q.to_string())})
        } else {
            let mut e = Economics::new(n(&v["seed"]), cfg).unwrap();
            let mut rows = vec![];
            for op in v["ops"].as_array().unwrap() {
                let old = e;
                let (old_r, old_t, _, _) = e.snapshot();
                let amount = n(&op["amount"]);
                let now = op["now"].as_u64().unwrap();
                let deadline = op["deadline"].as_u64().unwrap();
                let accepted = match op["method"].as_str().unwrap() {
                    "mint" => e.mint(amount, n(&op["minimum"]), now, deadline).map(|_| ()),
                    "redeem" => e
                        .redeem(amount, n(&op["minimum"]), now, deadline)
                        .map(|_| ()),
                    "contribute" => e.contribute(amount),
                    _ => panic!("bad operation"),
                }
                .is_ok();
                let (r, t, f, closed) = e.snapshot();
                if !accepted {
                    assert_eq!(old, e);
                } // failed transition atomicity
                if old_t > 0 && t > 0 {
                    assert!(backing_nondecreasing(old_r, old_t, r, t));
                }
                assert!((r > 0 && t > 0 && !closed) || (r == 0 && t == 0 && closed));
                rows.push(json!([
                    accepted,
                    r.to_string(),
                    t.to_string(),
                    f.to_string(),
                    closed
                ]));
            }
            json!(rows)
        };
        println!("{}", result);
    }
}
