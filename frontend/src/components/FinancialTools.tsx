import { useState } from "react";
import { useApp } from "../lib/app-context";
import { exact, parseAmount, validAccount } from "../lib/math";
import { request } from "../lib/actions";
import { CONTRACT } from "../lib/config";
import { Tabs } from "./ui";
export default function FinancialTools() {
  const app = useApp(),
    [mode, setMode] = useState("Transfer FLOOR"),
    [amount, setAmount] = useState("0.1"),
    [recipient, setRecipient] = useState("");
  let n = 0n,
    error = "";
  try {
    n = parseAmount(amount);
    if (n <= 0n) throw new Error("Enter a positive amount.");
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid amount";
  }
  const transfer = mode === "Transfer FLOOR";
  if (
    !error &&
    transfer &&
    app.account &&
    app.position &&
    n > BigInt(app.position.balance)
  )
    error =
      "Insufficient available FLOOR. Locked collateral cannot be transferred.";
  if (
    !error &&
    !transfer &&
    app.snapshot &&
    BigInt(app.snapshot.ledger.T) === 0n
  )
    error = "Contributions require positive supply.";
  const disabled =
    !!error ||
    !!app.error ||
    !app.snapshot ||
    (transfer &&
      (!validAccount(recipient) ||
        recipient === app.account ||
        recipient === CONTRACT));
  return (
    <section
      className="card financial-tools"
      aria-label="Token transfer and treasury contribution"
    >
      <h3>Move FLOOR or support backing</h3>
      <Tabs
        values={["Transfer FLOOR", "Contribute NEAR"]}
        value={mode}
        onChange={setMode}
        label="Existing token and contribution methods"
      />
      <p className="footnote">
        {transfer
          ? "Send available FLOOR to a registered testnet account. Supply and backing do not change."
          : "An irreversible explicit treasury contribution increases backing without minting FLOOR or creating a repayment right."}
      </p>
      <label className="field-label" htmlFor="support-amount">
        Amount · {transfer ? "FLOOR" : "NEAR"}
      </label>
      <input
        id="support-amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {transfer && (
        <>
          <label className="field-label" htmlFor="floor-recipient">
            FLOOR recipient account
          </label>
          <input
            id="floor-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
          />
          <p className="footnote">
            The recipient’s actual account and Floorline registration are
            checked before wallet approval.
          </p>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button secondary full"
        disabled={!!app.account && disabled}
        onClick={() => {
          if (!app.account) {
            app.openWallet();
            return;
          }
          app.review(
            transfer
              ? request(
                  "Transfer available FLOOR",
                  "ft_transfer",
                  { receiver_id: recipient, amount: n.toString(), memo: null },
                  "1",
                  [
                    `Transfer ${exact(n)} FLOOR to ${recipient}.`,
                    "Exactly 1 yoctoNEAR is attached for authentication.",
                  ],
                )
              : request(
                  "Contribute to treasury backing",
                  "contribute",
                  {},
                  n.toString(),
                  [
                    `Permanently contribute ${exact(n)} NEAR. No tokens are minted.`,
                  ],
                  "This is a contribution, not a loan or refundable deposit.",
                ),
          );
        }}
      >
        {app.account
          ? transfer
            ? "Review FLOOR transfer"
            : "Review treasury contribution"
          : "Connect wallet for this action"}
      </button>
      {app.account && app.position?.storage && (
        <details>
          <summary>Unused storage credit</summary>
          <p>
            Available prepaid storage: {exact(app.position.storage.available)}{" "}
            NEAR. Allocated storage is retained.
          </p>
          <button
            className="button secondary"
            disabled={
              BigInt(app.position.storage.available) === 0n || !!app.error
            }
            onClick={() =>
              app.review(
                request(
                  "Withdraw unused storage credit",
                  "storage_withdraw",
                  { amount: null },
                  "1",
                  [
                    "Withdraw all currently unused credit through the deployed automatic refund path.",
                    "Exactly 1 yoctoNEAR for authentication; 110 Tgas covers transfer and callback.",
                  ],
                  "You may need a new storage top-up for later actions. Parent success is not payout proof; all final receipts must succeed.",
                ),
              )
            }
          >
            Review unused storage withdrawal
          </button>
        </details>
      )}
    </section>
  );
}
