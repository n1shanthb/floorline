import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loan, RpcOutcome } from "../src/lib/rpc";
import { CONTRACT } from "../src/lib/config";
import { verifyOfferProof } from "../src/lib/offer-proof";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/rpc", async (original) => ({
  ...(await original<typeof import("../src/lib/rpc")>()),
  rpc: mocks.rpc,
}));
const hash = "6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy";
const loan: Loan = {
  id: "42",
  lender: "test-lender.testnet",
  borrower: "test-borrower.testnet",
  owner: "test-borrower.testnet",
  principal: "100",
  repayment: "110",
  collateral: "200",
  expiry: "0",
  state: 0,
  pending: 0,
  storage_cost: "1",
};
function outcome(): RpcOutcome {
  return {
    final_execution_status: "FINAL",
    status: { SuccessValue: btoa('"42"') },
    transaction: {
      hash,
      signer_id: loan.lender,
      receiver_id: CONTRACT,
      actions: [
        {
          FunctionCall: {
            method_name: "fund_offer",
            deposit: "100",
            args: btoa(
              JSON.stringify({
                repayment: "110",
                collateral: "200",
                duration_ns: "3600000000000",
              }),
            ),
            gas: "30000000000000",
          },
        },
      ],
    },
    receipts_outcome: [
      {
        id: "mock-only",
        outcome: {
          executor_id: CONTRACT,
          logs: [],
          status: { SuccessValue: "" },
        },
      },
    ],
  };
}
describe("offer terms from actual funding receipt, not guessed duration", () => {
  beforeEach(() => mocks.rpc.mockReset());
  it("accepts only matching successful lender transaction and returned loan ID", async () => {
    mocks.rpc.mockResolvedValue(outcome());
    expect(await verifyOfferProof(loan, hash)).toEqual({
      hash,
      durationNs: "3600000000000",
    });
  });
  it("rejects a transaction for a different loan ID", async () => {
    const o = outcome();
    o.status.SuccessValue = btoa('"43"');
    mocks.rpc.mockResolvedValue(o);
    await expect(verifyOfferProof(loan, hash)).rejects.toThrow("Loan ID");
  });
  it("rejects substituted repayment, principal, lender or optimistic result", async () => {
    for (const alter of [
      (o: RpcOutcome) => {
        o.transaction!.signer_id = "attacker.testnet";
      },
      (o: RpcOutcome) => {
        o.transaction!.actions![0].FunctionCall!.deposit = "99";
      },
      (o: RpcOutcome) => {
        o.final_execution_status = "EXECUTED_OPTIMISTIC";
      },
      (o: RpcOutcome) => {
        o.transaction!.actions![0].FunctionCall!.args = btoa(
          JSON.stringify({
            repayment: "999",
            collateral: "200",
            duration_ns: "3600000000000",
          }),
        );
      },
    ]) {
      const o = outcome();
      alter(o);
      mocks.rpc.mockResolvedValue(o);
      await expect(verifyOfferProof(loan, hash)).rejects.toThrow();
    }
  });
});
