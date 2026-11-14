import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import {
  ACCEPTANCE,
  CODE_HASH,
  CONTRACT,
  GUARDIAN,
  NIO_DEMO,
  NIO_PROOF_INDEX,
  NIO_REPO,
  NIO_VERIFY,
  SOURCE,
  accountLink,
  txLink,
} from "../lib/config";
import { Badge, Brand, External, Heading, Row, Testnet } from "../components/ui";
import { useApp } from "../lib/app-context";
import { ratio, units } from "../lib/math";

type Proof = {
  id: string;
  title: string;
  group: string;
  step_id: string;
  transaction_hash: string;
  explorer_url: string;
  method: string | null;
  signer: string;
  classification: string;
  status: string;
  receipt_proof?: { count: number | null; descendants: string[] };
  caveats?: string[];
  demonstrates?: string;
};

type Manifest = {
  verified_rows: number;
  total_rows: number;
  acceptance_status: string;
  expected_code_hash: string;
  contract: string;
  final_state?: {
    pilot?: { stopped?: boolean; guardian?: string };
    ledger?: { L?: string; T?: string; inflight?: string; storage_total?: string };
    admission?: { occupied?: number; capacity?: number };
    last_verified_at?: { height?: number };
  };
  gas_amendments?: Array<{ step_id: string; planned_gas: string; finalized_gas: string }>;
  proofs: Proof[];
};

const GROUP_LABEL: Record<string, string> = {
  deploy: "Deployment & funding",
  registration: "Registration",
  floor_lifecycle: "FLOOR lifecycle",
  lending_repay: "Lending · repayment",
  lending_default: "Lending · default",
  cancel: "Offer cancellation",
  storage_stop: "Storage · stop · exit",
};

