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
