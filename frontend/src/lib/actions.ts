import { CONTRACT, DAO, RECORD_HEADROOM } from "./config";
import {
  canonicalId,
  canRepay,
  issuance,
  parseAmount,
  quote,
  validAccount,
  U128_MAX,
} from "./math";
import { claimById, loanById, position, rpc, snapshot, view } from "./rpc";
import type { Snapshot, StorageBalance } from "./rpc";
import type { ActionRequest } from "./wallet";
import { receiverFor } from "./wallet";
import { validateGovernance } from "./governance-actions";
import { savedProof, verifyOfferProof } from "./offer-proof";
export const request = (
  title: string,
  method: string,
  args: Record<string, unknown>,
  deposit = "0",
  details: string[] = [],
  warning?: string,
): ActionRequest => ({
  title,
  method,
  args,
  deposit,
  gas: ["withdraw_claim", "storage_withdraw"].includes(method)
    ? "110000000000000"
    : "30000000000000",
  details,
  warning,
});
const needsRecord = new Set([
  "redeem",
  "fund_offer",
  "accept_offer",
  "repay",
  "cancel_offer",
]);
export async function validateRequest(
  action: ActionRequest,
  signer: string,
): Promise<Snapshot> {
  if (!validAccount(signer)) throw new Error("Connect a valid testnet wallet.");
  const state = await snapshot(),
    l = state.ledger,
    p = await position(signer, state.blockHash),
    a = action.args;
  if (
    BigInt(state.account.amount) < BigInt(l.local_required) ||
    BigInt(l.storage_total) + BigInt(l.operational) < BigInt(l.storage_stake)
  )
    throw new Error(
      "Reserve or storage solvency check failed. Transactions are blocked.",
    );
  const allowed = [
    "storage_deposit",
    "issue",
    "redeem",
    "fund_offer",
    "cancel_offer",
    "accept_offer",
    "nft_transfer",
    "repay",
    "default_loan",
    "withdraw_claim",
    "retry_failed_claim",
    "storage_withdraw",
  ];
  const receiver = receiverFor(action);
  if (
    receiver === CONTRACT &&
    ![...allowed, "ft_transfer", "contribute"].includes(action.method)
  )
    throw new Error("Unsupported contract action.");
  const deposit = BigInt(action.deposit);
  if (
    !/^(0|[1-9]\d*)$/.test(action.deposit) ||
    deposit < 0n ||
    deposit > U128_MAX
  )
    throw new Error("Invalid attached deposit");
  for (const key of [
    "amount",
    "min_out",
    "min_tokens",
    "repayment",
    "collateral",
  ]) {
    if (
      action.method === "storage_withdraw" &&
      key === "amount" &&
      a[key] === null
    )
      continue;
    if (
      key in a &&
      (typeof a[key] !== "string" ||
        !/^(0|[1-9]\d*)$/.test(a[key] as string) ||
        BigInt(a[key] as string) > U128_MAX)
    )
      throw new Error(`Invalid canonical U128 ${key}`);
  }
  if (
    receiver === CONTRACT &&
    action.gas !==
      (["withdraw_claim", "storage_withdraw"].includes(action.method)
        ? "110000000000000"
        : "30000000000000")
  )
    throw new Error("Unexpected gas budget");
  if (receiver === CONTRACT) {
    const expected = [
      "ft_transfer",
      "nft_transfer",
      "storage_withdraw",
    ].includes(action.method)
      ? 1n
      : [
            "storage_deposit",
            "issue",
            "fund_offer",
            "repay",
            "contribute",
          ].includes(action.method)
        ? null
        : 0n;
    if (expected !== null && deposit !== expected)
      throw new Error("Wrong attached deposit for this method");
  }
  const gasPrice = await rpc<{ gas_price: string }>("gas_price", [null]);
  // Wallets reserve gas before execution. This is a conservative UI cushion, not a fee quote.
  const byteCost = BigInt(l.storage_stake) / BigInt(l.storage_usage);
  const spendable =
    BigInt(p.native.amount) - BigInt(p.native.storage_usage) * byteCost;
  if (
    spendable <
    deposit + BigInt(action.gas) * BigInt(gasPrice.gas_price) * 12n
  )
    throw new Error(
      "Insufficient spendable testnet NEAR after account storage for deposit plus conservative upfront gas headroom. Keep extra NEAR for wallet gas reservation.",
    );
  if (receiver === DAO) {
    await validateGovernance(action, signer, state);
    return state;
  }
  if (action.method === "contribute") {
    if (deposit <= 0n || BigInt(l.T) === 0n || BigInt(l.L) + deposit > U128_MAX)
      throw new Error("Positive contribution to live supply required");
    return state; // Deployed contribute does not require donor storage registration.
  }
  if (action.method === "storage_deposit") {
    const bounds = await view<{ min: string }>("storage_balance_bounds");
    if (!p.storage && deposit < BigInt(bounds.min))
      throw new Error("Deposit is below live registration minimum.");
    if (a.registration_only !== false || a.account_id !== null)
      throw new Error("Only self storage registration/top-up supported");
    return state;
  }
  if (!p.storage && action.method !== "default_loan")
    throw new Error("Register storage before this action.");
  if (action.method === "storage_withdraw") {
    const n =
      a.amount === null
        ? BigInt(p.storage!.available)
        : BigInt(String(a.amount));
    if (n <= 0n || n > BigInt(p.storage!.available))
      throw new Error("Positive unused storage credit required");
    if (
      BigInt(l.operational) -
        BigInt(l.operational_base) -
        BigInt(l.refund_storage) <
      RECORD_HEADROOM
    )
      throw new Error(
        "Operational refund headroom too low for this UI's conservative cushion",
      );
  }
  if (
    needsRecord.has(action.method) &&
    BigInt(p.storage?.available || "0") < RECORD_HEADROOM
  )
    throw new Error(
      "Top up storage first. This UI conservatively requires 0.01 NEAR available for a new record; it is not the contract minimum.",
    );
  if (action.method === "redeem") {
    const c = BigInt(String(a.amount)),
      q = quote(BigInt(l.L), BigInt(l.T), c, BigInt(l.tax_bps));
    if (
      c > BigInt(p.balance) ||
      q === 0n ||
      q < BigInt(String(a.min_out)) ||
      BigInt(String(a.min_out)) <= 0n
    )
      throw new Error(
        "Balance, zero quote, or minimum output validation failed.",
      );
    const onchain = await view<string>(
      "quote",
      { amount: c.toString() },
      CONTRACT,
      state.blockHash,
    );
    if (BigInt(onchain) !== q)
      throw new Error("Local quote does not match the contract.");
  }
  if (action.method === "issue") {
    const issued = issuance(deposit, BigInt(l.L), BigInt(l.T));
    if (!issued.allowed || issued.minted < BigInt(String(a.min_tokens)))
      throw new Error("Issuance would dilute backing or fail minimum output.");
  }
  if (action.method === "ft_transfer") {
    const receiver = String(a.receiver_id),
      amount = BigInt(String(a.amount));
    if (
      !/^[1-9]\d*$/.test(String(a.amount)) ||
      amount > BigInt(p.balance) ||
      amount > U128_MAX ||
      !validAccount(receiver) ||
      receiver === signer ||
      receiver === CONTRACT ||
      (a.memo !== null &&
        (typeof a.memo !== "string" ||
          new TextEncoder().encode(a.memo).length > 256))
    )
      throw new Error(
        "Available FLOOR, a distinct registered recipient and bounded memo required",
      );
    const registered = await view<StorageBalance | null>(
      "storage_balance_of",
      { account_id: receiver },
      CONTRACT,
      state.blockHash,
    );
    if (!registered)
      throw new Error(
        "Recipient must register Floorline storage before transfer.",
      );
    await rpc("query", {
      request_type: "view_account",
      account_id: receiver,
      block_id: state.blockHash,
    });
  }
  if (action.method === "fund_offer") {
    if (
      deposit <= 0n ||
      BigInt(String(a.repayment)) < deposit ||
      BigInt(String(a.collateral)) <= 0n ||
      typeof a.duration_ns !== "string" ||
      !canonicalId(String(a.duration_ns)) ||
      BigInt(String(a.duration_ns)) === 0n
    )
      throw new Error("Invalid fixed offer terms.");
  }
  if (
    [
      "cancel_offer",
      "accept_offer",
      "repay",
      "default_loan",
      "nft_transfer",
    ].includes(action.method)
  ) {
    const id = String(a.loan_id ?? a.token_id);
    if (typeof (a.loan_id ?? a.token_id) !== "string" || !canonicalId(id))
      throw new Error("Invalid loan ID");
    const loan = await loanById(id, state.blockHash);
    if (!loan) throw new Error("Loan record not found.");
    if (
      action.method === "cancel_offer" &&
      (loan.state !== 0 || loan.lender !== signer)
    )
      throw new Error("Only the lender can cancel an open offer.");
    if (
      action.method === "accept_offer" &&
      (loan.state !== 0 || BigInt(p.balance) < BigInt(loan.collateral))
    )
      throw new Error(
        "Offer not open or insufficient available FLOOR collateral.",
      );
    if (action.method === "accept_offer") {
      const proof = savedProof(id);
      if (!proof)
        throw new Error(
          "Verify the offer funding receipt to establish its exact term first.",
        );
      const actual = await verifyOfferProof(loan, proof.hash);
      if (actual.durationNs !== proof.durationNs)
        throw new Error("Offer term cache changed. Reverify funding proof.");
      if (
        BigInt(state.timestampNs) + BigInt(actual.durationNs) >
        (1n << 64n) - 1n
      )
        throw new Error("Loan expiry would overflow the contract clock.");
    }
    if (["repay", "nft_transfer"].includes(action.method)) {
      const nft = await view<{ owner_id: string } | null>(
        "nft_token",
        {
          token_id: id,
        },
        CONTRACT,
        state.blockHash,
      );
      if (!nft || nft.owner_id !== signer)
        throw new Error(
          "Current on-chain NFT ownership does not match the signer.",
        );
    }
    if (
      action.method === "repay" &&
      (!canRepay(loan, signer, BigInt(state.timestampNs)) ||
        deposit !== BigInt(loan.repayment))
    )
      throw new Error(
        "Current NFT owner, exact debt, resolved transfers and unexpired loan required.",
      );
    if (
      action.method === "default_loan" &&
      (loan.state !== 1 ||
        loan.pending !== 0 ||
        BigInt(state.timestampNs) < BigInt(loan.expiry))
    )
      throw new Error(
        "Default is only possible at expiry after all NFT callbacks resolve.",
      );
    if (action.method === "nft_transfer") {
      const receiver = String(a.receiver_id);
      if (
        loan.state !== 1 ||
        loan.owner !== signer ||
        !validAccount(receiver) ||
        receiver === signer ||
        receiver === CONTRACT ||
        deposit !== 1n ||
        a.approval_id !== null ||
        a.memo !== null
      )
        throw new Error(
          "Current owner, distinct registered receiver and 1 yocto required.",
        );
      const registered = await view<StorageBalance | null>(
        "storage_balance_of",
        { account_id: receiver },
        CONTRACT,
        state.blockHash,
      );
      if (!registered)
        throw new Error(
          "Recipient must register Floorline storage before transfer.",
        );
      await rpc("query", {
        request_type: "view_account",
        account_id: receiver,
        block_id: state.blockHash,
      });
    }
  }
  if (["withdraw_claim", "retry_failed_claim"].includes(action.method)) {
    if (!canonicalId(String(a.claim_id))) throw new Error("Invalid claim ID");
    const claim = await claimById(String(a.claim_id), state.blockHash);
    if (!claim || claim.owner !== signer)
      throw new Error("Claim belongs to another account or does not exist.");
    if (action.method === "withdraw_claim" && claim.state !== 0)
      throw new Error(
        "Only available claims may be withdrawn. Unknown/in-flight claims cannot be retried.",
      );
    if (
      action.method === "retry_failed_claim" &&
      (claim.state !== 2 ||
        BigInt(state.account.amount) <
          BigInt(l.local_required) + BigInt(l.inflight))
    )
      throw new Error(
        "Confirmed failure and fully returned cash required before restoring claim.",
      );
  }
  return state;
}
export function storageRequest() {
  return request(
    "Register or top up storage",
    "storage_deposit",
    { account_id: null, registration_only: false },
    parseAmount("0.05").toString(),
    [
      "0.05 NEAR retained as your prepaid storage credit.",
      "This is separate from treasury backing. Unused credit is not automatically withdrawn by this UI.",
    ],
  );
}
