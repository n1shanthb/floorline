"""Boundary/adversarial tests for the admitted model, not NEAR runtime evidence."""
from copy import deepcopy
import unittest

from model import (BASE, BPS, OP_MIN, RECORD, REFUND_SLOTS, SCALE, SELF, U128,
                   U64, Coin, Config, Reject, mint_quote, redeem_quote)


class ModelTests(unittest.TestCase):
    def fresh(self, **kwargs):
        coin = Coin(**kwargs)
        for who in ("bob", "creator", "carol"):
            coin.storage_deposit(who, who, 100)
        return coin

    def rejected(self, coin, method, *args, **kwargs):
        before = deepcopy(coin.__dict__)
        with self.assertRaises(Reject):
            getattr(coin, method)(*args, **kwargs)
        self.assertEqual(before, coin.__dict__, "rejection was not atomic")
        coin.assert_invariants()

    def pay(self, coin, cid, success=True):
        owner = coin.claims[cid].owner
        nonce = coin.withdraw(owner, cid)
        coin.env_send(nonce, success)
        coin.callback(SELF, cid, nonce, success)
        return nonce

    def test_bootstrap_rounds_supply_down_and_separates_deposits(self):
        coin = Coin(Config(initial_price=3*SCALE), reserve=10, storage=20)
        self.assertEqual((coin.r, coin.t), (10, 3))
        self.assertEqual(coin.a, 10+20+OP_MIN)
        self.assertEqual(coin.h+coin.k, 20)
        self.assertGreaterEqual(coin.r*SCALE, coin.cfg.initial_price*coin.t)

    def test_invalid_creator_parameters_and_bootstrap(self):
        for config in (Config(initial_price=0), Config(creator_fee_bps=501),
                       Config(tax_bps=5001), Config(markup_bps=10001), Config(creator=SELF)):
            with self.assertRaises(Reject):
                Coin(config)
        for args in ({"reserve": 0}, {"storage": 1}, {"operational": OP_MIN-1},
                     {"cfg": Config(initial_price=U128), "reserve": 1},
                     {"reserve": U128}):
            with self.assertRaises(Reject):
                Coin(**args)

    def test_fee_is_excluded_before_minting(self):
        coin = self.fresh(cfg=Config(markup_bps=1000, creator_fee_bps=500))
        minted, fee = coin.mint("bob", 100, 1, U64)
        self.assertEqual((minted, fee), (86, 5))
        self.assertEqual((coin.r, coin.f, coin.t), (1095, 5, 1086))
        self.assertGreaterEqual(coin.r*1000, 1000*coin.t)

    def test_fee_extraction_only_consumes_earned_credit(self):
        coin = self.fresh(cfg=Config(creator_fee_bps=500))
        coin.mint("bob", 100, 1, U64)
        r, t = coin.r, coin.t
        self.rejected(coin, "creator_claim", "bob", 1)
        self.rejected(coin, "creator_claim", "creator", 6)
        cid = coin.creator_claim("creator", 5)
        self.pay(coin, cid)
        self.assertEqual((coin.r, coin.t, coin.f), (r, t, 0))
        self.assertEqual(coin.received["creator"], 5)
        self.rejected(coin, "withdraw", "creator", cid)

    def test_partial_and_full_redemption(self):
        coin = self.fresh()
        cid = coin.redeem("alice", 100, 1, U64)
        self.assertEqual(coin.claims[cid].amount, 82)
        self.assertEqual((coin.r, coin.t), (918, 900))
        final = coin.redeem("alice", 900, 918, U64)
        self.assertEqual(coin.claims[final].amount, 918)
        self.assertEqual((coin.r, coin.t, coin.closed), (0, 0, True))
        self.pay(coin, final)
        self.rejected(coin, "mint", "bob", 100, 1, U64)
        self.rejected(coin, "contribute", 10)
        coin.direct_transfer(17)
        self.assertEqual((coin.r, coin.t, coin.u), (0, 0, 17))

    def test_zero_output_and_slippage_do_not_burn(self):
        coin = self.fresh(cfg=Config(initial_price=SCALE//100), reserve=1)
        self.assertEqual(coin.t, 100)
        self.assertEqual(redeem_quote(1, 100, 1, coin.cfg), 0)
        self.rejected(coin, "redeem", "alice", 1, 0, U64)
        self.rejected(coin, "mint", "bob", 0, 0, U64)
        self.rejected(coin, "mint", "bob", 1, U128, U64)
        self.rejected(coin, "redeem", "alice", 100, 2, U64)

    def test_stale_quotes_and_backwards_time(self):
        coin = self.fresh()
        coin.advance_time(10)
        self.rejected(coin, "mint", "bob", 100, 1, 9)
        self.rejected(coin, "redeem", "alice", 10, 1, 9)
        self.rejected(coin, "advance_time", 9)
        old = mint_quote(coin.r, coin.t, 100, coin.cfg)[0]
        coin.contribute(1000)
        self.rejected(coin, "mint", "bob", 100, old, 10)

    def test_contribution_transfer_storage_and_direct_receipt(self):
        coin = self.fresh()
        coin.contribute(100)
        before = (coin.r, coin.t)
        coin.transfer("alice", "bob", 50)
        coin.storage_deposit("sponsor", "bob", 40)
        coin.direct_transfer(100)
        self.assertEqual((coin.r, coin.t), before)
        self.assertEqual(coin.u, 100)
        self.rejected(coin, "transfer", "bob", "unregistered", 1)
        self.rejected(coin, "transfer", "bob", "alice", 1, attached=0)

    def test_overlapping_dispatches_cannot_spend_backing(self):
        coin = self.fresh()
        a = coin.redeem("alice", 100, 1, U64)
        b = coin.redeem("alice", 100, 1, U64)
        na = coin.withdraw("alice", a)
        nb = coin.withdraw("alice", b)
        self.assertEqual(coin.a, coin.required+coin.q+coin.u)
        coin.env_send(nb, True)
        coin.env_send(na, True)
        coin.callback(SELF, a, na, True)
        coin.callback(SELF, b, nb, True)
        self.assertGreaterEqual(coin.a, coin.required)
        self.rejected(coin, "withdraw", "alice", a)

    def test_undebited_other_promise_cannot_mask_missing_refund(self):
        coin = self.fresh()
        a = coin.redeem("alice", 100, 1, U64)
        b = coin.redeem("alice", 100, 1, U64)
        na = coin.withdraw("alice", a)
        coin.withdraw("alice", b)  # deliberately not debited yet
        coin.env_send(na, False)
        coin.callback(SELF, a, na, False)
        self.assertGreaterEqual(coin.a-coin.required, coin.claims[a].amount)
        self.rejected(coin, "retry_failed", "alice", a)
        coin.env_refund(na)
        coin.retry_failed("alice", a)
        self.assertEqual(coin.claims[a].state, "available")

    def test_refund_before_callback_and_delayed_old_refund(self):
        coin = self.fresh()
        cid = coin.redeem("alice", 100, 1, U64)
        nonce = coin.withdraw("alice", cid)
        coin.env_send(nonce, False)
        coin.env_refund(nonce)
        coin.callback(SELF, cid, nonce, False)
        coin.retry_failed("alice", cid)
        again = coin.withdraw("alice", cid)
        coin.env_send(again, False)
        coin.callback(SELF, cid, again, False)
        coin.direct_transfer(coin.claims[cid].amount)
        coin.retry_failed("alice", cid)  # real spare cash may fund restoration
        self.pay(coin, cid)
        coin.env_refund(again)           # old refund becomes U, never a new claim
        self.assertEqual(coin.received["alice"], coin.claims[cid].amount)
        self.rejected(coin, "env_refund", again)
        self.rejected(coin, "callback", SELF, cid, nonce, False)

    def test_missing_callback_is_permanently_unknown_not_retryable(self):
        coin = self.fresh()
        cid = coin.redeem("alice", 100, 1, U64)
        nonce = coin.withdraw("alice", cid)
        coin.env_send(nonce, True)
        coin.advance_time(U64)
        self.rejected(coin, "retry_failed", "alice", cid)
        self.rejected(coin, "withdraw", "alice", cid)
        self.rejected(coin, "callback", "attacker", cid, nonce, True)
        self.rejected(coin, "callback", SELF, cid, nonce, False)

    def test_storage_withdraw_unregister_and_refund_slots(self):
        coin = self.fresh()
        cid = coin.storage_withdraw("bob", 20)
        self.rejected(coin, "storage_withdraw", "bob", 1)
        nonce = coin.claims[cid].attempt
        coin.env_send(nonce, True)
        coin.callback(SELF, cid, nonce, True)
        coin.cleanup(cid)
        unregister = coin.storage_unregister("bob", force=True)
        self.assertNotIn("bob", coin.users)
        n = coin.claims[unregister].attempt
        coin.env_send(n, True)
        coin.callback(SELF, unregister, n, True)
        coin.cleanup(unregister)
        self.rejected(coin, "storage_unregister", "alice", force=True)

    def test_registration_only_refunds_sponsor_and_pool_is_bounded(self):
        coin = self.fresh()
        for _ in range(REFUND_SLOTS):
            cid = coin.storage_deposit("sponsor", "bob", 2, registration_only=True)
            self.assertEqual(coin.claims[cid].owner, "sponsor")
        self.rejected(coin, "storage_deposit", "sponsor", "bob", 2, registration_only=True)
        self.rejected(coin, "storage_deposit", "sponsor", "new", BASE-1, registration_only=True)

    def test_ft_callback_cannot_burn_or_recover_redeemed_tokens(self):
        coin = self.fresh()
        call = coin.transfer_call("alice", "bob", 100)
        self.rejected(coin, "storage_unregister", "bob", force=True)
        coin.redeem("bob", 100, 1, U64)
        self.assertEqual(coin.resolve_ft(SELF, call, None), 100)
        self.rejected(coin, "resolve_ft", SELF, call, 100)
        call2 = coin.transfer_call("alice", "bob", 50)
        coin.transfer("bob", "carol", 30)
        self.assertEqual(coin.resolve_ft(SELF, call2, None), 30)
        call3 = coin.transfer_call("alice", "bob", 10)
        self.assertEqual(coin.resolve_ft(SELF, call3, 0), 10)

    def test_full_exit_during_ft_call_still_closes_forever(self):
        coin = self.fresh()
        call = coin.transfer_call("alice", "bob", coin.t)
        coin.redeem("bob", coin.t, coin.r, U64)
        coin.resolve_ft(SELF, call, None)
        self.assertTrue(coin.closed)
        self.rejected(coin, "mint", "alice", 100, 1, U64)

    def test_storage_exhaustion_is_atomic_and_cleanup_returns_credit(self):
        coin = Coin(storage=BASE)
        self.rejected(coin, "redeem", "alice", 100, 1, U64)
        coin.storage_deposit("alice", "alice", RECORD)
        cid = coin.redeem("alice", 100, 1, U64)
        self.assertEqual(coin.users["alice"].free, 0)
        self.pay(coin, cid)
        coin.cleanup(cid)
        self.assertEqual(coin.users["alice"].free, RECORD)

    def test_u128_wide_rounding_and_id_exhaustion(self):
        cfg = Config(markup_bps=10000, tax_bps=5000, creator_fee_bps=500)
        self.assertEqual(redeem_quote(U128, U128, U128, cfg), U128)
        minted, fee = mint_quote(U128, U128, U128, cfg)
        self.assertLessEqual(minted*U128, (U128-fee)*U128)
        coin = Coin(cfg=Config(initial_price=1), reserve=U128//SCALE)
        self.rejected(coin, "mint", "alice", 100, 1, U64)
        coin = self.fresh()
        coin.next_id = U64  # boundary injection only, before an admitted transition
        self.rejected(coin, "redeem", "alice", 100, 1, U64)

    def test_mint_redeem_cycles_no_external_cash_profit_even_for_creator(self):
        for markup in (0, 1, 500, 10000):
            for fee in (0, 1, 500):
                for tax in (0, 2000, 5000):
                    coin = self.fresh(cfg=Config(markup_bps=markup, creator_fee_bps=fee, tax_bps=tax))
                    for deposit in (10, 101, 1000, 11):
                        minted, charged = coin.mint("bob", deposit, 1, U64)
                        cid = coin.redeem("bob", minted, 1, U64)
                        self.assertLessEqual(coin.claims[cid].amount+charged, deposit)


if __name__ == "__main__":
    unittest.main(verbosity=2)
