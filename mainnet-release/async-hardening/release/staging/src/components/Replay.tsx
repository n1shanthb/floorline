import { useEffect, useState } from "react";
import { ArrowRight, Check, Play, RotateCcw } from "lucide-react";
import { Badge, External, NftArt } from "./ui";
import evidence from "../data/evidence.json";
import { txLink } from "../lib/config";
export default function Replay({ kind = "loan" }: { kind?: "loan" | "dao" }) {
  const [step, setStep] = useState(-1),
    [running, setRunning] = useState(false);
  const steps =
    kind === "loan"
      ? [
          "Lender funds",
          "Carol borrows",
          "NFT → Dave",
          "Dave repays",
          "NFT burned",
        ]
      : [
          "A proposes",
          "B approves · pending",
          "C approves · 2 of 3",
          "0.10 NEAR executed",
        ];
  useEffect(() => {
    if (!running) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(steps.length - 1);
      setRunning(false);
      return;
    }
    const timer = setInterval(
      () =>
        setStep((s) => {
          if (s >= steps.length - 1) {
            setRunning(false);
            return s;
          }
          return s + 1;
        }),
      kind === "loan" ? 700 : 450,
    );
    return () => clearInterval(timer);
  }, [running, kind, steps.length]);
  return (
    <section
      className={`card replay-card ${kind === "dao" ? "dao-replay" : ""}`}
    >
      <div className="section-head">
        <h3>
          {kind === "loan" ? "The loan lifecycle" : "The governance moment"}
        </h3>
        <Badge tone="lime">Verified historical replay</Badge>
      </div>
      {kind === "loan" && (
        <div className={`replay-stage step-${step}`}>
          <span
            className={step >= 1 ? "replay-person active" : "replay-person"}
          >
            C<small>Carol</small>
          </span>
          <div className="replay-nft">
            <NftArt mini state={step >= 4 ? "Burned" : "Recovery right"} />
          </div>
          <ArrowRight className="transfer-arrow" />
          <span
            className={step >= 2 ? "replay-person active" : "replay-person"}
          >
            D<small>Dave</small>
          </span>
        </div>
      )}
      <ol className="lifecycle-steps">
        {steps.map((s, i) => (
          <li className={step >= i ? "done" : ""} key={s}>
            <span>{step >= i ? <Check size={15} /> : i + 1}</span>
            <b>{s}</b>
          </li>
        ))}
      </ol>
      <div className="replay-bottom">
        <button
          className="button secondary small"
          disabled={running}
          onClick={() => {
            setStep(-1);
            setRunning(true);
          }}
        >
          {step >= 0 ? <RotateCcw size={14} /> : <Play size={14} />}{" "}
          {running
            ? "Replaying…"
            : step >= 0
              ? "Replay again"
              : "Play verified replay"}
        </button>
        <External
          className="text-link"
          href={txLink(evidence.events[kind === "loan" ? 2 : 6].tx)}
        >
          Inspect real receipt
        </External>
      </div>
      <p className="footnote" aria-live="polite">
        {step < 0
          ? "Historical explanation only. This animation never sends a transaction."
          : `Replay ${step + 1}/${steps.length}: ${steps[Math.min(step, steps.length - 1)]}. Historical, not a live action.`}
      </p>
    </section>
  );
}
