import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Diamond,
  Landmark,
} from "lucide-react";
import { Link } from "react-router-dom";
import evidence from "../data/evidence.json";
import { Badge } from "./ui";
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
  const events = [evidence.events[0], evidence.events[2], evidence.events[6]];
  return (
    <section>
      <div className="section-head">
        <h3>On-chain moments</h3>
        <Link className="text-link" to="/app/activity">
          View all
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="card event-list">
        {events.map((e) => (
          <Link
            className="event-row"
            to={`/app/activity?event=${e.id}`}
            key={e.id}
          >
            <EventIcon kind={e.kind} />
            <span className="event-body">
              <strong>
                {e.id === "dao-vote-c" ? "DAO contributed 0.10 NEAR" : e.title}
              </strong>
              <small>Verified historical testnet evidence</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
export function ReplayLabel() {
  return <Badge tone="lime">Verified demo replay</Badge>;
}
