"""FloorKit Phase 0 reference only: no SDK, RPC, filesystem keys or transactions.

Amounts are integer yoctoNEAR / atomic FT units (24 decimals). Storage costs are
small *abstract* units, not estimates of serialized NEAR contract costs.
env_* methods are trusted transport events, NOT proposed public contract methods.
"""
from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from functools import wraps

U128 = (1 << 128) - 1
U64 = (1 << 64) - 1
WIDE = (1 << 512) - 1
SCALE = 10**24
BPS = 10_000
BASE = 4
RECORD = 2
CALL = 2
CODE = 10
REFUND_SLOTS = 8
REFUND_COST = 2
OP_MIN = CODE + REFUND_SLOTS * REFUND_COST + 10
SELF = "contract"


class Reject(ValueError):
    """Expected atomic precondition rejection, never an invariant failure."""


def need(condition: bool, message: str) -> None:
    if not condition:
        raise Reject(message)


def uint(n: int, maximum: int = U128) -> int:
    need(type(n) is int and 0 <= n <= maximum, "unsigned integer overflow/type")
    return n


def add(a: int, b: int) -> int:
    return uint(a + b)


def sub(a: int, b: int) -> int:
    return uint(a - b)


def mul(*values: int) -> int:
    result = 1
    for value in values:
        uint(value, WIDE)
        result *= value
        need(result <= WIDE, "512-bit intermediate overflow")
    return result


@dataclass(frozen=True)
class Config:
    initial_price: int = SCALE
    markup_bps: int = 500
    tax_bps: int = 2000
    creator_fee_bps: int = 100
    creator: str = "creator"

    def validate(self) -> None:
        need(uint(self.initial_price) > 0, "positive initial price")
        need(type(self.markup_bps) is int and 0 <= self.markup_bps <= 10_000,
             "markup outside policy bounds")
        need(type(self.tax_bps) is int and 0 <= self.tax_bps <= 5000,
             "tax outside policy bounds")
        need(type(self.creator_fee_bps) is int and 0 <= self.creator_fee_bps <= 500,
             "fee outside policy bounds")
        need(bool(self.creator) and self.creator != SELF, "invalid creator")


