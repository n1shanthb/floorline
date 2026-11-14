import { Link } from "react-router-dom";
import {
  ACCEPTANCE,
  CODE_HASH,
  CONTRACT,
  SOURCE,
  accountLink,
  txLink,
} from "../lib/config";
import { Badge, Brand, External, Heading, Testnet } from "../components/ui";

export default function Judges() {
  return (
    <div className="judge-page">
      <header className="judge-header">
        <Brand />
        <nav aria-label="Judge navigation">
          <Link to="/">Home</Link>
          <Link to="/verify">Proof & verify</Link>
          <Link to="/app">App</Link>
          <Testnet />
        </nav>
      </header>

      <Heading
        title="Judge quickstart"
        description="Secret-free, wallet-free verification for human and AI judges. No testnet or mainnet writes."
      />

      <section className="card stack-gap">
        <Badge tone="lime">60-second path</Badge>
        <ol className="judge-steps">
          <li>
            Open <Link to="/verify">/verify</Link> and confirm RC1{" "}
            <strong>{ACCEPTANCE.verifiedRows}/40</strong> with{" "}
            <Badge>NEW RISK STOPPED</Badge> when live RPC is available.
          </li>
          <li>
            Open the contract on explorer:{" "}
            <External href={accountLink(CONTRACT)}>{CONTRACT}</External>
          </li>
          <li>
            Inspect three proofs:{" "}
            <External href={txLink(ACCEPTANCE.withdrawStorageTx)}>
              storage withdraw
            </External>
            ,{" "}
            <External href={txLink(ACCEPTANCE.stopTx)}>risk stop</External>,{" "}
            <External href={txLink(ACCEPTANCE.unregisterTx)}>
              post-stop unregister
            </External>
            .
          </li>
          <li>
            Expected code hash: <code>{CODE_HASH}</code>
          </li>
        </ol>
      </section>

      <section className="card stack-gap">
        <Badge tone="violet">Full path · 5–10 minutes</Badge>
        <div className="judge-cmd-list">
          <div className="judge-cmd">
            <span className="eyebrow">Clone</span>
            <code>git clone https://github.com/n1shanthb/floorline.git && cd floorline</code>
          </div>
          <div className="judge-cmd">
            <span className="eyebrow">Install</span>
            <code>cd frontend && npm ci</code>
          </div>
          <div className="judge-cmd">
            <span className="eyebrow">Verify (offline + optional live)</span>
            <code>npm run judge:verify</code>
          </div>
          <div className="judge-cmd">
            <span className="eyebrow">Live read-only only</span>
            <code>npm run judge:verify -- --live</code>
          </div>
          <div className="judge-cmd">
            <span className="eyebrow">Offline only</span>
            <code>npm run judge:verify -- --offline</code>
          </div>
          <div className="judge-cmd">
            <span className="eyebrow">Expected</span>
            <p>
              Typecheck, unit tests, build, evidence validation PASS; live RPC
              checks PASS or UNAVAILABLE (never silent FAIL-as-PASS). Exit code 0
              only when required offline checks pass.
            </p>
          </div>
        </div>
        <p className="muted">
          Never create accounts, transfer funds, deploy WASM, call change
          methods, or open wallet signing dialogs.
        </p>
      </section>

      <section className="card stack-gap">
        <h2>AI judge prompts</h2>
        <p>
          Paste-ready prompts for Claude Code and Codex. They require the agent
          to execute commands and fill actual results — not invent PASS.
        </p>
        <div className="button-row">
          <External
            href={`${SOURCE}/blob/codex/mainnet-readiness/docs/judges/CLAUDE_CODE_PROMPT.md`}
          >
            Claude Code prompt
          </External>
          <External
            href={`${SOURCE}/blob/codex/mainnet-readiness/docs/judges/CODEX_PROMPT.md`}
          >
            Codex prompt
          </External>
          <External
            href={`${SOURCE}/blob/codex/mainnet-readiness/docs/judges/JUDGE_RUNBOOK.md`}
          >
            Common runbook
          </External>
          <a className="button ghost" href="/evidence/proofs.json" download>
            Evidence manifest
          </a>
        </div>
      </section>

      <section className="card stack-gap">
        <h2>What Floorline claims — and does not</h2>
        <ul>
          <li>
            <strong>Claims:</strong> public-testnet RC1 acceptance 40/40 with
            finalized root + descendant receipts; irreversible new-risk stop;
            post-stop funded exit still works.
          </li>
          <li>
            <strong>Does not claim:</strong> Floorline financial contract on
            mainnet; independent audit; guaranteed market price or fixed
            executable redemption floor; that L/T equals payout price.
          </li>
          <li>
            <strong>Separate submission:</strong> NEAR Intent One is another
            solo-author project with its own mainnet evidence — not Floorline
            transactions.
          </li>
        </ul>
      </section>
    </div>
  );
}