export default function Verify() {
  const app = useApp();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");

  useEffect(() => {
    let live = true;
    fetch("/evidence/proofs.json")
      .then((r) => {
        if (!r.ok) throw new Error("Evidence manifest unavailable");
        return r.json();
      })
      .then((data: Manifest) => {
        if (live) {
          setManifest(data);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Failed to load proofs");
      });
    return () => {
      live = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const proofs = manifest?.proofs || [];
    return proofs.filter((p) => {
      if (group !== "all" && p.group !== group) return false;
      if (!q.trim()) return true;
      const hay = `${p.id} ${p.title} ${p.step_id} ${p.method} ${p.transaction_hash} ${p.signer}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [manifest, q, group]);

  const live = app.snapshot;
  const recorded = manifest?.final_state;

  return (
    <div className="judge-page">
      <header className="judge-header">
        <Brand />
        <nav aria-label="Proof navigation">
          <Link to="/">Home</Link>
          <Link to="/judges">Judge quickstart</Link>
          <Link to="/app">App</Link>
          <Testnet />
        </nav>
      </header>

      <Heading
        title="Proof & verify"
        description="Read-only RC1 public-testnet acceptance catalog. No wallet required. No new financial transactions."
      />

      <section className="card stack-gap verify-status">
        <div className="verify-status-badges">
          <Badge tone="lime">RC1 · {ACCEPTANCE.verifiedRows}/40 FINAL_VERIFIED</Badge>
          <Badge tone="violet">TESTNET ONLY</Badge>
          {live?.pilot?.stopped ? (
            <Badge>NEW RISK STOPPED</Badge>
          ) : (
            <Badge>Live stop status pending RPC</Badge>
          )}
        </div>
        <dl className="verify-meta">
          <div>
            <dt>Contract</dt>
            <dd>
              <External href={accountLink(CONTRACT)}>{CONTRACT}</External>
            </dd>
          </div>
          <div>
            <dt>Expected code hash</dt>
            <dd>
              <code className="mono break">{CODE_HASH}</code>
            </dd>
          </div>
          <div>
            <dt>Live code hash</dt>
            <dd>
              <code className="mono break">
                {live?.account.code_hash ||
                  (app.loading ? "Loading…" : app.error || "Not verified")}
              </code>
            </dd>
          </div>
          <div>
            <dt>Guardian</dt>
            <dd>
              <code className="mono break">
                {live?.pilot?.guardian || GUARDIAN}
              </code>
            </dd>
          </div>
          <div>
            <dt>Acceptance status</dt>
            <dd className="break">
              {manifest?.acceptance_status || ACCEPTANCE.status}
            </dd>
          </div>
          <div>
            <dt>Recorded L / T</dt>
            <dd>
              {recorded?.ledger?.L && recorded?.ledger?.T
                ? `${units(recorded.ledger.L)} NEAR / ${units(recorded.ledger.T)} FLOOR (ratio ${ratio(recorded.ledger.L, recorded.ledger.T)})`
                : "See evidence JSON"}
            </dd>
          </div>
          <div>
            <dt>Live L / T</dt>
            <dd>
              {live
                ? `${units(live.ledger.L)} NEAR / ${units(live.ledger.T)} FLOOR (ratio ${ratio(live.ledger.L, live.ledger.T)}) · block ${live.blockHeight}`
                : app.error || "Live RPC unavailable — use recorded evidence"}
            </dd>
          </div>
          <div>
            <dt>Inflight / claims</dt>
            <dd>
              {live
                ? `inflight ${live.ledger.inflight}; storage_total ${units(live.ledger.storage_total)} NEAR`
                : recorded?.ledger
                  ? `recorded inflight ${recorded.ledger.inflight}; storage_total ${units(recorded.ledger.storage_total || "0")} NEAR`
                  : "Not verified"}
            </dd>
          </div>
          <div>
            <dt>Admission</dt>
            <dd>
              {live?.admission
                ? `${live.admission.occupied}/${live.admission.capacity}`
                : recorded?.admission
                  ? `${recorded.admission.occupied}/${recorded.admission.capacity} (recorded)`
                  : "Not exposed / not verified"}
            </dd>
          </div>
        </dl>
        <p className="muted">
          L/T is an accounting ratio, not a guaranteed executable redemption
          price. RC1 is permanently stopped for new-risk actions; already-funded
          claims and permitted exits remain subject to contract rules.
        </p>
        <div className="button-row">
          <a className="button primary" href="/evidence/proofs.json" download>
            Download proofs.json
          </a>
          <External href={`${SOURCE}/blob/codex/mainnet-readiness/docs/PROOF_INDEX.md`}>
            Proof index
          </External>
          <External href={txLink(ACCEPTANCE.stopTx)}>Stop tx</External>
          <External href={txLink(ACCEPTANCE.unregisterTx)}>Unregister tx</External>
        </div>
      </section>

      <section className="card stack-gap">
        <h2>Receipt methodology</h2>
        <p>
          Each acceptance row was closed only after dual-provider FINAL status
          and SuccessValue / SuccessReceiptId on the root and every descendant
          receipt. A successful root alone is not treated as full success.
        </p>
        <p>
          Two evidence-only gas amendments are preserved:{" "}
          <code>collateral_to_borrower</code> and <code>contribute</code>{" "}
          finalized at 30 Tgas instead of the planned 110 Tgas. Amounts,
          receivers, and arguments were unchanged.
        </p>
        <p>
          Live RPC reads are rate-limited by public providers. Transient 408/429
          responses are not proof a historical transaction failed.
        </p>
      </section>

      <section className="card stack-gap">
        <div className="section-head">
          <h2>40-step catalog</h2>
          <Badge tone="lime">{filtered.length} shown</Badge>
        </div>
        <div className="verify-filters">
          <label className="search-field">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search method, hash, signer…"
              aria-label="Filter proofs"
            />
          </label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label="Filter by group"
          >
            <option value="all">All groups</option>
            {Object.entries(GROUP_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="proof-list">
          {filtered.map((p) => (
            <article key={p.id} className="proof-card">
              <div className="section-head">
                <Badge>{GROUP_LABEL[p.group] || p.group}</Badge>
                <Badge tone="lime">{p.status}</Badge>
                <Badge tone="white">{p.classification}</Badge>
              </div>
              <h3>{p.title}</h3>
              <Row label="Step">{p.step_id}</Row>
              <Row label="Method">{p.method || "—"}</Row>
              <Row label="Signer">{p.signer}</Row>
              <Row label="Receipts">
                {p.receipt_proof?.count ?? "Not recorded"}
                {p.receipt_proof?.descendants?.length
                  ? ` · ${p.receipt_proof.descendants.length} descendants`
                  : ""}
              </Row>
              {p.caveats?.length ? (
                <p className="muted">Caveat: {p.caveats.join(" ")}</p>
              ) : null}
              <a className="button ghost" href={p.explorer_url} target="_blank" rel="noreferrer">
                Open explorer <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack-gap nio-related">
        <Badge>Related submission · not Floorline</Badge>
        <h2>NEAR Intent One (separate project)</h2>
        <p>
          Same solo author, independent codebase and independent NEAR HACKATHON
          submission. NIO mainnet Intents evidence is not Floorline activity.
        </p>
        <div className="button-row">
          <External href={NIO_DEMO}>NIO demo</External>
          <External href={NIO_VERIFY}>NIO /verify</External>
          <External href={NIO_REPO}>NIO repository</External>
          <External href={NIO_PROOF_INDEX}>NIO proof index</External>
        </div>
      </section>
    </div>
  );
}
