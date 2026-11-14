import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Diamond,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Badge,
  Brand,
  Chart,
  External,
  NftArt,
  Orb,
  Testnet,
} from "../components/ui";
import { txLink } from "../lib/config";
import { ratio, units } from "../lib/math";
import { useApp } from "../lib/app-context";
import evidence from "../data/evidence.json";
const chapters = [
  {
    number: "01",
    title: "A token with something behind it.",
    tag: "ISSUE",
    copy: "NEAR enters the treasury. FLOOR is issued only when the math preserves backing per token. At the demonstrated state, positive 1:1 issuance is blocked.",
    event: 0,
  },
  {
    number: "02",
    title: "Leave a little. Lift the backing.",
    tag: "REDEEM",
    copy: "Redeem FLOOR against liquid backing through a size-dependent curve. The 20% tax parameter retains value for remaining holders. Your exact quote is calculated before review.",
    event: 1,
  },
  {
    number: "03",
    title: "Borrow from a lender. Not the treasury.",
    tag: "BORROW",
    copy: "A lender escrows the NEAR. You lock FLOOR as collateral and receive a transferable recovery right. Treasury backing never becomes money available to lend.",
    event: 3,
  },
  {
    number: "04",
    title: "Your NFT. Your next move.",
    tag: "TRANSFER",
    copy: "The NFT carries the right to repay and recover the collateral. Transfer it, and that right moves too. Repayment or default burns the NFT; FLOOR collateral is released.",
    event: 2,
  },
  {
    number: "05",
    title: "Decisions that move real value.",
    tag: "CONTRIBUTE",
    copy: "Two signed council approvals executed a real Sputnik contribution. Backing increased without minting. The demo council was operator-controlled; independent human governance is not proven.",
    event: 6,
  },
];
export default function Landing() {
  const { openWallet } = useApp(),
    [step, setStep] = useState(0),
    [moment, setMoment] = useState(0),
    [paused, setPaused] = useState(false);
  const story = useRef<HTMLDivElement>(null),
    hero = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setStep(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-25% 0px -40% 0px", threshold: 0 },
    );
    story.current
      ?.querySelectorAll("[data-step]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const t = setInterval(() => setMoment((m) => (m + 1) % 3), 6000);
    return () => clearInterval(t);
  }, [paused]);
  const featured = [evidence.events[0], evidence.events[2], evidence.events[6]];
  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">
        Skip to content
      </a>
      <header className="landing-header">
        <Brand />
        <nav aria-label="Landing navigation">
          <a href="#mechanics">How it works</a>
          <Link to="/app/treasury">Protocol</Link>
          <Link to="/app/activity">Activity</Link>
          <a
            href="/docs/ECONOMIC_INVARIANTS.md"
            target="_blank"
            rel="noreferrer"
          >
            Docs ↗
          </a>
        </nav>
        <div className="top-actions">
          <Testnet />
          <Link className="button secondary small launch" to="/app">
            Launch app
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main id="landing-main">
        <section
          className="hero section-wrap"
          ref={hero}
          onPointerMove={(e) => {
            if (
              !matchMedia(
                "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
              ).matches
            )
              return;
            const r = e.currentTarget.getBoundingClientRect();
            hero.current?.style.setProperty(
              "--px",
              `${((e.clientX - r.left) / r.width - 0.5) * 20}px`,
            );
            hero.current?.style.setProperty(
              "--py",
              `${((e.clientY - r.top) / r.height - 0.5) * 20}px`,
            );
          }}
          onPointerLeave={() => {
            hero.current?.style.setProperty("--px", "0px");
            hero.current?.style.setProperty("--py", "0px");
          }}
        >
          <div className="hero-copy">
            <div className="eyebrow">On-chain finance, with a pulse. / 001</div>
            <h1>
              <span>Money with</span>
              <br />
              <em>mechanics.</em>
            </h1>
            <p>
              Issue. Redeem. Borrow. Own the right to recover your collateral.
              One treasury-backed token, a lot more possibilities.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/app">
                Explore Floorline
                <ArrowUpRight size={17} />
              </Link>
              <a className="button secondary" href="#mechanics">
                See how it works
                <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-micro">
              <div className="avatars" aria-hidden="true">
                <b>A</b>
                <b>B</b>
                <b>C</b>
              </div>
              <span>Built on NEAR. Verified on testnet.</span>
            </div>
          </div>
          <div className="hero-visual">
            <Orb />
          </div>
        </section>
        <div className="section-wrap hero-metrics">
          <div className="metric">
            <span className="eyebrow">Treasury backing · demo</span>
            <strong>
              {units(evidence.snapshot.ledger.L)}
              <small>NEAR</small>
            </strong>
          </div>
          <div className="metric lilac">
            <span className="eyebrow">Backing per FLOOR · demo</span>
            <strong>
              {ratio(evidence.snapshot.ledger.L, evidence.snapshot.ledger.T, 5)}
              <small>NEAR</small>
            </strong>
          </div>
          <Link className="metric lime metric-link" to="/app/treasury">
            <span className="eyebrow">Your next move</span>
            <strong>
              Make it count
              <ArrowUpRight />
            </strong>
          </Link>
        </div>
        <div
          className="section-wrap replay-ribbon"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Badge tone="lime">↗ VERIFIED DEMO REPLAY</Badge>
          <div className="ribbon-events">
            {featured.map((event, i) => (
              <a
                key={event.id}
                href={txLink(event.tx)}
                target="_blank"
                rel="noreferrer"
                className={moment === i ? "ribbon-current" : ""}
              >
                <span>◆</span>
                {event.id === "dao-vote-c"
                  ? "DAO contributed 0.10 NEAR"
                  : event.title}
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
        </div>
        <section className="mechanics section-wrap" id="mechanics" ref={story}>
          <div className="story-heading">
            <span className="eyebrow">Simple actions. Real consequences.</span>
            <h2>
              A little mechanics.
              <br />A lot of <em>possibility.</em>
            </h2>
          </div>
          <div className="story-layout">
            <div className="story-sticky">
              <div className={`story-visual scene-${step}`}>
                <div className="story-counter">
                  {chapters[step].number} / 05 <span>{chapters[step].tag}</span>
                </div>
                {step < 2 ? (
                  <>
                    <div className="story-orb">
                      <Orb />
                    </div>
                    <div className="story-equation">
                      {step === 0
                        ? "NEAR → Treasury → FLOOR"
                        : "FLOOR → Redeem → NEAR"}
                    </div>
                  </>
                ) : step === 4 ? (
                  <div className="story-dao">
                    <Landmark size={70} />
                    <div className="vote-circles">
                      <span>A</span>
                      <span>
                        <Check />
                      </span>
                      <span>
                        <Check />
                      </span>
                    </div>
                    <strong>2 approvals. Real execution.</strong>
                    <Badge tone="lime">+0.10 NEAR · verified replay</Badge>
                  </div>
                ) : (
                  <>
                    <NftArt
                      owner={step === 2 ? "Carol" : "Dave"}
                      state="Verified lifecycle replay"
                    />
                    <div className="transfer-rail">
                      <span className={step === 2 ? "selected" : ""}>
                        Carol
                      </span>
                      <ArrowRight />
                      <span className={step === 3 ? "selected" : ""}>Dave</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="story-chapters">
              {chapters.map((chapter, i) => (
                <article
                  className={`story-chapter ${step === i ? "selected" : ""}`}
                  key={chapter.number}
                  data-step={i}
                >
                  <div className="eyebrow">
                    <span>{chapter.number}</span> / {chapter.tag}
                  </div>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.copy}</p>
                  <External
                    href={txLink(evidence.events[chapter.event].tx)}
                    className="text-link"
                  >
                    Inspect historical receipt
                  </External>
                  <div className="mobile-chapter-art">
                    {i === 2 || i === 3 ? (
                      <Diamond size={38} />
                    ) : i === 4 ? (
                      <Landmark size={38} />
                    ) : (
                      <span>F</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="backing-story section-wrap">
          <div>
            <Badge>Grounded in the treasury</Badge>
            <h2>
              Backing you can
              <br />
              <em>actually inspect.</em>
            </h2>
            <p>
              No made-up APY. No price predictions. Just liquid backing, a
              transparent redemption curve, and receipts for the changes.
            </p>
            <Link to="/app/treasury" className="button ink">
              Understand your quote
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="card lilac">
            <div className="section-head">
              <span className="eyebrow">Backing / FLOOR</span>
              <Badge tone="white">Historical steps</Badge>
            </div>
            <strong className="display-number">
              {ratio(evidence.snapshot.ledger.L, evidence.snapshot.ledger.T, 5)}
              <small>NEAR</small>
            </strong>
            <Chart />
            <p className="footnote">
              Backing per FLOOR is not a guaranteed redemption price.
            </p>
          </div>
        </section>
        <section className="nft-story section-wrap">
          <div className="nft-showcase">
            <NftArt />
            <Badge tone="white">Not just a picture. A recovery right.</Badge>
          </div>
          <div>
            <span className="eyebrow">An NFT that does something / 003</span>
            <h2>
              Your loan.
              <br />
              Your NFT.
              <br />
              <em>Your move.</em>
            </h2>
            <p>
              The current NFT owner can repay the fixed debt and recover the
              locked FLOOR. The right moves with the NFT, not the original
              borrower.
            </p>
            <Link to="/app/loans" className="button secondary">
              Explore the lifecycle
              <ArrowUpRight size={16} />
            </Link>
            <p className="footnote">
              Historical demo NFT shown. Repaid/defaulted NFTs are burned.
            </p>
          </div>
        </section>
        <section className="section-wrap final-cta">
          <div>
            <Badge tone="white">Mechanics over promises</Badge>
            <h2>
              Make your next
              <br />
              move mean more.
            </h2>
          </div>
          <div>
            <Link to="/app" className="button ink">
              Enter the app
              <ArrowUpRight size={17} />
            </Link>
            <Link to="/app/activity" className="text-link">
              Follow the proof
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer section-wrap">
        <Brand />
        <p>
          <ShieldCheck size={14} />
          Testnet only. Mutable deployment. Not audited.
        </p>
        <button className="text-link" onClick={openWallet}>
          Connect a testnet wallet
          <ArrowUpRight size={15} />
        </button>
      </footer>
    </div>
  );
}
