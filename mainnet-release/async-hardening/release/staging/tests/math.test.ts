import { describe, expect, it } from "vitest";
import {
  canRepay,
  canonicalId,
  exact,
  issuance,
  parseAmount,
  quote,
  ratio,
  SCALE,
  U128_MAX,
  units,
  validAccount,
} from "../src/lib/math";
import { classifyOutcome, classifyWithdrawal } from "../src/lib/rpc";
import { transition, isExplicitWalletRejection } from "../src/lib/transaction";
import evidence from "../src/data/evidence.json";
describe("exact amount boundaries", () => {
  it.each([
    "0",
    "0.000000000000000000000001",
    "1",
    "1.9",
    "2.019",
    "123456789123.123456789123456789123456",
  ])("round trips %s without Number", (s) =>
    expect(parseAmount(exact(parseAmount(s)))).toBe(parseAmount(s)),
  );
  it.each([
    "",
    "-1",
    "+1",
    "1e24",
    "0.0000000000000000000000001",
    "1,000",
    "01",
    "1.",
    " 1",
    "NaN",
  ])("rejects %s", (s) => expect(() => parseAmount(s)).toThrow());
  it("rejects overflows and supports U128 max", () => {
    expect(parseAmount(exact(U128_MAX))).toBe(U128_MAX);
    expect(() => parseAmount(exact(U128_MAX + 1n))).toThrow();
  });
  it("truncates display only, keeping exact review precision", () => {
    expect(units("2019000000000000000000000")).toBe("2.019");
    expect(
      ratio("2019000000000000000000000", "1900000000000000000000000", 12),
    ).toBe("1.062631578947");
    expect(ratio("0", "0")).toBe("—");
  });
});
describe("contract-compatible economics", () => {
  it("reproduces historical Bob redemption exactly", () =>
    expect(quote(2n * SCALE, 2n * SCALE, SCALE / 10n, 2000n)).toBe(
      parseAmount("0.081"),
    ));
  it("quotes the current state independently of the old rate", () => {
    expect(
      quote(parseAmount("2.019"), parseAmount("1.9"), SCALE / 10n, 2000n),
    ).not.toBe(parseAmount("0.081"));
  });
  it("full redemption returns all backing; atomic dust may quote zero", () => {
    expect(quote(2019n, 1900n, 1900n, 2000n)).toBe(2019n);
    expect(quote(1n, 1000000n, 1n, 2000n)).toBe(0n);
  });
  it.each([
    [1n, 0n, 1n, 2000n],
    [1n, 1n, 0n, 2000n],
    [1n, 1n, 2n, 2000n],
    [1n, 1n, 1n, 10000n],
  ])("rejects invalid curve input", (...args) =>
    expect(() =>
      quote(...(args as [bigint, bigint, bigint, bigint])),
    ).toThrow(),
  );
  it("handles near-maximum products wider than 128 bits", () => {
    expect(quote(U128_MAX, U128_MAX, U128_MAX, 9999n)).toBe(U128_MAX);
  });
  it("rejects nondilutive guard failure at demo state", () =>
    expect(
      issuance(SCALE, parseAmount("2.019"), parseAmount("1.9")).allowed,
    ).toBe(false));
  it("accepts genesis and equal-backing issue, rejects dust/overflow", () => {
    expect(issuance(SCALE, 0n, 0n).allowed).toBe(true);
    expect(issuance(SCALE, SCALE, SCALE).allowed).toBe(true);
    expect(issuance(1n, 1n, 1n, 1n, 2n).allowed).toBe(false);
    expect(issuance(1n, U128_MAX, U128_MAX).allowed).toBe(false);
  });
  it("checks 10000 deterministic adversarial integer curve cases", () => {
    let seed = 0x46524cn;
    const next = () => {
      seed =
        (seed * 6364136223846793005n + 1442695040888963407n) &
        ((1n << 128n) - 1n);
      return seed;
    };
    for (let i = 0; i < 10000; i++) {
      const l = next() || 1n,
        t = next() || 1n,
        c = (next() % t) + 1n,
        tax = next() % 10000n;
      const q = quote(l, t, c, tax),
        num = l * c * ((10000n - tax) * t + tax * c),
        den = 10000n * t * t;
      expect(q * den <= num && num < (q + 1n) * den).toBe(true);
      expect(q <= l).toBe(true);
      if (c < t) expect((l - q) * t >= l * (t - c)).toBe(true);
    }
  });
});
describe("identity, permissions and evidence labels", () => {
  it("requires canonical U64 IDs", () => {
    expect(canonicalId("2")).toBe(true);
    for (const id of ["02", "-1", "18446744073709551616", "2e1"])
      expect(canonicalId(id)).toBe(false);
  });
  it("validates account syntax without pretending suffix proves network", () => {
    expect(validAccount("dave.floorline.testnet")).toBe(true);
    expect(validAccount("a".repeat(64))).toBe(true);
    for (const s of [
      ".testnet",
      "bad..testnet",
      "UPPER.testnet",
      "a",
      "x-_.testnet",
    ])
      expect(validAccount(s)).toBe(false);
  });
  it("requires current NFT owner and strict before-expiry condition", () => {
    const l = { state: 1, owner: "dave.testnet", pending: 0, expiry: "100" };
    expect(canRepay(l, "dave.testnet", 99n)).toBe(true);
    expect(canRepay(l, "carol.testnet", 99n)).toBe(false);
    expect(canRepay(l, "dave.testnet", 100n)).toBe(false);
    expect(canRepay({ ...l, pending: 1 }, "dave.testnet", 99n)).toBe(false);
    expect(canRepay({ ...l, state: 2 }, "dave.testnet", 99n)).toBe(false);
  });
  it("ships only explicit historical replay data with true loan IDs", () => {
    expect(evidence.label).toContain("not live");
    expect(evidence.loanIds).toEqual(["2", "7"]);
    expect(evidence.events).toHaveLength(7);
    expect(evidence.events.every((e) => e.tx && e.receipts.length > 0)).toBe(
      true,
    );
  });
});
describe("wallet receipt states", () => {
  it("distinguishes a known failed payout from a lost callback", () => {
    const result = {
      final_execution_status: "FINAL",
      status: { SuccessValue: "" },
      receipts_outcome: [
        {
          id: "test-only",
          outcome: {
            executor_id: "test.testnet",
            logs: [],
            status: { Failure: "native transfer failed" },
          },
        },
      ],
    };
    expect(classifyWithdrawal(result, { state: 2 })).toBe("failed");
    expect(classifyWithdrawal(result, { state: 1 })).toBe("unknown");
    expect(
      classifyWithdrawal(
        { ...result, final_execution_status: "EXECUTED_OPTIMISTIC" },
        { state: 2 },
      ),
    ).toBe("unknown");
  });
  it("does not mistake RPC denial for an explicit wallet cancellation", () => {
    expect(
      isExplicitWalletRejection(new Error("User rejected wallet approval")),
    ).toBe(true);
    for (const message of [
      "RPC request denied",
      "transaction rejected by node",
      "Connection cancelled after submission",
    ])
      expect(isExplicitWalletRejection(new Error(message))).toBe(false);
  });
  it("keeps a nonfinal root failure unresolved", () => {
    expect(
      classifyOutcome({
        final_execution_status: "EXECUTED_OPTIMISTIC",
        status: { Failure: "not final" },
      }),
    ).toBe("unknown");
  });
  const base = {
    final_execution_status: "FINAL",
    status: { SuccessValue: "" },
    receipts_outcome: [
      {
        id: "test-only",
        outcome: {
          status: { SuccessValue: "" },
          executor_id: "example.testnet",
          logs: [],
        },
      },
    ],
  };
  it("does not conflate optimistic parent success with payout success", () => {
    expect(classifyOutcome(base)).toBe("confirmed");
    expect(
      classifyOutcome({
        ...base,
        final_execution_status: "EXECUTED_OPTIMISTIC",
      }),
    ).toBe("unknown");
    expect(classifyOutcome({ ...base, receipts_outcome: [] })).toBe("unknown");
    expect(
      classifyOutcome({
        ...base,
        receipts_outcome: [
          {
            ...base.receipts_outcome[0],
            outcome: {
              ...base.receipts_outcome[0].outcome,
              status: { Failure: "callback failed" },
            },
          },
        ],
      }),
    ).toBe("unknown");
    expect(classifyOutcome({ ...base, status: { Failure: "rejected" } })).toBe(
      "failed",
    );
  });
  it("forbids success before a submitted result and unknown auto-sign", () => {
    expect(() => transition("review", "confirmed")).toThrow();
    expect(() => transition("unknown", "awaiting wallet")).toThrow();
    expect(transition("submitted", "unknown")).toBe("unknown");
    expect(transition("submitted", "confirmed")).toBe("confirmed");
  });
});
