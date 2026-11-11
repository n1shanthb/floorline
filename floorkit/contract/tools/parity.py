"""Compare native Rust economics to UNCHANGED Phase 0; no RPC/signing/keys.

This intentionally tests only economic state and quote parity, NOT the complete
Phase 0 claim/storage/transport state machine or a WASM runtime adapter.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT.parent / "research"
sys.path.insert(0, str(RESEARCH))
from model import Coin, Config, Reject, U128, U64, SCALE, mint_quote, redeem_quote
from run_tests import Rng, safety


def encode(value):
    return json.dumps(value, separators=(",", ":"))


def main():
    exe = ROOT / "target/debug/examples/parity.exe"
    assert exe.is_file(), "Build with cargo build --offline --locked --example parity"
    process = subprocess.Popen([str(exe)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               text=True, encoding="utf8", bufsize=1)
    digest = hashlib.sha256()
    accepted = rejected = cases = 0

    def compare(request, expected, context):
        process.stdin.write(encode(request) + "\n")
        process.stdin.flush()
        line = process.stdout.readline()
        assert line, f"Rust runner exited: {context}"
        actual = json.loads(line)
        if actual != expected:
            failure = dict(context=context, request=request, expected=expected, actual=actual)
            (ROOT / "evidence/FIRST_DIVERGENCE.json").write_text(
                json.dumps(failure, indent=2) + "\n", encoding="utf8")
            raise AssertionError(f"STOP: model divergence at {context}")
        digest.update((encode([request, actual]) + "\n").encode())

    try:
        for seed in range(10000):
            rng = Rng(seed)
            cfg = Config(initial_price=rng.pick([SCALE, SCALE//10, 3*SCALE]),
                         markup_bps=rng.pick([0, 1, 500, 10000]),
                         tax_bps=rng.pick([0, 1, 2000, 5000]),
                         creator_fee_bps=rng.pick([0, 1, 100, 500]))
            seed_reserve = 10000 + rng.amount(10000)
            coin = Coin(cfg, reserve=seed_reserve, storage=10000)
            ops, expected = [], []
            for step in range(64):
                # Monotonic chain time with equal timestamps, expiry and U64 limit.
                now = min(U64, coin.now + rng.next() % 100)
                coin.advance_time(now)
                deadline = max(0, now - 1) if step % 7 == 0 else U64
                kind = rng.pick(["mint", "redeem", "contribute"])
                amount = rng.amount(10000)
                if step % 17 == 0:
                    amount = coin.t  # genuine full exit, then rejection of reopening
                if step % 19 == 0:
                    amount = 0
                minimum = U128 if step % 13 == 0 else 0
                before = deepcopy(coin.__dict__)
                try:
                    if kind == "mint":
                        coin.mint("alice", amount, minimum, deadline)
                    elif kind == "redeem":
                        coin.redeem("alice", amount, minimum, deadline)
                    else:
                        coin.contribute(amount)
                except Reject:
                    assert coin.__dict__ == before
                    ok = False
                    rejected += 1
                else:
                    ok = True
                    accepted += 1
                ops.append(dict(method=kind, amount=str(amount), minimum=str(minimum),
                                now=now, deadline=deadline))
                expected.append([ok, str(coin.r), str(coin.t), str(coin.f), coin.closed])
            request = dict(kind="sequence")
            request.update(seed=str(seed_reserve),
                           initial_price=str(cfg.initial_price), markup=cfg.markup_bps,
                           tax=cfg.tax_bps, fee=cfg.creator_fee_bps, ops=ops)
            compare(request, expected, dict(seed=seed, stage="sequence"))
            if seed % 2000 == 0:
                print(f"Completed economic sequences: {seed + 1}", flush=True)

        rng = Rng(0xF100C017)
        for index in range(10000):
            def full():
                return ((rng.next() << 64) | rng.next()) or 1
            r, t, d = full(), full(), full()
            c = t if index % 20 == 0 else full() % t + 1
            cfg = Config(markup_bps=rng.pick([0,1,500,10000]),
                         tax_bps=rng.pick([0,1,2000,5000]),
                         creator_fee_bps=rng.pick([0,1,100,500]))
            try:
                m, f = mint_quote(r, t, d, cfg)
                mint = [str(m), str(f)]
            except Reject:
                mint = None
            compare(dict(kind="quotes", r=str(r), t=str(t), d=str(d), c=str(c),
                         initial_price=str(cfg.initial_price), markup=cfg.markup_bps,
                         tax=cfg.tax_bps, fee=cfg.creator_fee_bps),
                    dict(mint=mint, redeem=str(redeem_quote(r,t,c,cfg))),
                    dict(index=index, stage="full_width_quotes"))
            cases += 1
    finally:
        process.stdin.close()
        process.wait(timeout=20)

    assert process.returncode == 0
    result = dict(status="PASS", scope="native Rust economic core only, not WASM or full state parity",
                  sequences=10000, steps_per_sequence=64, operations=640000,
                  accepted=accepted, rejected=rejected, full_width_quote_cases=cases,
                  failing_seeds=[], trace_sha256=digest.hexdigest(),
                  protected_preexisting_files=safety(),
                  source_sha256={str(p.relative_to(ROOT.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest()
                                 for p in [RESEARCH/"model.py",ROOT/"src/lib.rs",ROOT/"examples/parity.rs",Path(__file__)]})
    (ROOT / "evidence/ECONOMIC_PARITY.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
