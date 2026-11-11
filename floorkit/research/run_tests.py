"""Run all Phase 0 tests; first invariant failure stops generation and is shrunk.

No external packages. Default 10,000 distinct deterministic sequences x 96 steps.
Replay: python run_tests.py --seed <reported seed> --steps 96
"""
import argparse
from collections import Counter
from copy import deepcopy
from dataclasses import asdict, is_dataclass
import hashlib
import io
import json
from pathlib import Path
import platform
import subprocess
import sys
import time
import unittest

from model import Coin, Config, Reject, SELF, SCALE, U128, U64
import test_model

ROOT = Path(__file__).resolve().parent


class Rng:
    def __init__(self, seed):
        self.state = seed & U64

    def next(self):
        self.state = (self.state + 0x9E3779B97F4A7C15) & U64
        value = self.state
        value = ((value ^ (value >> 30))*0xBF58476D1CE4E5B9) & U64
        value = ((value ^ (value >> 27))*0x94D049BB133111EB) & U64
        return value ^ (value >> 31)

    def pick(self, items):
        return items[self.next() % len(items)]

    def amount(self, limit=1000):
        return self.next() % limit + 1


def initial(seed):
    rng = Rng(seed ^ 0x464C4F4F524B4954)
    return dict(cfg=Config(initial_price=rng.pick([SCALE, SCALE//10, 3*SCALE]),
                           markup_bps=rng.pick([0, 1, 500, 10000]),
                           tax_bps=rng.pick([0, 1, 2000, 5000]),
                           creator_fee_bps=rng.pick([0, 1, 100, 500])),
                reserve=rng.amount(100000)+1000, storage=200)


def invoke(coin, op):
    before = deepcopy(coin.__dict__)
    try:
        getattr(coin, op["method"])(*op["args"], **op.get("kwargs", {}))
    except Reject:
        assert before == coin.__dict__, "REJECTED_TRANSITION_CHANGED_STATE"
        coin.assert_invariants()
        return False
    return True


def operation(coin, rng, step, steps):
    actors = ["alice", "bob", "carol", "dave", "creator"]
    who, target = rng.pick(actors), rng.pick(actors)
    kind = rng.next() % 24
    claims = list(coin.claims)
    attempts = list(coin.transport)
    cid = rng.pick(claims) if claims else rng.next() % 10
    nonce = rng.pick(attempts) if attempts else rng.next() % 10
    caller = who
    if cid in coin.claims and rng.next() % 5:
        caller = coin.claims[cid].owner
    args = []
    if kind in (0, 1, 23):
        method = "mint"
        args = [who, U128 if kind == 23 else rng.amount(), U128 if kind == 1 else 1, U64]
    elif kind in (2, 3):
        method = "redeem"
        balance = coin.users[who].tokens if who in coin.users else 0
        amount = balance if kind == 3 and step >= steps*3//4 else min(rng.amount(), max(1, balance-1))
        args = [who, amount, 1, U64]
    elif kind == 4:
        method, args = "contribute", [rng.amount()]
    elif kind == 5:
        method, args = "transfer", [who, target, rng.amount()]
    elif kind == 6:
        method, args = "storage_deposit", [who, target, rng.amount(100)]
    elif kind == 7:
        method, args = "withdraw", [caller, cid]
    elif kind == 8:
        method, args = "env_send", [nonce, bool(rng.next() % 2)]
    elif kind in (9, 20):
        attempt = coin.transport.get(nonce)
        claim_id = attempt.claim_id if attempt else cid
        method, args = "callback", [SELF if kind == 9 else "attacker", claim_id, nonce,
                                    bool(attempt and attempt.phase == "success")]
    elif kind == 10:
        method, args = "env_refund", [nonce]
    elif kind == 11:
        method, args = "retry_failed", [caller, cid]
    elif kind == 12:
        method, args = "cleanup", [cid]
    elif kind == 13:
        method, args = "storage_withdraw", [who, rng.amount(40)]
    elif kind == 14:
        method, args = "storage_unregister", [who, bool(rng.next() % 2)]
    elif kind == 15:
        method, args = "storage_deposit", [who, target, rng.amount(40), True]
    elif kind == 16:
        method, args = "transfer_call", [who, target, rng.amount()]
    elif kind == 17:
        calls = list(coin.calls)
        call = rng.pick(calls) if calls else rng.next() % 10
        method, args = "resolve_ft", [SELF if rng.next() % 5 else "attacker", call,
                                      rng.pick([None, 0, rng.amount(), U128])]
    elif kind == 18:
        method, args = "advance_time", [min(U64, coin.now+rng.amount(100)) if rng.next() % 3
                                        else max(0, coin.now-1)]
    elif kind == 19:
        method, args = "direct_transfer", [rng.amount()]
    elif kind == 21:
        method, args = "redeem", [who, rng.amount(), U128, max(0, coin.now-1)]
    elif kind == 22:
        method, args = "creator_claim", ["creator" if rng.next() % 4 else who,
                                        min(rng.amount(), max(1, coin.f))]
    return {"method": method, "args": args}


def encode(value):
    return asdict(value) if is_dataclass(value) else str(value)


def fingerprint_failure(start, operations):
    try:
        coin = Coin(**start)
        for op in operations:
            invoke(coin, op)
    except AssertionError as error:
        return str(error)
    return None


def minimize(start, operations, fingerprint):
    """Deletion-1-minimal trace; not a claim of globally minimal state/amounts."""
    trace = list(operations)
    changed = True
    while changed:
        changed = False
        for index in range(len(trace)):
            candidate = trace[:index]+trace[index+1:]
            if fingerprint_failure(start, candidate) == fingerprint:
                trace = candidate
                changed = True
                break
    return trace


def safety():
    manifest = json.loads((ROOT/"REPOSITORY_SAFETY.json").read_text(encoding="utf8"))
    project = ROOT.parents[1]
    changed = [p for p, expected in manifest["protected_sha256"].items()
               if not (project/p).is_file() or
               hashlib.sha256((project/p).read_bytes()).hexdigest() != expected]
    assert not changed, "PROTECTED_FILES_CHANGED: "+repr(changed)
    return len(manifest["protected_sha256"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sequences", type=int, default=10000)
    parser.add_argument("--steps", type=int, default=96)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    if args.sequences <= 0 or args.steps <= 0:
        parser.error("positive sequence/step counts required")
    protected = safety()
    stream = io.StringIO()
    unit = unittest.TextTestRunner(stream=stream, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromModule(test_model))
    (ROOT/"UNIT_TEST_RESULTS.txt").write_text(stream.getvalue(), encoding="utf8")
    if not unit.wasSuccessful():
        print(stream.getvalue())
        print("STOP: boundary/adversarial suite failed; no randomized pass claimed.")
        return 1
    seeds = [args.seed] if args.seed is not None else range(args.sequences)
    accepted, rejected = Counter(), Counter()
    configs = set()
    start_time = time.monotonic()
    trace_digest = hashlib.sha256()
    for index, seed in enumerate(seeds):
        start = initial(seed)
        configs.add((start["cfg"].initial_price, start["cfg"].markup_bps,
                     start["cfg"].tax_bps, start["cfg"].creator_fee_bps))
        coin = Coin(**start)
        rng = Rng(seed ^ 0xD1B54A32D192ED03)
        trace = []
        try:
            for who in ("bob", "carol", "dave", "creator"):
                op = {"method": "storage_deposit", "args": [who, who, 100]}
                trace.append(op)
                invoke(coin, op)
                accepted[op["method"]] += 1
            for step in range(args.steps):
                op = operation(coin, rng, step, args.steps)
                trace.append(op)
                result = invoke(coin, op)
                (accepted if result else rejected)[op["method"]] += 1
                trace_digest.update(json.dumps([seed, op, result], sort_keys=True).encode())
        except AssertionError as error:
            failure = {"seed": seed, "step": len(trace), "invariant": str(error),
                       "initial": start, "trace": trace, "state": coin.__dict__}
            (ROOT/"FAILING_SEED.json").write_text(json.dumps(failure, indent=2, default=encode), encoding="utf8")
            minimum = minimize(start, trace, str(error))
            (ROOT/"MINIMAL_COUNTEREXAMPLE.json").write_text(json.dumps(
                {"seed": seed, "invariant": str(error), "initial": start,
                 "deletion_1_minimal_trace": minimum}, indent=2, default=encode), encoding="utf8")
            print(f"STOP: invariant {error!s}, seed={seed}; failing trace and minimization saved.")
            return 1
        if (index+1) % 1000 == 0:
            print(f"PASS {index+1} sequences", flush=True)
    protected = safety()
    result = {"status": "PASSED", "model_only_not_runtime": True,
              "python": platform.python_version(), "rng": "SplitMix64 explicit constants in run_tests.py",
              "unit_tests": unit.testsRun, "random_sequences": len(seeds),
              "seed_range": [seeds[0], seeds[-1]], "steps_per_sequence": args.steps,
              "bootstrap_operations_per_sequence": 4,
              "operations": sum(accepted.values())+sum(rejected.values()),
              "accepted_by_method": dict(sorted(accepted.items())),
              "expected_rejections_by_method": dict(sorted(rejected.items())),
              "distinct_configs": len(configs), "trace_sha256": trace_digest.hexdigest(),
              "elapsed_seconds": round(time.monotonic()-start_time, 3),
              "failing_seeds": [], "counterexamples": None,
              "protected_files_unchanged": protected,
              "source_sha256": {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
                                for name in ("model.py", "test_model.py", "run_tests.py")}}
    name = "TEST_RESULTS.json" if args.seed is None else f"REPLAY_SEED_{args.seed}.json"
    (ROOT/name).write_text(json.dumps(result, indent=2)+"\n", encoding="utf8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    raise SystemExit(main())
