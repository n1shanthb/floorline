import { ArrowUpRight, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../lib/app-context";
import { ratio, units } from "../lib/math";
import { Badge, Chart, Heading, Row } from "../components/ui";
import { Rc1ProofStrip } from "../components/Rc1Evidence";
import { claimById, loanById, view } from "../lib/rpc";
import { ActivityPreview } from "../components/activity";
export default function Overview() {
  const a = useApp(),
    l = a.snapshot?.ledger;
  const stopped = a.snapshot?.pilot?.stopped;
  const unavailable = l && BigInt(l.T) > 0n && BigInt(l.L) > BigInt(l.T);
  const [summary, setSummary] = useState<{
    account: string;
    available: string;
    unresolved: number;
    nfts: number;
  } | null>(null);
  const [positionError, setPositionError] = useState("");
  useEffect(() => {
    let live = true;
    if (a.account)
      void Promise.all([
        Promise.all(a.tracked.claims.map((id) => claimById(id))),
        Promise.all(a.tracked.loans.map((id) => loanById(id))),
      ])
        .then(async ([claims, loans]) => {
          const nftReads = await Promise.all(
            loans
              .filter((loan) => loan?.state === 1)
              .map((loan) =>
                view<{ owner_id: string } | null>("nft_token", {
                  token_id: loan!.id,
                }),
              ),
          );
          const ownedClaims = claims.filter(
            (claim) => claim?.owner === a.account,
          );
          if (live) {
            setSummary({
              account: a.account,
              available: ownedClaims
                .reduce(
                  (sum, c) => sum + (c?.state === 0 ? BigInt(c.amount) : 0n),
                  0n,
                )
                .toString(),
              unresolved: ownedClaims.filter(
                (c) => c?.state === 1 || c?.state === 2,
              ).length,
              nfts: nftReads.filter((nft) => nft?.owner_id === a.account)
                .length,
            });
            setPositionError("");
          }
        })
        .catch((e) => {
          if (live)
            setPositionError(
              e instanceof Error ? e.message : "Position details unavailable",
            );
        });
    return () => {
      live = false;
    };
  }, [a.account, a.tracked.claims, a.tracked.loans, a.snapshot]);
  return (
    <>
      <Heading
        title="Your financial playground"
        description={
          stopped
            ? "RC1 acceptance finished 40/40. New-risk is permanently stopped — browse live accounting and verified receipts."
            : "Treasury-backed mechanics on NEAR testnet. Live reads plus verified RC1 receipts."
        }
      />
      <div className="overview-grid">
        <section className="backing-panel">
          <span className="eyebrow">Backing per FLOOR</span>
          <div
            className="display-number value-enter"
            key={l ? `${l.L}/${l.T}` : "pending"}
          >
            {l ? ratio(l.L, l.T, 8) : <span className="skeleton">······</span>}
            <small>NEAR</small>
          </div>
          <p className="panel-caption">
            {l ? "Current RPC snapshot" : "Awaiting RPC"} · Not a redemption
            quote
          </p>
          <Chart />
          <p className="footnote chart-history-note">
            Chart: verified historical steps - not live history
          </p>
        </section>
        <section className="card position-card">
          <div className="section-head">
            <h3>Your position</h3>
            <button className="button secondary small" onClick={a.openWallet}>
              <Wallet size={13} />
              {a.account ? "Wallet" : "Connect"}
            </button>
          </div>
          {a.account ? (
            <div className="wallet-position">
              <span className="eyebrow">Available FLOOR</span>
              <strong>
                {a.position ? units(a.position.balance, 8) : "Reading…"}
              </strong>
              <span className="account-label">{a.account}</span>
              {summary?.account === a.account ? (
                <>
                  <Row label="Tracked available claims">
                    {units(summary.available, 12)} NEAR
                  </Row>
                  <Row label="Tracked unresolved payouts">
                    {summary.unresolved}
                  </Row>
                  <Row label="Active tracked NFTs owned">{summary.nfts}</Row>
                  <p className="footnote">
                    Partial discovery from known and saved IDs. These totals are
                    not an exhaustive account index.
                  </p>
                </>
              ) : (
                <p className="footnote">
                  Reading tracked claims and NFT ownership…
                </p>
              )}
              {(positionError || a.walletError) && (
                <p className="notice" role="alert">
                  {positionError || a.walletError}
                </p>
              )}
              <Link className="text-link" to="/app/treasury?tab=Claims">
                Find your native claims
                <ArrowUpRight size={13} />
              </Link>
              <Link className="text-link" to="/app/loans?tab=My%20NFTs">
                View tracked NFT rights
                <ArrowUpRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="empty-position">
              <Wallet size={22} />
              <p>
                Connect to view your FLOOR
                <br />
                and tracked loan NFTs.
              </p>
            </div>
          )}
          <div className="actions">
            <Link className="button primary" to="/app/treasury?tab=Redeem">
              Redeem
              <ArrowUpRight size={14} />
            </Link>
            <Link className="button secondary" to="/app/loans">
              Explore loans
            </Link>
          </div>
        </section>
      </div>
      <div className="metrics-grid">
        <div className="card metric">
          <span className="eyebrow">Total backing</span>
          <strong>
            {l ? units(l.L, 6) : "—"}
            <small>NEAR</small>
          </strong>
          <p>Unencumbered liquid treasury backing</p>
        </div>
        <div className="card metric">
          <span className="eyebrow">FLOOR supply</span>
          <strong>
            {l ? units(l.T, 6) : "—"}
            <small>FLOOR</small>
          </strong>
          <p>Collateral counted exactly once</p>
        </div>
        <div className="card metric lime">
          <span className="eyebrow">Action status</span>
          <strong className="text-metric">
            {!l
              ? "Reading state"
              : stopped
                ? "New risk stopped"
                : unavailable
                  ? "Issue unavailable"
                  : "Check issue quote"}
          </strong>
          <p>
            {stopped
              ? "Issuance, redeem, fund/accept offers and contribute are blocked on RC1."
              : unavailable
                ? "The invariant blocks positive 1:1 issuance."
                : "Every action is checked against current state."}
          </p>
        </div>
      </div>
      <div className="overview-shortcuts">
        <Badge tone="white">
          <ShieldCheck size={13} />
          {l
            ? BigInt(l.account_balance) >= BigInt(l.local_required)
              ? "Local solvency verified"
              : "Reserve deficit — do not transact"
            : "Solvency awaiting RPC"}
        </Badge>
        <Link className="text-link" to="/verify">
          Open RC1 proof catalog
          <ArrowUpRight size={13} />
        </Link>
        <Link className="text-link" to="/app/treasury">
          Inspect treasury reserves
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <Rc1ProofStrip
        surface="overview"
        title="RC1 acceptance highlights"
        description="Issue, redeem, contribute, irreversible stop, and post-stop exit — finalized on public testnet."
      />
      <ActivityPreview />
    </>
  );
}
