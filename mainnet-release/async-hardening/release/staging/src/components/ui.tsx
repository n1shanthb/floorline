import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Check, Copy, Diamond, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useId, type ReactNode } from "react";
import { useApp } from "../lib/app-context";
import { ratio } from "../lib/math";
import evidence from "../data/evidence.json";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Floorline home">
      <span className="brandmark">✦</span>floorline
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function Badge({
  children,
  tone = "violet",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Testnet() {
  return (
    <Badge>
      <i className="dot" /> NEAR TESTNET
    </Badge>
  );
}
export function External({
  href,
  children,
  className = "button secondary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={15} />
      <span className="sr-only"> (opens a new tab)</span>
    </a>
  );
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const { notify } = useApp();
  return (
    <button
      className="button secondary small"
      onClick={() =>
        void navigator.clipboard
          .writeText(value)
          .then(() => notify("Copied to clipboard"))
          .catch(() =>
            notify(
              "Clipboard unavailable. Select and copy the displayed text.",
            ),
          )
      }
    >
      <Copy size={14} />
      {label}
    </button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Close className="icon-button close" aria-label="Close dialog">
            <X size={20} />
          </Dialog.Close>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Heading({
  title,
  description,
  kicker,
}: {
  title: string;
  description: string;
  kicker?: string;
}) {
  return (
    <div className="page-heading">
      {kicker && <div className="eyebrow">{kicker}</div>}
      <h1>
        {title}
        <span>.</span>
      </h1>
      <p>{description}</p>
    </div>
  );
}
export function Tabs<T extends string>({
  values,
  value,
  onChange,
  label,
}: {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          className={v === value ? "active" : ""}
          onClick={() => onChange(v)}
          aria-pressed={v === value}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Diamond size={24} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}
export function Chart() {
  const id = useId().replace(/:/g, "");
  const points = evidence.history;
  const scaled = points.map((p) => (BigInt(p.L) * 10n ** 18n) / BigInt(p.T));
  const min = scaled[0],
    range = scaled[2] - min;
  const ys = scaled.map(
    (n) => 160 - Number(((n - min) * 120n) / (range || 1n)),
  );
  const path = `M 12 ${ys[0]} H 190 V ${ys[1]} H 400 V ${ys[2]} H 580`;
  return (
    <div className="backing-chart">
      <svg
        viewBox="0 0 592 200"
        role="img"
        aria-label={`Historical backing per FLOOR: ${points.map((p) => `${p.label} ${ratio(p.L, p.T)}`).join(", ")}.`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--violet)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 100, 160].map((y) => (
          <path key={y} d={`M0 ${y}H592`} className="chart-grid" />
        ))}
        <path d={`${path} V 200 H 12 Z`} fill={`url(#${id})`} />
        <path d={path} className="chart-line" />
        {[12, 190, 400].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={ys[i]}
            r="5"
            fill="var(--violet)"
            stroke="white"
            strokeWidth="3"
          />
        ))}
      </svg>
      <div className="chart-labels">
        {points.map((p) => (
          <span key={p.label}>
            {p.label}
            <b>{ratio(p.L, p.T, 5)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
export function ChartCard() {
  return (
    <section className="card chart-card">
      <div className="section-head">
        <h3>Backing history</h3>
        <Badge>Verified replay</Badge>
      </div>
      <Chart />
      <p className="footnote">
        Three recorded state transitions. Not a market price chart or live
        history.
      </p>
    </section>
  );
}
export function Orb() {
  return (
    <div className="treasury-art" aria-hidden="true">
      <div className="art-glow" />
      <div className="art-ring" />
      <div className="art-core">F</div>
      <div className="art-chip chip-one">
        <span>✦</span>
        <div>
          Backing
          <small>{evidence.history.at(-1)?.L && "2.019 NEAR"} · demo</small>
        </div>
      </div>
      <div className="art-chip chip-two">
        <span>↗</span>
        <div>
          Backing / FLOOR
          <small>
            {ratio(evidence.snapshot.ledger.L, evidence.snapshot.ledger.T, 5)}{" "}
            NEAR · demo
          </small>
        </div>
      </div>
    </div>
  );
}
export function NftArt({
  mini = false,
  owner = "Dave",
  state = "Historical right · NFT burned",
}: {
  mini?: boolean;
  owner?: string;
  state?: string;
}) {
  return (
    <div className={`nft-art ${mini ? "mini" : ""}`}>
      <div className="nft-card">
        <div className="nft-serial">FLOORLINE / LOAN 002</div>
        <Diamond className="nft-diamond" strokeWidth={1.6} />
        <div className="nft-card-bottom">
          <strong>
            THE RIGHT
            <br />
            TO RECOVER.
          </strong>
          <small>
            {owner} · {state}
          </small>
        </div>
      </div>
    </div>
  );
}
export function SuccessMark() {
  return (
    <span className="success-mark">
      <Check size={18} />
    </span>
  );
}
