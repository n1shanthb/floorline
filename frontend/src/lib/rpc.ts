import { CODE_HASH, CONTRACT, DAO, RPC } from "./config";
export interface Ledger {
  L: string;
  T: string;
  locked: string;
  unused_lender: string;
  borrower_claims: string;
  lender_claims: string;
  redemption_claims: string;
  cancellation_claims: string;
  storage_refund_claims: string;
  storage_total: string;
  operational: string;
  inflight: string;
  local_required: string;
  account_balance: string;
  storage_stake: string;
  tax_bps: number;
  [key: string]: string | number;
}
export interface AccountView {
  amount: string;
  code_hash: string;
  storage_usage: number;
  block_hash: string;
  block_height: number;
}
export interface Snapshot {
  ledger: Ledger;
  account: AccountView;
  blockHash: string;
  blockHeight: number;
  timestampNs: string;
  readAt: number;
  chainId: "testnet";
}
export interface Loan {
  id: string;
  lender: string;
  borrower: string;
  owner: string;
  principal: string;
  repayment: string;
  collateral: string;
  expiry: string;
  state: number;
  pending: number;
  storage_cost: string;
}
export interface Claim {
  id: string;
  owner: string;
  amount: string;
  kind: number;
  state: number;
  attempt: string;
  storage_cost: string;
}
export interface StorageBalance {
  total: string;
  available: string;
}
export interface Position {
  balance: string;
  storage: StorageBalance | null;
  native: AccountView;
}
export interface RpcOutcome {
  status: Record<string, unknown>;
  final_execution_status?: string;
  transaction?: {
    hash: string;
    signer_id: string;
    receiver_id: string;
    actions?: Array<{
      FunctionCall?: {
        method_name: string;
        args: string;
        deposit: string;
        gas: number | string;
      };
    }>;
  };
  receipts_outcome?: Array<{
    id: string;
    outcome: {
      status: Record<string, unknown>;
      executor_id: string;
      logs: string[];
    };
  }>;
  transaction_outcome?: { outcome: { status: Record<string, unknown> } };
}
export async function rpc<T>(method: string, params: unknown): Promise<T> {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "floorline", method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(
      `RPC unavailable (${response.status}). Please refresh; no snapshot was substituted.`,
    );
  const data = await response.json();
  if (data.error)
    throw new Error(
      data.error.cause?.name ||
        data.error.data ||
        data.error.message ||
        "RPC query failed",
    );
  return data.result as T;
}
export async function view<T>(
  method: string,
  args: Record<string, unknown> = {},
  account = CONTRACT,
  block?: string,
): Promise<T> {
  const result = await rpc<{ result: number[] }>("query", {
    request_type: "call_function",
    account_id: account,
    method_name: method,
    args_base64: btoa(JSON.stringify(args)),
    ...(block ? { block_id: block } : { finality: "final" }),
  });
  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(result.result)),
  ) as T;
}
export async function snapshot(): Promise<Snapshot> {
  const status = await rpc<{ chain_id: string }>("status", []);
  if (status.chain_id !== "testnet")
    throw new Error("Wrong network. Floorline supports testnet only.");
  const block = await rpc<{
    header: { hash: string; height: number; timestamp_nanosec: string };
  }>("block", { finality: "final" });
  const [ledger, account] = await Promise.all([
    view<Ledger>("accounting", {}, CONTRACT, block.header.hash),
    rpc<AccountView>("query", {
      request_type: "view_account",
      account_id: CONTRACT,
      block_id: block.header.hash,
    }),
  ]);
  if (account.code_hash !== CODE_HASH)
    throw new Error(
      "Contract code hash changed. Transactions are blocked pending review.",
    );
  return {
    ledger,
    account,
    blockHash: block.header.hash,
    blockHeight: block.header.height,
    timestampNs: block.header.timestamp_nanosec,
    readAt: Date.now(),
    chainId: "testnet",
  };
}
export async function position(id: string): Promise<Position> {
  const [balance, storage, native] = await Promise.all([
    view<string>("ft_balance_of", { account_id: id }),
    view<StorageBalance | null>("storage_balance_of", { account_id: id }),
    rpc<AccountView>("query", {
      request_type: "view_account",
      account_id: id,
      finality: "final",
    }),
  ]);
  return { balance, storage, native };
}
export const loanById = async (id: string): Promise<Loan | null> => {
  const l = await view<Omit<Loan, "id"> | null>("get_loan", { loan_id: id });
  return l ? { ...l, id } : null;
};
export const claimById = async (id: string): Promise<Claim | null> => {
  const c = await view<Omit<Claim, "id"> | null>("get_claim", { claim_id: id });
  return c ? { ...c, id } : null;
};
export async function daoState() {
  const [policy, proposal, account] = await Promise.all([
    view<DaoPolicy>("get_policy", {}, DAO),
    view<DaoProposal>("get_proposal", { id: 0 }, DAO),
    rpc<AccountView>("query", {
      request_type: "view_account",
      account_id: DAO,
      finality: "final",
    }),
  ]);
  if (
    !Array.isArray(policy.roles) ||
    policy.roles.some(
      (r) => !Array.isArray(r.permissions) || typeof r.name !== "string",
    ) ||
    !policy.default_vote_policy ||
    typeof proposal.status !== "string"
  )
    throw new Error(
      "Unexpected DAO view schema. Inspect its account and code before trusting the data.",
    );
  return { policy, proposal, account };
}
export interface DaoPolicy {
  roles: Array<{
    name: string;
    kind: string | { Group: string[] };
    permissions: string[];
  }>;
  default_vote_policy: {
    threshold: number[] | string;
    quorum: string;
    weight_kind: string;
  };
  proposal_bond: string;
}
export interface DaoProposal {
  id: number;
  status: string;
  proposer: string;
  description: string;
  votes: Record<string, string>;
  kind: unknown;
}
export function classifyOutcome(
  outcome: RpcOutcome,
): "confirmed" | "failed" | "unknown" {
  if (outcome.status?.Failure) return "failed";
  if (outcome.final_execution_status !== "FINAL") return "unknown";
  if (outcome.receipts_outcome?.some((r) => r.outcome.status.Failure))
    return "unknown";
  if (
    !outcome.receipts_outcome?.length ||
    !("SuccessValue" in (outcome.status || {}))
  )
    return "unknown";
  return "confirmed";
}
