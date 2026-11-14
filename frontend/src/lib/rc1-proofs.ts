import { ACCEPTANCE, txLink } from "./config";

export type Rc1Proof = {
  id: string;
  title: string;
  group: string;
  step_id: string;
  transaction_hash: string;
  explorer_url: string;
  method: string | null;
  signer: string;
  status: string;
  demonstrates?: string;
  caveats?: string[];
  receipt_proof?: { count: number | null };
};

export type Rc1Manifest = {
  verified_rows: number;
  total_rows: number;
  acceptance_status: string;
  contract: string;
  expected_code_hash: string;
  final_state?: {
    pilot?: { stopped?: boolean; guardian?: string };
    ledger?: { L?: string; T?: string; inflight?: string; storage_total?: string };
    admission?: { occupied?: number; capacity?: number };
  };
  proofs: Rc1Proof[];
};

/** Highlighted RC1 receipts shown across app surfaces (not only /verify). */
export const RC1_FEATURED = {
  overview: [
    "issue",
    "redeem",
    "withdraw_redemption",
    "contribute",
    "stop",
    "unregister",
  ],
  treasury: [
    "issue",
    "redeem",
    "withdraw_redemption",
    "cleanup_redeem",
    "contribute",
    "return_free_tokens",
  ],
  loans: [
    "offer_repay",
    "borrow_repay",
    "nft_transfer",
    "repay",
    "default",
    "cancel",
  ],
  governance: ["contribute", "stop"],
  activity: [
    "issue",
    "nft_transfer",
    "repay",
    "default",
    "contribute",
    "stop",
    "unregister",
  ],
} as const;

export type Rc1Surface = keyof typeof RC1_FEATURED;

let cached: Promise<Rc1Manifest> | null = null;

export function loadRc1Manifest(): Promise<Rc1Manifest> {
  if (!cached) {
    cached = fetch("/evidence/proofs.json")
      .then((r) => {
        if (!r.ok) throw new Error("RC1 evidence manifest unavailable");
        return r.json() as Promise<Rc1Manifest>;
      })
      .catch((e) => {
        cached = null;
        throw e;
      });
  }
  return cached;
}

export function proofsFor(
  manifest: Rc1Manifest | null,
  surface: Rc1Surface,
): Rc1Proof[] {
  if (!manifest) return [];
  const wanted = new Set<string>(RC1_FEATURED[surface]);
  return manifest.proofs.filter((p) => wanted.has(p.step_id));
}

export function proofHref(p: Rc1Proof): string {
  return p.explorer_url || txLink(p.transaction_hash);
}

export const RC1_COPY = {
  badge: `RC1 · ${ACCEPTANCE.verifiedRows}/40 FINAL_VERIFIED`,
  stopped: "NEW RISK STOPPED",
  note: "RC1 public-testnet acceptance is complete. New-risk actions are permanently stopped; browse verified receipts without a wallet.",
} as const;
