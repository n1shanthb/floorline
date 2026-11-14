import { beforeEach, describe, expect, it, vi } from "vitest";
import evidence from "../src/data/evidence.json";
import { CONTRACT, DAO, DAO_HASH } from "../src/lib/config";
import { parseAmount } from "../src/lib/math";
import {
  contributionKind,
  proposalRequest,
  voteRequest,
} from "../src/lib/governance-actions";
import { request, validateRequest, storageRequest } from "../src/lib/actions";
import { verifyIntent } from "../src/lib/receipt";
import type { RpcOutcome } from "../src/lib/rpc";
const f = vi.hoisted(() => ({
  snapshot: vi.fn(),
  position: vi.fn(),
  view: vi.fn(),
  rpc: vi.fn(),
  loan: vi.fn(),
  claim: vi.fn(),
  dao: vi.fn(),
  pilot: vi.fn(),
  admission: vi.fn(),
}));
vi.mock("../src/lib/config", async (original) => ({...(await original<object>()), STAGING_CONFIGURED: true, DAO_CONFIGURED: true}));
vi.mock("../src/lib/release-controls", () => ({pilotStatus:f.pilot,admissionStatus:f.admission}));
vi.mock("../src/lib/rpc", async (original) => ({
  ...(await original<object>()),
  snapshot: f.snapshot,
  position: f.position,
  view: f.view,
  rpc: f.rpc,
  loanById: f.loan,
  claimById: f.claim,
  daoState: f.dao,
}));
vi.mock("../src/lib/offer-proof", () => ({
  savedProof: () => ({ hash: "test-only-proof", durationNs: "1000" }),
  verifyOfferProof: async () => ({
    hash: "test-only-proof",
    durationNs: "1000",
  }),
}));
const signer = "acceptance.testnet",
  other = "receiver.testnet",
  N = 10n ** 24n;
