import { CONTRACT } from "./config";
import { canonicalId } from "./math";
import { classifyOutcome, rpc } from "./rpc";
import type { Loan, RpcOutcome } from "./rpc";
export interface OfferProof {
  hash: string;
  durationNs: string;
}
export async function verifyOfferProof(
  loan: Loan,
  hash: string,
): Promise<OfferProof> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{40,48}$/.test(hash))
    throw new Error("Enter the base58 funding transaction hash.");
  const outcome = await rpc<RpcOutcome>("tx", {
    tx_hash: hash,
    sender_account_id: loan.lender,
    wait_until: "FINAL",
  });
  const transaction = outcome.transaction,
    call = transaction?.actions?.[0]?.FunctionCall;
  if (
    classifyOutcome(outcome) !== "confirmed" ||
    transaction?.hash !== hash ||
    transaction.signer_id !== loan.lender ||
    transaction.receiver_id !== CONTRACT ||
    transaction.actions?.length !== 1 ||
    !call ||
    call.method_name !== "fund_offer" ||
    call.deposit !== loan.principal
  )
    throw new Error("Not a successful matching fund_offer transaction.");
  const args = JSON.parse(atob(call.args)) as Record<string, string>;
  const result = (outcome.status as { SuccessValue?: string }).SuccessValue;
  if (
    !result ||
    JSON.parse(atob(result)) !== loan.id ||
    args.repayment !== loan.repayment ||
    args.collateral !== loan.collateral ||
    !canonicalId(args.duration_ns) ||
    BigInt(args.duration_ns) === 0n
  )
    throw new Error("Loan ID or terms do not match the funded offer.");
  return { hash, durationNs: args.duration_ns };
}
export function savedProof(id: string): OfferProof | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(`floorline:offer-proof:${id}`) || "null",
    );
    return value &&
      typeof value.hash === "string" &&
      canonicalId(value.durationNs)
      ? value
      : null;
  } catch {
    return null;
  }
}
