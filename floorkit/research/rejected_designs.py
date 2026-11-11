"""Reproducible counterexamples to discarded rules, not admitted-model failures."""
import json
from pathlib import Path
from model import Config, redeem_quote


def examples():
    # Even a fee within the proposed 5% cap breaks gross-priced minting.
    r, t, deposit, minted, fee = 100, 100, 100, 100, 5
    assert (r+deposit-fee)*t < r*(t+minted)
    old, supply, new_deposit = 100, 100, 1
    retained = old-(old*8000//10000)
    new_minter_payout = (retained+new_deposit)*8000//10000
    assert new_minter_payout > new_deposit
    cfg = Config(markup_bps=100, creator_fee_bps=0)
    before = redeem_quote(10000, 10000, 1000, cfg)
    after = redeem_quote(20000, 19900, 1000, cfg)
    assert 20000*10000 > 10000*19900 and after < before
    return {"admitted_model_invariant_failure": False,
            "purpose": "Rejected-rule counterexamples and a specifically excluded stronger guarantee",
            "gross_pricing_then_fee": {"R": r, "T": t, "deposit": deposit,
                "minted": minted, "fee": fee, "after_R": r+deposit-fee,
                "after_T": t+minted, "before_B": "1", "after_B_exact": "195/200",
                "finding": "Positive bounded fee can dilute if mint priced from gross deposit"},
            "flat_tax_then_rebootstrap": {"R": old, "T": supply,
                "old_full_payout": 80, "residual": retained, "new_deposit": 1,
                "new_supply": 1, "new_payout": new_minter_payout,
                "finding": "New minter captures old forfeited reserve"},
            "accounting_B_not_fixed_size_quote": {"before_R": 10000,"before_T": 10000,
                "mint_deposit": 10000,"minted": 9900,"markup_bps": 100,
                "creator_fee_bps": 0,"after_R": 20000,"after_T": 19900,
                "redemption_size": 1000,"tax_bps": 2000,
                "before_quote": before,"after_quote": after,
                "finding": "B strictly rises while fixed-size quote falls; stronger payout-floor claim rejected"}}


if __name__ == "__main__":
    result = examples()
    Path(__file__).with_name("REJECTED_DESIGNS.json").write_text(
        json.dumps(result, indent=2)+"\n", encoding="utf8")
    print("Verified discarded-rule counterexamples; no admitted-model invariant failure.")
