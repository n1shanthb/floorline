import { CONTRACT, DAO, DAO_HASH, RECORD_HEADROOM } from "./config";
import { parseAmount, U128_MAX } from "./math";
import { policiesEqual } from "./policy";
import { daoState, view } from "./rpc";
import type { DaoProposal, Snapshot } from "./rpc";
import type { ActionRequest } from "./wallet";
import evidence from "../data/evidence.json";

export const contributionKind = (amount: string) => ({
  FunctionCall: {
    receiver_id: CONTRACT,
    actions: [
      {
        method_name: "contribute",
        args: "e30=",
        deposit: amount,
        gas: "30000000000000",
      },
    ],
  },
});
export function contributionAmount(kind: unknown): bigint {
  const k = kind as ReturnType<typeof contributionKind>;
  const call = k?.FunctionCall,
    action = call?.actions?.[0];
  if (
    call?.receiver_id !== CONTRACT ||
    call.actions?.length !== 1 ||
    action?.method_name !== "contribute" ||
    action.args !== "e30=" ||
    action.gas !== "30000000000000" ||
    typeof action.deposit !== "string" ||
    !/^[1-9]\d*$/.test(action.deposit)
  )
    throw new Error(
      "Only the reviewed Floorline contribution proposal is supported.",
    );
  const amount = BigInt(action.deposit);
  if (amount > U128_MAX) throw new Error("Invalid contribution amount");
  return amount;
}
export function proposalRequest(bond: string): ActionRequest {
  return {
    receiver: DAO,
    title: "Propose DAO contribution",
    method: "add_proposal",
    args: {
      proposal: {
        description:
          "Controlled Floorline testnet contribution of 0.1 NEAR. Operator-controlled simulated council; independent human governance is not proven.",
        kind: contributionKind(parseAmount("0.1").toString()),
      },
    },
    deposit: bond,
    gas: "250000000000000",
    details: [
      "Attach the current proposal bond; this is separate from the 0.10 NEAR the DAO may later contribute.",
      "Proposal creation does not transfer backing. Eligible council approvals must execute the FunctionCall.",
    ],
    warning:
      "The bond is governed by Sputnik policy and is not a guaranteed immediate refund.",
  };
}
export function voteRequest(id: number, proposal: DaoProposal): ActionRequest {
  const amount = contributionAmount(proposal.kind);
  return {
    receiver: DAO,
    title: `Approve proposal #${id}`,
    method: "act_proposal",
    args: { id, action: "VoteApprove" },
    deposit: "0",
    gas: "250000000000000",
    details: [
      `The DAO will contribute ${amount} yoctoNEAR if this vote reaches its threshold.`,
      "Approval alone is not proof of successful treasury execution. Inspect the proposal and nested receipts.",
    ],
    warning:
      "Operator-controlled simulated council; this does not establish independent human governance.",
  };
}
export async function validateGovernance(
  action: ActionRequest,
  signer: string,
  snapshot: Snapshot,
) {
  if (action.method !== "add_proposal" && action.method !== "act_proposal")
    throw new Error("Unsupported DAO action");
  if (action.gas !== "250000000000000")
    throw new Error("Invalid DAO gas budget");
  const id = action.method === "act_proposal" ? action.args.id : 0;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0)
    throw new Error("Use a safe nonnegative proposal ID");
  const d = await daoState(id, snapshot.blockHash);
  if (
    d.account.code_hash !== DAO_HASH ||
    !policiesEqual(d.policy, evidence.policy)
  )
    throw new Error(
      "DAO code or policy changed; review required before signing.",
    );
  const group = d.policy.roles.find((r) => r.name === "council")?.kind;
  const council = typeof group === "object" && group.Group.includes(signer);
  let amount: bigint;
  if (action.method === "add_proposal") {
    const role = d.policy.roles.some(
      (r) =>
        (r.kind === "Everyone" ||
          (typeof r.kind === "object" && r.kind.Group.includes(signer))) &&
        r.permissions.includes("*:AddProposal"),
    );
    if (!role || action.deposit !== d.policy.proposal_bond)
      throw new Error("Proposal permission and exact current bond required.");
    const proposal = action.args.proposal as {
      description: string;
      kind: unknown;
    };
    if (
      typeof proposal?.description !== "string" ||
      proposal.description.length > 500
    )
      throw new Error("Bounded proposal description required");
    amount = contributionAmount(proposal.kind);
    if (amount !== parseAmount("0.1"))
      throw new Error("This controlled demo proposes exactly 0.10 NEAR.");
  } else {
    if (
      !council ||
      action.args.action !== "VoteApprove" ||
      action.deposit !== "0" ||
      d.proposal.status !== "InProgress" ||
      d.proposal.votes[signer]
    )
      throw new Error(
        "Unvoted council account and an in-progress proposal required.",
      );
    if (
      !d.proposal.submission_time ||
      !d.policy.proposal_period ||
      BigInt(snapshot.timestampNs) >=
        BigInt(d.proposal.submission_time) + BigInt(d.policy.proposal_period)
    )
      throw new Error(
        "Proposal voting period expired or could not be verified.",
      );
    amount = contributionAmount(d.proposal.kind);
  }
  const costPerByte =
    BigInt(snapshot.ledger.storage_stake) /
    BigInt(snapshot.ledger.storage_usage);
  if (
    BigInt(d.account.amount) - BigInt(d.account.storage_usage) * costPerByte <
    amount + RECORD_HEADROOM
  )
    throw new Error(
      "DAO needs separately funded spendable treasury and operational headroom.",
    );
  if (
    BigInt(snapshot.ledger.T) === 0n ||
    BigInt(snapshot.ledger.L) + amount > U128_MAX
  )
    throw new Error("Floorline cannot accept this contribution.");
  // Verify the concrete public ABI is available; do not assume proposal #0 is a new action.
  const last = await view<number>(
    "get_last_proposal_id",
    {},
    DAO,
    snapshot.blockHash,
  );
  if (!Number.isSafeInteger(last) || last < 0)
    throw new Error("Unverified Sputnik proposal counter schema");
}
