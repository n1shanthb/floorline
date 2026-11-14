import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Diamond,
  Landmark,
} from "lucide-react";
import { Link } from "react-router-dom";
import evidence from "../data/evidence.json";
import { proofHref, proofsFor } from "../lib/rc1-proofs";
import { Badge } from "./ui";
import { useRc1Manifest } from "./Rc1Evidence";
export type DemoEvent = (typeof evidence.events)[number];
export function EventIcon({ kind }: { kind: string }) {
  const Icon = kind.startsWith("dao")
    ? Landmark
    : kind === "nft_transfer"
      ? Diamond
      : kind === "redemption"
        ? ArrowDownLeft
        : kind === "loan_repayment"
          ? Check
          : ArrowUpRight;
  return (
    <span className="event-icon">
      <Icon size={19} />
    </span>
  );
}
export function ActivityPreview() {
  const { manifest } = useRc1Manifest();
  const proofs = proofsFor(manifest, "activity").slice(0, 5);
  return (
    <section>
      <div className="section-head">
        <h3>RC1 on-chain moments</h3>
        <Link className="text-link" to="/app/activity">
          View all
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="card event-list">
        {proofs.length ? (
          proofs.map((p) => (
            <a
              className="event-row"
              href={proofHref(p)}
              target="_blank"
              rel="noreferrer"
              key={p.id}
            >
              <EventIcon kind={p.method || p.step_id} />
              <span className="event-body">
                <strong>{p.title}</strong>
                <small>
                  {p.method || p.step_id} · FINAL_VERIFIED ·{" "}
                  {p.transaction_hash.slice(0, 10)}…
                </small>
              </span>
              <ArrowUpRight size={15} />
            </a>
          ))
        ) : (
          <Link className="event-row" to="/verify">
            <EventIcon kind="issuance" />
            <span className="event-body">
              <strong>Loading RC1 acceptance receipts…</strong>
              <small>Open /verify for the full 40-proof catalog</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      <Link className="text-link" to="/verify">
        Browse full RC1 proof catalog
        <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
export function ReplayLabel() {
  return <Badge tone="lime">Verified demo replay</Badge>;
}
