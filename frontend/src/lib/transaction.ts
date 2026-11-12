export type TxPhase =
  | "idle"
  | "validating"
  | "review"
  | "awaiting wallet"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "failed"
  | "unknown";
export function isExplicitWalletRejection(error: unknown): boolean {
  return (
    error instanceof Error &&
    /^User (rejected|cancelled|canceled|declined)( (the )?(wallet )?(approval|request|transaction))?[.!]?$/i.test(
      error.message,
    )
  );
}
const allowed: Record<TxPhase, TxPhase[]> = {
  idle: ["validating"],
  validating: ["review", "rejected", "unknown"],
  review: ["awaiting wallet", "validating", "idle"],
  "awaiting wallet": ["submitted", "rejected", "unknown"],
  submitted: ["confirmed", "failed", "unknown"],
  confirmed: ["idle", "validating"],
  rejected: ["idle", "validating"],
  failed: ["idle", "validating"],
  unknown: ["submitted", "idle"],
};
export function transition(from: TxPhase, to: TxPhase): TxPhase {
  if (!allowed[from].includes(to))
    throw new Error(`Invalid transaction transition: ${from} → ${to}`);
  return to;
}