describe("RC1 staging limits (mocked reads)", () => {
  it("uses the approved 110 Tgas budget for redemption", () => {
    expect(request("redeem", "redeem", { amount: "1", min_out: "1" }).gas).toBe("110000000000000");
  });
  it("quotes a storage top-up from live credit and immutable cap", async () => {
    f.view.mockImplementation(async method=>method==="storage_balance_bounds"?{min:"10"}:method==="storage_balance_of"?{total:(N/2n).toString()}:null);
    const r=await storageRequest(signer);
    expect(r.deposit).toBe((N/2n).toString());
    expect(r.gas).toBe("110000000000000");
  });
  it("preserves available claim withdrawal through a risk stop", async () => {
    f.pilot.mockResolvedValue({stopped:true,gross:"2000",limits:{max_action:"0",max_gross:"2000",max_storage:N.toString()}});
    await expect(validateRequest(request("withdraw","withdraw_claim",{claim_id:"0"}),signer)).resolves.toBeTruthy();
  });
  it("blocks stopped new exposure before signing", async () => {
    f.pilot.mockResolvedValue({stopped:true,gross:"0",limits:{max_action:"1000",max_gross:"2000",max_storage:N.toString()}});
    await expect(validateRequest(request("donate","contribute",{},"1000"),signer)).rejects.toThrow(/stopped/);
  });
  it("blocks action and gross limits", async () => {
    f.pilot.mockResolvedValue({stopped:false,gross:"1001",limits:{max_action:"1000",max_gross:"2000",max_storage:N.toString()}});
    await expect(validateRequest(request("donate","contribute",{},"1000"),signer)).rejects.toThrow(/exposure limit/);
  });
  it("blocks a new registration at slot capacity", async () => {
    f.admission.mockResolvedValue({occupied:128,capacity:128});
    f.view.mockResolvedValue(null);
    await expect(validateRequest(request("register","storage_deposit",{account_id:null,registration_only:false},"1000"),signer)).rejects.toThrow(/slots/);
  });
});
const state = () => ({
  ledger: structuredClone(evidence.snapshot.ledger),
  account: structuredClone(evidence.snapshot.account),
  blockHash: "pinned-block",
  blockHeight: 1,
  timestampNs: "1000",
  chainId: "testnet",
  readAt: Date.now(),
});
const position = () => ({
  balance: N.toString(),
  storage: { total: N.toString(), available: N.toString() },
  native: { amount: (20n * N).toString(), storage_usage: 500 },
});
const proposal = () => ({
  ...structuredClone(evidence.proposal),
  id: 1,
  status: "InProgress",
  votes: {} as Record<string, string>,
  submission_time: "900",
  kind: contributionKind((N / 10n).toString()),
});
beforeEach(() => {
  vi.clearAllMocks();
  f.pilot.mockResolvedValue({stopped:false,gross:"0",limits:{max_action:(100n*N).toString(),max_gross:(1000n*N).toString(),max_storage:N.toString()}});
  f.admission.mockResolvedValue({occupied:4,capacity:128});
  f.snapshot.mockResolvedValue(state());
  f.position.mockResolvedValue(position());
  f.rpc.mockImplementation(async (method) =>
    method === "gas_price"
      ? { gas_price: "100000000" }
      : { amount: (20n * N).toString(), storage_usage: 500 },
  );
  f.view.mockImplementation(async (method) =>
    method === "nft_token"
      ? { owner_id: signer }
      : method === "get_last_proposal_id"
        ? 1
        : method === "storage_balance_of"
          ? { total: N.toString(), available: N.toString() }
          : method === "quote"
            ? "1"
            : { min: "1" },
  );
  f.loan.mockResolvedValue({
    ...evidence.loans.repaid,
    id: "2",
    state: 1,
    owner: signer,
    pending: 0,
    expiry: "2000",
  });
  f.claim.mockResolvedValue({
    id: "0",
    owner: signer,
    state: 0,
    amount: "1000",
  });
  f.dao.mockResolvedValue({
    account: {
      code_hash: DAO_HASH,
      amount: (20n * N).toString(),
      storage_usage: 540000,
    },
    policy: structuredClone(evidence.policy),
    proposal: proposal(),
  });
});
describe("fresh deployed-method admission", () => {
  it("pins wallet/loan reads to the same final block and rejects expired repayment", async () => {
    await validateRequest(
      request(
        "repay",
        "repay",
        { loan_id: "2" },
        evidence.loans.repaid.repayment,
      ),
      signer,
    );
    expect(f.position).toHaveBeenCalledWith(signer, "pinned-block");
    expect(f.loan).toHaveBeenCalledWith("2", "pinned-block");
    f.loan.mockResolvedValue({
      ...evidence.loans.repaid,
      state: 1,
      owner: signer,
      pending: 0,
      expiry: "1000",
    });
    await expect(
      validateRequest(
        request(
          "repay",
          "repay",
          { loan_id: "2" },
          evidence.loans.repaid.repayment,
        ),
        signer,
      ),
    ).rejects.toThrow(/unexpired/);
  });
  it("blocks dilutive issuance at actual verified backing", async () => {
    await expect(
      validateRequest(
        request("issue", "issue", { min_tokens: "1" }, N.toString()),
        signer,
      ),
    ).rejects.toThrow(/dilute/);
  });
  it("permits explicit contributions without inventing donor registration", async () => {
    f.position.mockResolvedValue({ ...position(), storage: null });
    await expect(
      validateRequest(request("donate", "contribute", {}, "1000"), signer),
    ).resolves.toBeTruthy();
  });
  it("requires available tokens and real recipient registration for transfers", async () => {
    const r = request(
      "transfer",
      "ft_transfer",
      { receiver_id: other, amount: "1000", memo: null },
      "1",
    );
    await expect(validateRequest(r, signer)).resolves.toBeTruthy();
    f.view.mockResolvedValue(null);
    await expect(validateRequest(r, signer)).rejects.toThrow(
      /Recipient must register/,
    );
  });
  it("rejects wrong deposits and noncanonical numeric JSON before wallet approval", async () => {
    await expect(
      validateRequest(
        request("redeem", "redeem", { amount: "1", min_out: "1" }, "1"),
        signer,
      ),
    ).rejects.toThrow(/deposit/);
    await expect(
      validateRequest(
        request(
          "transfer",
          "ft_transfer",
          { receiver_id: other, amount: 1, memo: null },
          "1",
        ),
        signer,
      ),
    ).rejects.toThrow(/canonical/);
  });
  it("rejects insufficient spendable NEAR and record credit", async () => {
    f.position.mockResolvedValue({
      ...position(),
      native: { amount: "1", storage_usage: 500 },
    });
    await expect(
      validateRequest(request("donate", "contribute", {}, "1000"), signer),
    ).rejects.toThrow(/Insufficient spendable/);
    f.position.mockResolvedValue({
      ...position(),
      storage: { total: "1", available: "1" },
    });
    await expect(
      validateRequest(
        request(
          "offer",
          "fund_offer",
          { repayment: "1000", collateral: "1000", duration_ns: "1000" },
          "1000",
        ),
        signer,
      ),
    ).rejects.toThrow(/Top up storage/);
  });
  it("does not restore unknown native outcomes", async () => {
    f.claim.mockResolvedValue({ owner: signer, state: 1 });
    await expect(
      validateRequest(
        request("retry", "retry_failed_claim", { claim_id: "0" }),
        signer,
      ),
    ).rejects.toThrow(/Confirmed failure/);
  });
  it("withdraws only funded free storage with separate refund headroom", async () => {
    await expect(
      validateRequest(
        request("storage", "storage_withdraw", { amount: null }, "1"),
        signer,
      ),
    ).resolves.toBeTruthy();
    const s = state();
    s.ledger.operational = s.ledger.operational_base;
    f.snapshot.mockResolvedValue(s);
    await expect(
      validateRequest(
        request("storage", "storage_withdraw", { amount: null }, "1"),
        signer,
      ),
    ).rejects.toThrow(/headroom/);
  });
});
describe("real Sputnik request constraints, mocked reads only", () => {
  it("uses actual bond and receiver for contribution proposals", async () => {
    const r = proposalRequest(evidence.policy.proposal_bond);
    expect(r.receiver).toBe(DAO);
    await expect(validateRequest(r, signer)).resolves.toBeTruthy();
  });
  it("rejects policy/code changes and wrong proposal bond", async () => {
    const d = await f.dao();
    d.account.code_hash = "changed";
    f.dao.mockResolvedValue(d);
    await expect(
      validateRequest(proposalRequest(evidence.policy.proposal_bond), signer),
    ).rejects.toThrow(/code or policy/);
  });
  it("requires an unvoted council account and supported in-progress proposal", async () => {
    const p = proposal();
    await expect(validateRequest(voteRequest(1, p), signer)).rejects.toThrow(
      /council/,
    );
    await expect(
      validateRequest(voteRequest(1, p), evidence.council[1]),
    ).resolves.toBeTruthy();
    p.votes[evidence.council[1]] = "Approve";
    const d = await f.dao();
    d.proposal = p;
    f.dao.mockResolvedValue(d);
    await expect(
      validateRequest(voteRequest(1, p), evidence.council[1]),
    ).rejects.toThrow(/Unvoted/);
  });
  it("rejects expired or unrelated DAO spending", async () => {
    const d = await f.dao();
    d.proposal.submission_time = "900";
    const late = state();
    late.timestampNs = (
      900n + BigInt(evidence.policy.proposal_period)
    ).toString();
    f.snapshot.mockResolvedValue(late);
    f.dao.mockResolvedValue(d);
    await expect(
      validateRequest(voteRequest(1, proposal()), evidence.council[1]),
    ).rejects.toThrow(/voting period expired/);
    const p = proposal();
    p.kind.FunctionCall.receiver_id = "unrelated.testnet";
    expect(() => voteRequest(1, p)).toThrow(/Only the reviewed/);
  });
});
describe("receipt intent matching", () => {
  it("matches nested Unicode JSON and checks receiver, gas and signer", () => {
    const action = proposalRequest(parseAmount("1").toString());
    const encoded = Buffer.from(JSON.stringify(action.args)).toString("base64");
    const raw: RpcOutcome = {
      status: { SuccessValue: "" },
      transaction: {
        hash: "hash",
        signer_id: signer,
        receiver_id: DAO,
        actions: [
          {
            FunctionCall: {
              method_name: action.method,
              args: encoded,
              gas: action.gas,
              deposit: action.deposit,
            },
          },
        ],
      },
    };
    expect(() =>
      verifyIntent(raw, { hash: "hash", signer, request: action }),
    ).not.toThrow();
    expect(() =>
      verifyIntent(
        { ...raw, transaction: { ...raw.transaction!, receiver_id: CONTRACT } },
        { hash: "hash", signer, request: action },
      ),
    ).toThrow(/identity/);
    raw.transaction!.actions![0].FunctionCall!.gas = "1";
    expect(() =>
      verifyIntent(raw, { hash: "hash", signer, request: action }),
    ).toThrow(/gas/);
  });
});
