import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ACCEPTANCE,
  CODE_HASH,
  CONTRACT,
  accountLink,
  txLink,
} from "../lib/config";
import { ratio, units } from "../lib/math";
import {
  loadRc1Manifest,
  proofHref,
  proofsFor,
  RC1_COPY,
  type Rc1Manifest,
  type Rc1Proof,
  type Rc1Surface,
} from "../lib/rc1-proofs";
import { useApp } from "../lib/app-context";
import { Badge, External, Row } from "./ui";

export function useRc1Manifest() {
  const [manifest, setManifest] = useState<Rc1Manifest | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void loadRc1Manifest()
      .then((m) => {
        if (live) {
          setManifest(m);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Evidence unavailable");
      });
    return () => {
      live = false;
    };
  }, []);
  return { manifest, error };
}

/** Persistent strip on every authenticated app page. */
export function Rc1AcceptanceBanner() {
  const app = useApp();
  const { manifest } = useRc1Manifest();
  const live = app.snapshot;
  const stopped = live?.pilot?.stopped ?? manifest?.final_state?.pilot?.stopped;
  const L = live?.ledger.L ?? manifest?.final_state?.ledger?.L;
  const T = live?.ledger.T ?? manifest?.final_state?.ledger?.T;

  return (
    <section className="rc1-banner card" aria-label="RC1 acceptance status">
      <div className="section-head">
        <Badge tone="lime">{RC1_COPY.badge}</Badge>
        <Badge tone="violet">TESTNET ONLY</Badge>
        {stopped ? <Badge>{RC1_COPY.stopped}</Badge> : null}
      </div>
      <p className="rc1-banner-copy">{RC1_COPY.note}</p>
      <div className="rc1-banner-grid">
        <Row label="Contract">
          <External href={accountLink(CONTRACT)} className="text-link">
            {CONTRACT}
          </External>
        </Row>
        <Row label="Code hash">
          <code className="hash-inline">
            {(live?.account.code_hash || CODE_HASH).slice(0, 12)}…
          </code>
        </Row>
        <Row label="L / T">
          {L && T
            ? `${units(L)} NEAR / ${units(T)} FLOOR · ratio ${ratio(L, T)}`
            : "Recorded in proofs.json"}
        </Row>
        <Row label="Admission">
          {live?.admission
            ? `${live.admission.occupied}/${live.admission.capacity}`
            : manifest?.final_state?.admission
              ? `${manifest.final_state.admission.occupied}/${manifest.final_state.admission.capacity} (recorded)`
              : "—"}
        </Row>
      </div>
      <div className="button-row">
        <Link className="button primary small" to="/verify">
          Open full proof catalog
          <ArrowUpRight size={14} />
        </Link>
        <External href={txLink(ACCEPTANCE.stopTx)} className="button secondary small">
          Stop tx
        </External>
        <External
          href={txLink(ACCEPTANCE.unregisterTx)}
          className="button secondary small"
        >
          Unregister tx
        </External>
        <a className="button ghost small" href="/evidence/proofs.json" download>
          proofs.json
        </a>
      </div>
    </section>
  );
}

export function Rc1ProofStrip({
  surface,
  title = "Verified RC1 receipts",
  description,
}: {
  surface: Rc1Surface;
  title?: string;
  description?: string;
}) {
  const { manifest, error } = useRc1Manifest();
  const proofs = proofsFor(manifest, surface);

  return (
    <section className="rc1-proof-strip" aria-label={title}>
      <div className="section-head">
        <h3>{title}</h3>
        <Badge tone="lime">
          <ShieldCheck size={12} />
          On-chain FINAL
        </Badge>
      </div>
      {description ? <p className="muted">{description}</p> : null}
      {error ? (
        <p className="notice" role="alert">
          {error}. Open <Link to="/verify">/verify</Link> or download{" "}
          <a href="/evidence/proofs.json">proofs.json</a>.
        </p>
      ) : null}
      <div className="rc1-proof-grid">
        {proofs.map((p) => (
          <Rc1ProofCard key={p.id} proof={p} />
        ))}
      </div>
      <Link className="text-link" to="/verify">
        Browse all {manifest?.verified_rows ?? 40} acceptance proofs
        <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}

export function Rc1ProofCard({ proof }: { proof: Rc1Proof }) {
  return (
    <article className="card rc1-proof-card">
      <div className="section-head">
        <Badge tone="white">{proof.method || proof.step_id}</Badge>
        <Badge tone="lime">{proof.status}</Badge>
      </div>
      <h4>{proof.title}</h4>
      <Row label="Signer">
        <span className="break">{proof.signer}</span>
      </Row>
      <Row label="Hash">
        <code className="hash-inline">{proof.transaction_hash.slice(0, 16)}…</code>
      </Row>
      {proof.receipt_proof?.count != null ? (
        <Row label="Receipts">{proof.receipt_proof.count}</Row>
      ) : null}
      {proof.caveats?.length ? (
        <p className="footnote">Caveat: {proof.caveats.join(" ")}</p>
      ) : null}
      <a
        className="button secondary small full"
        href={proofHref(proof)}
        target="_blank"
        rel="noreferrer"
      >
        Open explorer
        <ArrowUpRight size={14} />
      </a>
    </article>
  );
}
