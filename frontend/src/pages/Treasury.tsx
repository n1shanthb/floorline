import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Badge, ChartCard, Heading, Row, Tabs } from "../components/ui";
import Claims from "../components/Claims";
import { useApp } from "../lib/app-context";
import { exact, issuance, parseAmount, quote, ratio, units } from "../lib/math";
import { request, storageRequest } from "../lib/actions";
import { RECORD_HEADROOM } from "../lib/config";
import FinancialTools from "../components/FinancialTools";
const tabs = ["Issue", "Redeem", "Claims"] as const;
export default function Treasury() {
  const a = useApp(),
    [params, setParams] = useSearchParams(),
    tab = tabs.find((t) => t === params.get("tab")) || "Redeem",
    l = a.snapshot?.ledger;
  const [amount, setAmount] = useState("0.1"),
    [slippage, setSlippage] = useState("50");
  let n = 0n,
    q = 0n,
    m = 0n,
    min = 0n,
    allowed = false,
    inputError = "";
  try {
    n = parseAmount(amount);
    if (l && n > 0n) {
      if (tab === "Issue") {
        const result = issuance(n, BigInt(l.L), BigInt(l.T));
        m = result.minted;
        allowed = result.allowed;
      } else if (tab === "Redeem") {
        q = quote(BigInt(l.L), BigInt(l.T), n, BigInt(l.tax_bps));
        if (!/^\d{1,3}$/.test(slippage) || BigInt(slippage) > 500n)
          throw new Error("Minimum protection must be 0–500 basis points.");
        min = (q * (10000n - BigInt(slippage))) / 10000n;
        allowed = q > 0n && min > 0n;
      }
    }
  } catch (e) {
    inputError = e instanceof Error ? e.message : "Invalid input";
  }
  const needsStorage =
    !!a.account &&
    (!a.position?.storage ||
      (tab === "Redeem" &&
        BigInt(a.position.storage.available) < RECORD_HEADROOM));
  const insufficientFloor =
    tab === "Redeem" && !!a.position && n > BigInt(a.position.balance);
  const action = () => {
    if (!l) return;
    if (tab === "Issue")
      a.review(
        request(
          "Issue FLOOR",
          "issue",
          { min_tokens: m.toString() },
          n.toString(),
          [
            `Deposit ${exact(n)} NEAR for at least ${exact(m)} FLOOR.`,
            `Immutable issuance rate: 1:1. Nondilution checked against fresh L and T.`,
          ],
        ),
      );
    else
      a.review(
        request(
          "Redeem FLOOR",
          "redeem",
          { amount: n.toString(), min_out: min.toString() },
          "0",
          [
            `Burn ${exact(n)} FLOOR. Quote at review: ${exact(q)} NEAR.`,
            `Minimum accepted: ${exact(min)} NEAR (${slippage} bps tolerance).`,
            "The contract creates a native claim. Withdraw it separately from Claims.",
          ],
          "The curve is size-dependent. Backing per FLOOR is not your guaranteed redemption price.",
        ),
      );
  };
  const pct =
    l && BigInt(l.account_balance) > 0n
      ? Number(
          (BigInt(l.local_required) * 10000n) / BigInt(l.account_balance),
        ) / 100
      : 0;
  return (
    <>
      <Heading
        title="The treasury"
        description="Every token has mechanics. See the backing, understand the quote, make your move."
      />
      <div className="metrics-grid treasury-metrics">
        <div className="card metric">
          <span className="eyebrow">Liquid backing</span>
          <strong>
            {l ? units(l.L, 8) : "—"}
            <small>NEAR</small>
          </strong>
        </div>
        <div className="card metric">
          <span className="eyebrow">FLOOR supply</span>
          <strong>
            {l ? units(l.T, 8) : "—"}
            <small>FLOOR</small>
          </strong>
        </div>
        <div className="card metric lilac">
          <span className="eyebrow">Backing per FLOOR</span>
          <strong>
            {l ? ratio(l.L, l.T, 8) : "—"}
            <small>NEAR</small>
          </strong>
        </div>
      </div>
      <div className="treasury-grid">
        <ChartCard />
        <section className="card action-card">
          <Tabs
            values={[...tabs]}
            value={tab}
            onChange={(v) => setParams({ tab: v })}
            label="Treasury actions"
          />
          {tab === "Claims" ? (
            <Claims />
          ) : (
            <>
              <div className="amount-box">
                <div className="amount-label">
                  <label htmlFor="treasury-amount">
                    {tab === "Issue" ? "You deposit" : "You redeem"}
                  </label>
                  {tab === "Redeem" && (
                    <button
                      className="text-link"
                      disabled={!a.position}
                      onClick={() =>
                        setAmount(exact(a.position?.balance || "0"))
                      }
                    >
                      MAX
                    </button>
                  )}
                </div>
                <div className="amount-line">
                  <input
                    id="treasury-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-describedby="treasury-validation"
                  />
                  <b>{tab === "Issue" ? "NEAR" : "FLOOR"}</b>
                </div>
              </div>
              {tab === "Redeem" ? (
                <>
                  <Row label="Curve tax parameter">
                    {l ? `${BigInt(l.tax_bps) / 100n}%` : "—"}
                  </Row>
                  <Row label="Estimated NEAR claim">
                    {q ? `${units(q, 12)} NEAR` : "—"}
                  </Row>
                  <Row label="Minimum accepted">
                    {min ? `${units(min, 12)} NEAR` : "—"}
                  </Row>
                  <label className="field-label" htmlFor="slippage">
                    Quote tolerance (basis points; 50 = 0.5%)
                  </label>
                  <input
                    id="slippage"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    inputMode="numeric"
                  />
                  <p className="footnote">
                    Full precision is shown in review. FLOOR is burned; NEAR is
                    claimed in a separate withdrawal.
                  </p>
                </>
              ) : (
                <>
                  <Row label="FLOOR at fixed 1:1 rate">
                    {m ? exact(m) : "—"}
                  </Row>
                  <Row label="Nondilution condition">d × T ≥ L × minted</Row>
                  {l && BigInt(l.T) > 0n && BigInt(l.L) > BigInt(l.T) && (
                    <div className="notice">
                      Issuance unavailable. With backing above 1 NEAR per FLOOR,
                      positive 1:1 issuance would dilute existing holders. The
                      contract rejects it.
                    </div>
                  )}
                </>
              )}
              <div id="treasury-validation" aria-live="polite">
                {inputError && <p className="form-error">{inputError}</p>}
              </div>
              {a.account && (
                <p className="footnote">
                  Available:{" "}
                  {a.position ? units(a.position.balance, 12) : "reading…"}{" "}
                  FLOOR · prepaid storage available:{" "}
                  {a.position?.storage
                    ? units(a.position.storage.available, 8)
                    : "not registered"}{" "}
                  NEAR
                </p>
              )}
              {insufficientFloor && (
                <p className="form-error" role="alert">
                  Insufficient available FLOOR for this redemption. Locked
                  collateral is excluded.
                </p>
              )}
              {needsStorage && allowed ? (
                <>
                  <div className="notice">
                    Register or top up storage before creating a payout record.
                    This UI uses a conservative 0.01 NEAR available-credit
                    cushion.
                  </div>
                  <button
                    className="button secondary full"
                    onClick={() => a.review(storageRequest())}
                  >
                    Review storage top-up · 0.05 NEAR
                  </button>
                </>
              ) : (
                <button
                  className="button primary full"
                  disabled={
                    !!a.account &&
                    (!allowed ||
                      insufficientFloor ||
                      !!inputError ||
                      !l ||
                      !!a.error)
                  }
                  onClick={a.account ? action : a.openWallet}
                >
                  {!a.account
                    ? "Connect wallet to continue"
                    : tab === "Issue"
                      ? "Review issuance"
                      : "Review redemption"}
                  <ArrowUpRight size={16} />
                </button>
              )}
            </>
          )}
        </section>
      </div>
      <FinancialTools />
      <section className="card solvency">
        <div className="section-head">
          <h3>Native balance vs local reserves</h3>
          <Badge tone="lime">
            <ShieldCheck size={13} />
            {l
              ? BigInt(l.account_balance) >= BigInt(l.local_required)
                ? "Solvency checked"
                : "Deficit detected"
              : "Awaiting RPC"}
          </Badge>
        </div>
        {l ? (
          <>
            <div className="reserve-totals">
              <div>
                <span>Actual balance A</span>
                <b>{units(l.account_balance, 8)} NEAR</b>
              </div>
              <div>
                <span>Required reserves R_local</span>
                <b>{units(l.local_required, 8)} NEAR</b>
              </div>
            </div>
            <div
              className="solvency-bar"
              role="img"
              aria-label={`Required reserves ${units(l.local_required)} of ${units(l.account_balance)} NEAR actual cash`}
            >
              <div style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="reserve-legend">
              <span>
                <i />
                Required reserves
              </span>
              <span>
                <i />
                Unallocated / inflight timing margin:{" "}
                {units(
                  BigInt(l.account_balance) - BigInt(l.local_required),
                  8,
                )}{" "}
                NEAR
              </span>
            </div>
            <details>
              <summary>Inspect exact reserve accounting</summary>
              {[
                "L",
                "unused_lender",
                "borrower_claims",
                "lender_claims",
                "redemption_claims",
                "cancellation_claims",
                "storage_refund_claims",
                "storage_total",
                "operational",
                "inflight",
                "storage_stake",
              ].map((k) => (
                <Row key={k} label={k}>
                  {exact(String(l[k]))} NEAR
                </Row>
              ))}
              <p className="footnote">
                In-flight payouts are tracked separately. A − R_local is not
                automatically spendable cash or additional token backing.
                Storage stake is covered within protected reserves, not added to
                backing.
              </p>
            </details>
          </>
        ) : (
          <p className="muted">
            Reserve accounting requires a successful chain read. No historical
            values are presented as current.
          </p>
        )}
      </section>
    </>
  );
}
