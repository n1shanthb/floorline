import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  Badge,
  Empty,
  Heading,
  Modal,
  NftArt,
  Row,
  Tabs,
} from "../components/ui";
import Replay from "../components/Replay";
import Claims from "../components/Claims";
import { useApp } from "../lib/app-context";
import {
  canRepay,
  durationLabel,
  canonicalId,
  exact,
  loanNames,
  parseAmount,
  units,
  validAccount,
  U64_MAX,
} from "../lib/math";
import { loanById } from "../lib/rpc";
import type { Loan } from "../lib/rpc";
import { savedProof, verifyOfferProof } from "../lib/offer-proof";
import { request, storageRequest } from "../lib/actions";
const tabs = [
  "Explore offers",
  "My loans",
  "My NFTs",
  "Lender dashboard",
] as const;
export default function Loans() {
  const a = useApp(),
    [params, setParams] = useSearchParams(),
    tab = tabs.find((t) => t === params.get("tab")) || tabs[0],
    [loans, setLoans] = useState<Loan[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [id, setId] = useState(""),
    [create, setCreate] = useState(false),
    [principal, setPrincipal] = useState("0.1"),
    [debt, setDebt] = useState("0.11"),
    [collateral, setCollateral] = useState("0.2"),
    [hours, setHours] = useState("24"),
    [recipient, setRecipient] = useState(""),
    [transfer, setTransfer] = useState<Loan | null>(null),
    [ack, setAck] = useState(false),
    [proofLoan, setProofLoan] = useState<Loan | null>(null),
    [proofHash, setProofHash] = useState(""),
    [proofBusy, setProofBusy] = useState(false),
    [proofNonce, setProofNonce] = useState(0);
  useEffect(() => {
    let live = true;
    void proofNonce;
    setBusy(true);
    void Promise.all(a.tracked.loans.map(loanById))
      .then((rows) => {
        if (live) {
          setLoans(rows.filter((v): v is Loan => v !== null));
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Loan reads failed");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [a.tracked.loans, a.snapshot, proofNonce]);
  const lookup = async () => {
    if (!canonicalId(id)) {
      setError("Use a canonical numeric loan ID.");
      return;
    }
    try {
      const loan = await loanById(id);
      if (!loan) throw new Error("No loan exists at that ID.");
      a.trackId("loans", id);
      setError("");
      setId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loan read failed");
    }
  };
  const filtered = loans.filter((l) =>
    tab === "Explore offers"
      ? l.state === 0
      : tab === "My NFTs"
        ? l.state === 1 && l.owner === a.account
        : tab === "My loans"
          ? l.owner === a.account || l.borrower === a.account
          : l.lender === a.account,
  );
  const makeOffer = () => {
    try {
      const p = parseAmount(principal),
        r = parseAmount(debt),
        c = parseAmount(collateral);
      if (!/^\d+$/.test(hours) || BigInt(hours) === 0n)
        throw new Error("Enter a positive whole number of hours.");
      const ns = BigInt(hours) * 3600000000000n;
      if (ns > U64_MAX) throw new Error("Term exceeds U64 nanoseconds.");
      if (p <= 0n || r < p || c <= 0n)
        throw new Error(
          "Positive principal and collateral, repayment at least principal required.",
        );
      setCreate(false);
      a.review(
        request(
          "Fund a lender offer",
          "fund_offer",
          {
            repayment: r.toString(),
            collateral: c.toString(),
            duration_ns: ns.toString(),
          },
          p.toString(),
          [
            `Escrow ${exact(p)} NEAR separately from treasury backing.`,
            `Fixed debt ${exact(r)} NEAR; collateral ${exact(c)} FLOOR.`,
            `Term ${hours} hours, starting when an offer is accepted.`,
          ],
          "On default you receive FLOOR collateral, not a guaranteed NEAR repayment.",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid offer");
    }
  };
  const now = a.snapshot ? BigInt(a.snapshot.timestampNs) : 0n;
  return (
    <>
      <Heading
        title="Loans with a twist"
        description="Borrow against FLOOR. Transfer the right to repay and recover collateral with an NFT."
      />
      <div className="page-actions">
        <Tabs
          values={[...tabs]}
          value={tab}
          onChange={(v) => setParams({ tab: v })}
          label="Loan views"
        />
        <button
          className="button primary small"
          onClick={() => (a.account ? setCreate(true) : a.openWallet())}
        >
          <Plus size={15} />
          Create offer
        </button>
      </div>
      <div className="lookup card">
        <div>
          <b>Find an on-chain loan</b>
          <p>
            Known IDs + your browser’s saved IDs. This is not an exhaustive
            market.
          </p>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <label className="sr-only" htmlFor="loan-id">
            Loan ID
          </label>
          <input
            id="loan-id"
            placeholder="Loan ID, e.g. 2"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button className="button secondary" type="submit">
            Look up
          </button>
        </form>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <section className="loan-results">
        <div className="section-head">
          <h3>{tab === "Explore offers" ? "Open tracked offers" : tab}</h3>
          <Badge tone="white">RPC reads · partial discovery</Badge>
        </div>
        {busy ? (
          <div className="card empty" role="status">
            Reading tracked loan records…
          </div>
        ) : tab !== "Explore offers" && !a.account ? (
          <div className="card">
            <Empty title="Bring your wallet">
              <button className="button primary" onClick={a.openWallet}>
                Connect wallet
              </button>
            </Empty>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <Empty
              title={
                tab === "Explore offers"
                  ? "No open offers among tracked IDs"
                  : "No matching tracked rights"
              }
            >
              <p>
                {tab === "Explore offers"
                  ? "The demonstrated loans are closed. Look up a funded offer ID or create a lender-funded offer."
                  : "Look up an ID from your receipts. No ownership or loan list is fabricated."}
              </p>
            </Empty>
          </div>
        ) : (
          <div className="loan-card-grid">
            {filtered.map((loan) => {
              const term = savedProof(loan.id)?.durationNs || "";
              return (
                <article className="card loan-card" key={loan.id}>
                  <div className="section-head">
                    <b>Loan #{loan.id}</b>
                    <Badge tone={loan.state >= 2 ? "lime" : "violet"}>
                      {loanNames[loan.state]}
                    </Badge>
                  </div>
                  <div className="eyebrow">Principal funded by lender</div>
                  <div className="loan-value">
                    {units(loan.principal, 8)}
                    <small>NEAR</small>
                  </div>
                  <Row label="Fixed repayment">
                    {units(loan.repayment, 12)} NEAR
                  </Row>
                  <Row label="Locked collateral">
                    {units(loan.collateral, 12)} FLOOR
                  </Row>
                  <Row label="Lender">
                    <span className="break">{loan.lender}</span>
                  </Row>
                  {loan.state === 0 ? (
                    <Row label="Term">
                      {term
                        ? durationLabel(term)
                        : "Unavailable from contract view"}
                    </Row>
                  ) : (
                    <>
                      <Row label="Current / last NFT owner">
                        <span className="break">{loan.owner}</span>
                      </Row>
                      <Row label="Expiry">
                        {new Date(
                          Number(BigInt(loan.expiry) / 1000000n),
                        ).toLocaleString()}
                      </Row>
                      <Row label="Pending NFT callbacks">{loan.pending}</Row>
                    </>
                  )}
                  {loan.state === 0 && (
                    <>
                      <p className="footnote">
                        The lender, not the treasury, supplies principal.
                        Borrowing creates a native claim to withdraw separately.
                      </p>
                      {!term && (
                        <p className="notice">
                          The deployed get_loan view omits the offer duration.
                          Borrow is disabled until its exact term is verified
                          from the funding transaction receipt.
                        </p>
                      )}
                      <button
                        className="button secondary full"
                        onClick={() => {
                          setProofLoan(loan);
                          setProofHash("");
                          setError("");
                        }}
                      >
                        Verify funding receipt & term
                      </button>
                      <button
                        className="button primary full"
                        disabled={!term}
                        onClick={() =>
                          a.review(
                            request(
                              "Borrow against FLOOR",
                              "accept_offer",
                              { loan_id: loan.id },
                              "0",
                              [
                                `Lock ${exact(loan.collateral)} FLOOR; principal ${exact(loan.principal)} NEAR becomes your claim.`,
                                `Repayment ${exact(loan.repayment)} NEAR. Term ${term ? durationLabel(term) : "unknown"} from acceptance.`,
                              ],
                              "The NFT owns the repay/recover right. Default transfers collateral to lender.",
                            ),
                          )
                        }
                      >
                        Review borrow
                      </button>
                      {loan.lender === a.account && (
                        <button
                          className="button secondary full"
                          onClick={() =>
                            a.review(
                              request(
                                "Cancel lender offer",
                                "cancel_offer",
                                { loan_id: loan.id },
                                "0",
                                [
                                  "Move escrowed principal to your cancellation claim.",
                                  "Withdraw that claim separately.",
                                ],
                              ),
                            )
                          }
                        >
                          Review cancellation
                        </button>
                      )}
                    </>
                  )}
                  {loan.state === 1 && (
                    <div className="loan-buttons">
                      {loan.owner === a.account && (
                        <>
                          <button
                            className="button primary full"
                            disabled={!canRepay(loan, a.account, now)}
                            onClick={() =>
                              a.review(
                                request(
                                  "Repay and reclaim FLOOR",
                                  "repay",
                                  { loan_id: loan.id },
                                  loan.repayment,
                                  [
                                    `Pay exactly ${exact(loan.repayment)} NEAR.`,
                                    `Release ${exact(loan.collateral)} FLOOR to you, the current NFT owner.`,
                                    "Loan NFT burns; lender receives a separately withdrawable native claim.",
                                  ],
                                ),
                              )
                            }
                          >
                            Review exact repayment
                          </button>
                          <button
                            className="button secondary full"
                            onClick={() => {
                              setTransfer(loan);
                              setRecipient("");
                              setAck(false);
                            }}
                          >
                            Transfer NFT recovery right
                          </button>
                        </>
                      )}
                      {now >= BigInt(loan.expiry) && (
                        <button
                          className="button secondary full"
                          disabled={loan.pending !== 0}
                          onClick={() =>
                            a.review(
                              request(
                                "Settle expired loan",
                                "default_loan",
                                { loan_id: loan.id },
                                "0",
                                [
                                  "Permissionless at or after contract expiry, with no pending NFT callbacks.",
                                  `${exact(loan.collateral)} FLOOR goes to lender; NFT burns.`,
                                ],
                                "Default does not guarantee that the lender recovers any NEAR.",
                              ),
                            )
                          }
                        >
                          Review default settlement
                        </button>
                      )}
                      {loan.pending > 0 && (
                        <p className="notice">
                          Settlement is blocked until NFT callbacks resolve. No
                          timeout-based ownership guess.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <div className="loans-showcase">
        <section className="card historical-loan">
          <div className="section-head">
            <h3>Demo loan #2</h3>
            <Badge>Historical · repaid</Badge>
          </div>
          <span className="eyebrow">Principal funded by lender</span>
          <div className="loan-value">
            {units("100000000000000000000000")}
            <small>NEAR</small>
          </div>
          <p className="muted small-copy">
            The lender, not the treasury, funded this loan.
          </p>
          <div className="terms-grid">
            <div>
              Collateral<b>0.2 FLOOR</b>
            </div>
            <div>
              Debt repaid<b>0.11 NEAR</b>
            </div>
            <div>
              NFT transferred to<b>Dave</b>
            </div>
            <div>
              Final status<b>Repaid · NFT burned</b>
            </div>
          </div>
          <p className="footnote">
            First demonstrated loan, actual contract ID 2. Second demo loan ID 7
            defaulted. Neither is an open offer.
          </p>
          <a className="text-link" href="#loan-replay">
            Follow its story
            <ArrowUpRight size={14} />
          </a>
        </section>
        <section className="nft-show">
          <span className="eyebrow">The right to recover</span>
          <h2>
            Your loan.
            <br />
            Your NFT.
            <br />
            Your move.
          </h2>
          <p>
            Ownership follows the NFT.
            <br />
            The original borrower’s rights don’t.
          </p>
          <NftArt />
        </section>
      </div>
      <div id="loan-replay">
        <Replay />
      </div>
      {tab === "Lender dashboard" && (
        <section className="card">
          <Claims />
        </section>
      )}
      <Modal
        open={!!proofLoan}
        onClose={() => setProofLoan(null)}
        title="Verify the offer’s exact term"
        description="The deployed loan view omits duration. Supply the lender’s actual fund_offer transaction hash; all fixed terms and the returned loan ID will be checked against RPC."
      >
        <label className="field-label" htmlFor="offer-proof">
          Funding transaction hash
        </label>
        <input
          id="offer-proof"
          value={proofHash}
          onChange={(e) => setProofHash(e.target.value.trim())}
        />
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          disabled={proofBusy || !proofHash}
          onClick={() => {
            if (!proofLoan) return;
            setProofBusy(true);
            void verifyOfferProof(proofLoan, proofHash)
              .then((proof) => {
                localStorage.setItem(
                  `floorline:offer-proof:${proofLoan.id}`,
                  JSON.stringify(proof),
                );
                setProofNonce((n) => n + 1);
                setProofLoan(null);
                setError("");
                a.notify("Funding terms verified against final receipts.");
              })
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Funding proof failed",
                ),
              )
              .finally(() => setProofBusy(false));
          }}
        >
          {proofBusy
            ? "Checking final receipt..."
            : "Verify receipt - read only"}
        </button>
      </Modal>
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Create a lender-funded offer"
        description="Supply principal separately. Treasury backing will never fund this loan."
      >
        <div className="form-grid">
          {[
            ["Principal · NEAR", principal, setPrincipal],
            ["Fixed repayment · NEAR", debt, setDebt],
            ["Collateral · FLOOR", collateral, setCollateral],
            ["Term · whole hours", hours, setHours],
          ].map(([label, value, setter]) => (
            <label key={String(label)} className="field-label">
              {String(label)}
              <input
                value={String(value)}
                inputMode="decimal"
                onChange={(e) =>
                  (setter as (s: string) => void)(e.target.value)
                }
              />
            </label>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="notice">
          Funds stay in the offer until accepted or cancelled. On default the
          lender gets FLOOR, with no guaranteed NEAR recovery.
        </p>
        {!a.position?.storage ||
        BigInt(a.position.storage.available) < 10n ** 22n ? (
          <button
            className="button secondary full"
            onClick={() => {
              setCreate(false);
              a.review(storageRequest());
            }}
          >
            Review storage top-up first
          </button>
        ) : (
          <button className="button primary full" onClick={makeOffer}>
            Review offer funding
            <ArrowUpRight size={16} />
          </button>
        )}
      </Modal>
      <Modal
        open={!!transfer}
        onClose={() => setTransfer(null)}
        title="Transfer your recovery right"
        description="The receiving account becomes the sole holder of the right to repay and reclaim the locked FLOOR."
      >
        <label className="field-label" htmlFor="nft-recipient">
          Registered recipient account
        </label>
        <input
          id="nft-recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value.trim())}
          placeholder="recipient.testnet"
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          I understand that I lose the collateral recovery right when this NFT
          transfers.
        </label>
        <button
          className="button primary full"
          disabled={!ack || !validAccount(recipient) || recipient === a.account}
          onClick={() => {
            if (!transfer) return;
            const r = request(
              "Transfer loan NFT",
              "nft_transfer",
              {
                receiver_id: recipient,
                token_id: transfer.id,
                approval_id: null,
                memo: null,
              },
              "1",
              [
                `Transfer loan NFT #${transfer.id} to ${recipient}.`,
                "Exact attached deposit: 1 yoctoNEAR. Recipient registration is verified.",
              ],
              "All repayment and collateral recovery rights move to the recipient.",
            );
            setTransfer(null);
            a.review(r);
          }}
        >
          Review NFT transfer
        </button>
      </Modal>
    </>
  );
}