def mint_quote(reserve: int, supply: int, deposit: int, cfg: Config) -> tuple[int, int]:
    cfg.validate()
    need(uint(reserve) > 0 and uint(supply) > 0 and uint(deposit) > 0, "inactive/dust")
    fee = mul(deposit, cfg.creator_fee_bps) // BPS
    net = deposit - fee
    minted = uint(mul(net, supply, BPS) // mul(reserve, BPS + cfg.markup_bps))
    need(minted > 0, "zero minted amount")
    return minted, fee


def redeem_quote(reserve: int, supply: int, amount: int, cfg: Config) -> int:
    cfg.validate()
    need(uint(reserve) > 0 and uint(supply) > 0 and 0 < uint(amount) <= supply,
         "invalid redemption")
    # One final floor. The tax parameter is scaled by the remaining supply share.
    factor = mul(BPS - cfg.tax_bps, supply) + mul(cfg.tax_bps, amount)
    return uint(mul(reserve, amount, factor) // mul(BPS, supply, supply))


@dataclass
class User:
    tokens: int = 0
    free: int = 0
    used: int = BASE


@dataclass
class Claim:
    owner: str
    amount: int
    kind: str
    payer: str | None
    cost: int
    pooled: bool = False
    state: str = "available"
    attempt: int | None = None


@dataclass
class Attempt:
    claim_id: int
    owner: str
    amount: int
    phase: str = "queued"


@dataclass
class FtCall:
    sender: str
    receiver: str
    amount: int
    payer: str


def atomic(method):
    @wraps(method)
    def apply(self: Coin, *args, **kwargs):
        before = deepcopy(self.__dict__)
        try:
            result = method(self, *args, **kwargs)
        except Reject:
            self.__dict__.clear()
            self.__dict__.update(before)
            raise
        self.assert_invariants()
        old_r, old_t = before["r"], before["t"]
        if old_t and self.t:
            assert self.r * old_t >= old_r * self.t, "BACKING_DECREASE"
        if before["closed"]:
            assert self.closed and self.r == self.t == 0, "TERMINAL_REOPEN"
        assert self.cfg == before["cfg"], "ECONOMICS_CHANGED"
        return result
    return apply


class Coin:
    def __init__(self, cfg: Config = Config(), reserve: int = 1000,
                 storage: int = 200, operational: int = OP_MIN,
                 recipient: str = "alice"):
        cfg.validate()
        need(uint(reserve) > 0 and uint(storage) >= BASE and uint(operational) >= OP_MIN,
             "underfunded bootstrap")
        need(bool(recipient) and recipient != SELF, "invalid bootstrap recipient")
        self.cfg = cfg
        self.r = reserve
        self.t = uint(mul(reserve, SCALE) // cfg.initial_price)
        need(self.t > 0, "bootstrap dust")
        self.o = operational
        self.a = uint(reserve + storage + operational)
        self.u = 0  # classified incoming unallocated cash; NEVER inferred from A - P
        self.f = 0  # earned creator fee credit not yet converted to a claim
        self.users = {recipient: User(self.t, storage - BASE)}
        self.claims: dict[int, Claim] = {}
        self.calls: dict[int, FtCall] = {}
        self.transport: dict[int, Attempt] = {}  # environment-only, not contract storage
        self.received: dict[str, int] = {}       # environment cumulative audit totals
        self.next_id = 0
        self.now = 0
        self.closed = False
        self.assert_invariants()

    def fresh_id(self) -> int:
        value = self.next_id
        self.next_id = uint(value + 1, U64)
        return value

    def user(self, who: str) -> User:
        need(who in self.users, "registration required")
        return self.users[who]

    def active(self) -> None:
        need(not self.closed and self.r > 0 and self.t > 0, "permanently closed")

    def deadline(self, deadline: int) -> None:
        need(self.now <= uint(deadline, U64), "expired quote")

    def one(self, attached: int) -> None:
        need(attached == 1 and type(attached) is int, "exact one yocto required")
        self.a = add(self.a, 1)
        self.o = add(self.o, 1)

    def charge(self, payer: str, cost: int) -> None:
        user = self.user(payer)
        user.free = sub(user.free, cost)
        user.used = add(user.used, cost)

    def release(self, payer: str, cost: int) -> None:
        user = self.user(payer)
        user.used = sub(user.used, cost)
        user.free = add(user.free, cost)

    @property
    def c(self) -> int:
        return sum(claim.amount for claim in self.claims.values() if claim.state == "available")

    @property
    def i(self) -> int:
        return sum(claim.amount for claim in self.claims.values()
                   if claim.state in ("inflight", "failed"))

    @property
    def q(self) -> int:
        # Unknown on-chain; test oracle measures native sends not debited yet.
        return sum(attempt.amount for attempt in self.transport.values()
                   if attempt.phase == "queued")

    @property
    def h(self) -> int:
        return sum(user.free for user in self.users.values())

    @property
    def k(self) -> int:
        return sum(user.used for user in self.users.values())

    @property
    def required(self) -> int:
        return self.r + self.f + self.c + self.h + self.k + self.o

    def new_claim(self, owner: str, amount: int, kind: str, payer: str | None,
                  pooled: bool = False) -> int:
        need(uint(amount) > 0, "zero claim")
        cost = RECORD if kind in ("redemption", "creator") else 0
        if cost:
            need(payer is not None, "record payer required")
            self.charge(payer, cost)
        if pooled:
            need(sum(c.pooled for c in self.claims.values()) < REFUND_SLOTS,
                 "operational refund pool full")
        elif kind == "storage":
            need(not any(c.owner == owner and c.kind == "storage" and not c.pooled
                         for c in self.claims.values()), "registered refund slot busy")
        cid = self.fresh_id()
        self.claims[cid] = Claim(owner, amount, kind, payer, cost, pooled)
        return cid

    def dispatch(self, cid: int) -> int:
        claim = self.claims.get(cid)
        need(claim is not None and claim.state == "available", "claim not available")
        uint(self.i + claim.amount)
        nonce = self.fresh_id()
        claim.state, claim.attempt = "inflight", nonce
        self.transport[nonce] = Attempt(cid, claim.owner, claim.amount)
        return nonce

    @atomic
    def mint(self, caller: str, deposit: int, min_tokens: int, deadline: int) -> tuple[int, int]:
        self.active()
        self.deadline(deadline)
        user = self.user(caller)
        minted, fee = mint_quote(self.r, self.t, deposit, self.cfg)
        need(minted >= uint(min_tokens), "mint slippage")
        self.a = add(self.a, deposit)
        self.r = add(self.r, deposit - fee)
        self.f = add(self.f, fee)
        self.t = add(self.t, minted)
        user.tokens = add(user.tokens, minted)
        return minted, fee

    @atomic
    def redeem(self, caller: str, amount: int, min_near: int, deadline: int,
               attached: int = 1) -> int:
        self.active()
        self.deadline(deadline)
        user = self.user(caller)
        need(0 < uint(amount) <= user.tokens, "unavailable tokens")
        payout = redeem_quote(self.r, self.t, amount, self.cfg)
        need(payout > 0 and payout >= uint(min_near), "zero/slippage redemption")
        self.one(attached)
        cid = self.new_claim(caller, payout, "redemption", caller)
        user.tokens = sub(user.tokens, amount)
        self.t = sub(self.t, amount)
        self.r = sub(self.r, payout)
        if self.t == 0:
            assert self.r == 0, "ZERO_SUPPLY_RESIDUE"
            self.closed = True
        return cid

    @atomic
    def contribute(self, deposit: int) -> None:
        self.active()
        need(uint(deposit) > 0, "positive contribution")
        self.a, self.r = add(self.a, deposit), add(self.r, deposit)

    @atomic
    def direct_transfer(self, deposit: int) -> None:
        need(uint(deposit) > 0, "positive native receipt")
        self.a, self.u = add(self.a, deposit), add(self.u, deposit)

    @atomic
    def transfer(self, caller: str, receiver: str, amount: int, attached: int = 1) -> None:
        need(caller != receiver and uint(amount) > 0, "invalid transfer")
        sender, target = self.user(caller), self.user(receiver)
        self.one(attached)
        sender.tokens = sub(sender.tokens, amount)
        target.tokens = add(target.tokens, amount)

    @atomic
    def transfer_call(self, caller: str, receiver: str, amount: int,
                      attached: int = 1) -> int:
        need(caller != receiver and uint(amount) > 0, "invalid transfer call")
        sender, target = self.user(caller), self.user(receiver)
        self.one(attached)
        self.charge(caller, CALL)
        sender.tokens = sub(sender.tokens, amount)
        target.tokens = add(target.tokens, amount)
        cid = self.fresh_id()
        self.calls[cid] = FtCall(caller, receiver, amount, caller)
        return cid

    @atomic
    def resolve_ft(self, caller: str, call_id: int, unused: int | None) -> int:
        need(caller == SELF, "private FT callback")
        call = self.calls.get(call_id)
        need(call is not None, "missing/resolved FT call")
        # None represents panic/malformed result => request full refund.
        wanted = call.amount if unused is None else min(uint(unused), call.amount)
        refunded = min(wanted, self.user(call.receiver).tokens)
        self.user(call.receiver).tokens -= refunded
        self.user(call.sender).tokens = add(self.user(call.sender).tokens, refunded)
        self.release(call.payer, CALL)
        del self.calls[call_id]
        return call.amount - refunded  # NEP-141 used amount

    @atomic
    def creator_claim(self, caller: str, amount: int, attached: int = 1) -> int:
        need(caller == self.cfg.creator, "creator credit owner only")
        need(0 < uint(amount) <= self.f, "unearned fee")
        self.one(attached)
        cid = self.new_claim(caller, amount, "creator", caller)
        self.f -= amount
        return cid

    @atomic
    def withdraw(self, caller: str, cid: int, attached: int = 1) -> int:
        need(cid in self.claims and self.claims[cid].owner == caller, "claim owner only")
        self.one(attached)
        return self.dispatch(cid)

    @atomic
    def env_send(self, nonce: int, successful: bool) -> None:
        attempt = self.transport.get(nonce)
        need(attempt is not None and attempt.phase == "queued", "send already executed")
        need(type(successful) is bool, "transport result type")
        self.a = sub(self.a, attempt.amount)
        attempt.phase = "success" if successful else "failure"
        if successful:
            self.received[attempt.owner] = self.received.get(attempt.owner, 0) + attempt.amount

    @atomic
    def callback(self, caller: str, cid: int, nonce: int, successful: bool) -> None:
        need(caller == SELF, "private native callback")
        claim = self.claims.get(cid)
        need(claim is not None and claim.state == "inflight" and claim.attempt == nonce,
             "duplicate/stale native callback")
        attempt = self.transport.get(nonce)
        need(attempt is not None and attempt.claim_id == cid, "wrong promise")
        need(type(successful) is bool, "promise result type")
        need((successful and attempt.phase == "success") or
             (not successful and attempt.phase in ("failure", "refunded")),
             "callback inconsistent with trusted promise result")
        claim.state = "paid" if successful else "failed"

    @atomic
    def env_refund(self, nonce: int) -> None:
        attempt = self.transport.get(nonce)
        need(attempt is not None and attempt.phase == "failure", "refund unavailable/duplicate")
        self.a = add(self.a, attempt.amount)
        self.u = add(self.u, attempt.amount)
        attempt.phase = "refunded"

    @atomic
    def retry_failed(self, caller: str, cid: int, attached: int = 1) -> None:
        claim = self.claims.get(cid)
        need(claim is not None and claim.owner == caller and claim.state == "failed",
             "only known failure is retryable")
        self.one(attached)
        # A-P alone includes undebited OTHER promises. Reserve all unresolved I.
        need(self.a >= self.required + self.i, "refund/cushion not locally available")
        self.u = sub(self.u, claim.amount)
        claim.state = "available"

    @atomic
    def cleanup(self, cid: int) -> None:
        claim = self.claims.get(cid)
        need(claim is not None and claim.state == "paid", "unpaid record")
        if claim.cost:
            self.release(claim.payer, claim.cost)
        del self.claims[cid]

    @atomic
    def storage_deposit(self, sponsor: str, account: str, deposit: int,
                        registration_only: bool = False) -> int | None:
        need(account != SELF and bool(account), "invalid registered account")
        need(uint(deposit) > 0, "positive storage deposit")
        existing = account in self.users
        if not existing:
            need(deposit >= BASE, "registration minimum")
        retained = 0 if existing and registration_only else BASE if registration_only else deposit
        if not existing:
            need(retained >= BASE, "registration minimum")
            self.users[account] = User(0, retained - BASE)
        else:
            self.users[account].free = add(self.users[account].free, retained)
        self.a = add(self.a, deposit)
        excess = deposit - retained
        if excess:
            cid = self.new_claim(sponsor, excess, "excess", None, pooled=True)
            self.dispatch(cid)  # real adapter must schedule standard NEP-145 refund
            return cid
        return None

    @atomic
    def storage_withdraw(self, caller: str, amount: int, attached: int = 1) -> int | None:
        user = self.user(caller)
        need(uint(amount) <= user.free, "unavailable storage credit")
        self.one(attached)
        if not amount:
            return None
        cid = self.new_claim(caller, amount, "storage", caller)
        user.free -= amount
        self.dispatch(cid)
        return cid

    @atomic
    def storage_unregister(self, caller: str, force: bool = False, attached: int = 1) -> int:
        user = self.user(caller)
        need(type(force) is bool, "force type")
        need(user.tokens == 0 and user.used == BASE, "live tokens or storage allocations")
        need(not any(c.owner == caller or c.payer == caller for c in self.claims.values()),
             "claim rights remain; cleanup required")
        need(not any(c.sender == caller or c.receiver == caller for c in self.calls.values()),
             "FT callback pending")
        self.one(attached)
        total = user.free + user.used
        del self.users[caller]
        cid = self.new_claim(caller, total, "unregister", None, pooled=True)
        self.dispatch(cid)
        return cid

    @atomic
    def advance_time(self, timestamp: int) -> None:
        need(self.now <= uint(timestamp, U64), "time cannot go backwards")
        self.now = timestamp

    def assert_invariants(self) -> None:
        for amount in (self.a, self.r, self.t, self.o, self.u, self.f,
                       self.h, self.k, self.c, self.i, self.required):
            assert type(amount) is int and 0 <= amount <= U128, "U128_STATE"
        assert 0 <= self.now <= U64 and 0 <= self.next_id <= U64, "U64_STATE"
        assert sum(user.tokens for user in self.users.values()) == self.t, "SUPPLY_PARTITION"
        assert self.a == self.required + self.u + self.q, "CASH_PARTITION"
        assert self.a >= self.required and self.q <= self.i, "LOCAL_SOLVENCY"
        assert self.o >= OP_MIN, "OPERATIONAL_RESERVE"
        assert self.closed == (self.t == 0), "CLOSURE_STATE"
        assert (self.t > 0 and self.r > 0) or (self.closed and self.r == 0), "ZERO_SUPPLY_RESERVE"
        pooled = sum(c.pooled for c in self.claims.values())
        assert pooled <= REFUND_SLOTS, "REFUND_POOL"
        stake = CODE + self.k + pooled * REFUND_COST
        assert stake <= self.k + self.o, "STORAGE_SOLVENCY"
        for who, user in self.users.items():
            costs = BASE + sum(c.cost for c in self.claims.values() if c.payer == who)
            costs += CALL * sum(c.payer == who for c in self.calls.values())
            assert user.used == costs, "MEASURED_STORAGE_PARTITION"
            assert 0 <= user.tokens <= U128 and 0 <= user.free <= U128, "USER_BOUNDS"
        for claim in self.claims.values():
            assert claim.amount > 0 and claim.state in ("available", "inflight", "failed", "paid"), "CLAIM_STATE"
            if claim.cost:
                assert claim.payer in self.users, "CLAIM_PAYER_MISSING"
        for call in self.calls.values():
            assert call.sender in self.users and call.receiver in self.users, "FT_PARTICIPANT_MISSING"
