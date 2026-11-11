"""Independent rational oracle and two-object reserve isolation; stdlib only."""
from copy import deepcopy
from fractions import Fraction
import hashlib
import json
from pathlib import Path

from model import BPS, U128, U64, Coin, Config, Reject, mint_quote, redeem_quote
from run_tests import Rng, safety


def main():
    safety()
    rng = Rng(0xF100C017)
    digest = hashlib.sha256()
    mint_rejections = 0
    for index in range(10000):
        def u128():
            return ((rng.next() << 64) | rng.next()) or 1
        r, t, deposit = u128(), u128(), u128()
        amount = t if index % 20 == 0 else u128() % t + 1
        cfg = Config(markup_bps=rng.pick([0, 1, 500, 10000]),
                     tax_bps=rng.pick([0, 1, 2000, 5000]),
                     creator_fee_bps=rng.pick([0, 1, 100, 500]))
        # Factorized Fraction oracle: no intermediate integer truncations.
        pro_rata = Fraction(r*amount, t)
        retained_rate = Fraction(cfg.tax_bps, BPS)*(1-Fraction(amount, t))
        expected_q = (pro_rata*(1-retained_rate)).__floor__()
        actual_q = redeem_quote(r, t, amount, cfg)
        assert actual_q == expected_q, f"FRACTION_REDEMPTION_MISMATCH:{index}"
        fee = Fraction(deposit*cfg.creator_fee_bps, BPS).__floor__()
        price = Fraction(r, t)*(1+Fraction(cfg.markup_bps, BPS))
        expected_m = (Fraction(deposit-fee, 1)/price).__floor__()
        try:
            actual_m, actual_fee = mint_quote(r, t, deposit, cfg)
        except Reject:
            assert expected_m == 0 or expected_m > U128, f"UNEXPECTED_QUOTE_REJECTION:{index}"
            mint_rejections += 1
        else:
            assert (actual_m, actual_fee) == (expected_m, fee), f"FRACTION_MINT_MISMATCH:{index}"
        digest.update(json.dumps([r,t,deposit,amount,expected_q,expected_m,fee]).encode())
    a = Coin(Config(markup_bps=500), recipient="alice")
    b = Coin(Config(markup_bps=10000, creator_fee_bps=500), reserve=1234, recipient="alice")
    frozen_b = deepcopy(b.__dict__)
    a.contribute(100)
    a.mint("alice", 200, 1, U64)
    a.redeem("alice", 50, 1, U64)
    assert b.__dict__ == frozen_b, "CROSS_INSTANCE_RESERVE_CONTAMINATION"
    frozen_a = deepcopy(a.__dict__)
    b.redeem("alice", b.t, b.r, U64)
    assert a.__dict__ == frozen_a and b.closed, "CROSS_INSTANCE_CLOSURE_CONTAMINATION"
    result = {"status":"PASSED","model_only_not_runtime":True,
              "fraction_cases":10000,"seed":0xF100C017,
              "expected_mint_overflow_or_dust_rejections":mint_rejections,
              "oracle_trace_sha256":digest.hexdigest(),
              "two_manual_instance_state_isolation":"PASSED",
              "protected_files_unchanged":safety()}
    Path(__file__).with_name("EXTRA_CHECKS.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
    print(json.dumps(result,indent=2))


if __name__ == "__main__":
    main()
