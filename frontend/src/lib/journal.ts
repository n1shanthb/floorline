import type { ActionRequest } from "./wallet";
import { receiverFor } from "./wallet";
export interface JournalEntry {
  hash: string;
  signer: string;
  receiver: string;
  method: string;
  status: "confirmed" | "failed" | "unknown";
  checkedAt: string;
}
const KEY = "floorline:verified-activity:v1";
export function readJournal(): JournalEntry[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows)
      ? rows
          .filter(
            (r) =>
              r &&
              typeof r.hash === "string" &&
              typeof r.signer === "string" &&
              typeof r.method === "string" &&
              ["confirmed", "failed", "unknown"].includes(r.status),
          )
          .slice(0, 200)
      : [];
  } catch {
    return [];
  }
}
export function recordTransaction(
  hash: string,
  signer: string,
  request: ActionRequest,
  status: JournalEntry["status"],
) {
  try {
    const row: JournalEntry = {
      hash,
      signer,
      receiver: receiverFor(request),
      method: request.method,
      status,
      checkedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [row, ...readJournal().filter((r) => r.hash !== hash)].slice(0, 200),
      ),
    );
    window.dispatchEvent(new Event("floorline:activity"));
  } catch {
    /* Optional history must never change settlement classification. */
  }
}
