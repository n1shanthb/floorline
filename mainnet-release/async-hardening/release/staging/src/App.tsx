import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleCheck,
  Diamond,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { AppContext, useApp } from "./lib/app-context";
import {
  snapshot as readSnapshot,
  position as readPosition,
  rpc,
  classifyOutcome,
  classifyWithdrawal,
  claimById,
} from "./lib/rpc";
import type { Position, RpcOutcome, Snapshot } from "./lib/rpc";
import { FRESH_MS, txLink } from "./lib/config";
import { exact, canonicalId } from "./lib/math";
import { validateRequest } from "./lib/actions";
import type { ActionRequest } from "./lib/wallet";
import { claimWalletPopup, receiverFor, signRequest } from "./lib/wallet";
import { verifyIntent } from "./lib/receipt";
import { recordTransaction } from "./lib/journal";
import type { TxPhase } from "./lib/transaction";
import { isExplicitWalletRejection } from "./lib/transaction";
import { Brand, External, Modal, Row, Testnet } from "./components/ui";
import { ReleaseStatus } from "./components/ReleaseStatus";
import Landing from "./pages/Landing";
import Overview from "./pages/Overview";
const Treasury = lazy(() => import("./pages/Treasury"));
const Loans = lazy(() => import("./pages/Loans"));
const Governance = lazy(() => import("./pages/Governance"));
const Activity = lazy(() => import("./pages/Activity"));
interface Pending {
  request: ActionRequest;
  signer: string;
  hash?: string;
  createdAt: number;
}
function initialTracked() {
  try {
    const v = JSON.parse(localStorage.getItem("floorline-rc1:tracked") || "{}");
    return {
      loans: [
        ...new Set([
          ...(Array.isArray(v.loans)
            ? v.loans.filter(
                (s: unknown) => typeof s === "string" && canonicalId(s),
              )
            : []),
        ]),
      ] as string[],
      claims: [
        ...new Set([
          ...(Array.isArray(v.claims)
            ? v.claims.filter(
                (s: unknown) => typeof s === "string" && canonicalId(s),
              )
            : []),
        ]),
      ] as string[],
    };
  } catch {
    return { loans: [], claims: [] };
  }
}
export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [account, setAccount] = useState(""),
    [position, setPosition] = useState<Position | null>(null),
    [walletError, setWalletError] = useState(""),
    [walletOpen, setWalletOpen] = useState(false),
    [walletBusy, setWalletBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [tracked, setTracked] = useState(initialTracked);
  const [action, setAction] = useState<ActionRequest | null>(null),
    [phase, setPhase] = useState<TxPhase>("idle"),
    [txError, setTxError] = useState(""),
    [hash, setHash] = useState(""),
    [txOpen, setTxOpen] = useState(false),
    [reviewBlock, setReviewBlock] = useState(0);
  const signing = useRef(false),
    refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      setSnap(await readSnapshot());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "RPC read failed");
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 45_000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    let live = true;
    let unsubscribe: (() => void) | undefined;
    // Load wallet code only after an explicit wallet action or for a returning wallet session.
    try {
      if (walletOpen) localStorage.setItem("floorline-rc1:wallet-used", "true");
      if (
        !walletOpen &&
        localStorage.getItem("floorline-rc1:wallet-used") !== "true"
      )
        return;
    } catch {
      if (!walletOpen) return;
    }
    void import("./lib/wallet")
      .then(async ({ getSelector }) => {
        const s = await getSelector();
        if (!live) return;
        const update = () =>
          setAccount(
            s.store.getState().accounts.find((a) => a.active)?.accountId || "",
          );
        update();
        const subscription = s.store.observable.subscribe(update);
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch((e) => {
        if (live)
          setWalletError(
            e instanceof Error ? e.message : "Wallet initialization failed",
          );
      });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [walletOpen]);
  useEffect(() => {
    let live = true;
    if (account)
      void readPosition(account)
        .then((p) => {
          if (live) {
            setPosition(p);
            setWalletError("");
          }
        })
        .catch((e) => {
          if (live) {
            setPosition(null);
            setWalletError(
              e instanceof Error ? e.message : "Wallet read failed",
            );
          }
        });
    else setPosition(null);
    return () => {
      live = false;
    };
  }, [account, snap]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const trackId = useCallback((kind: "loans" | "claims", id: string) => {
    if (!canonicalId(id)) return;
    setTracked((previous) => {
      const next = {
        ...previous,
        [kind]: [...new Set([...previous[kind], id])],
      };
      try {
        localStorage.setItem("floorline-rc1:tracked", JSON.stringify(next));
      } catch {
        /* Keep this session's confirmed IDs even when browser storage is full. */
      }
      return next;
    });
  }, []);
  const reconcile = useCallback(
    async (pending: Pending) => {
      if (!pending.hash) {
        setPhase("unknown");
        setTxError(
          "Wallet returned no transaction hash. Do not resubmit blindly. Check your wallet activity and paste the hash below.",
        );
        return;
      }
      setHash(pending.hash);
      setAction(pending.request);
      setTxOpen(true);
      setPhase("submitted");
      try {
        const result = await rpc<RpcOutcome>("tx", {
          tx_hash: pending.hash,
          sender_account_id: pending.signer,
          wait_until: "FINAL",
        });
        verifyIntent(result, pending);
        let status = classifyOutcome(result);
        if (
          status !== "failed" &&
          pending.request.method === "withdraw_claim"
        ) {
          const c = await claimById(String(pending.request.args.claim_id));
          status = classifyWithdrawal(result, c);
        }
        recordTransaction(
          pending.hash,
          pending.signer,
          pending.request,
          status,
        );
        if (status === "failed") {
          setPhase("failed");
          sessionStorage.removeItem("floorline-rc1:pending");
          setTxError(
            "The transaction failed on chain or its native payout is recorded as a known failure. Inspect its receipts before trying again; restoration is a separate guarded action.",
          );
        } else if (status === "unknown") {
          setPhase("unknown");
          setTxError(
            "A final result or callback is unresolved. Do not resubmit or assume a payout succeeded. Inspect the receipts and recheck status.",
          );
        } else {
          setPhase("confirmed");
          setTxError("");
          sessionStorage.removeItem("floorline-rc1:pending");
          const raw = (result.status as { SuccessValue?: string }).SuccessValue;
          if (
            raw &&
            [
              "fund_offer",
              "redeem",
              "accept_offer",
              "repay",
              "cancel_offer",
            ].includes(pending.request.method)
          ) {
            try {
              const id = JSON.parse(atob(raw));
              if (typeof id === "string") {
                trackId(
                  pending.request.method === "fund_offer" ? "loans" : "claims",
                  id,
                );
                if (pending.request.method === "fund_offer")
                  localStorage.setItem(
                    `floorline-rc1:offer-proof:${id}`,
                    JSON.stringify({
                      hash: pending.hash,
                      durationNs: String(pending.request.args.duration_ns),
                    }),
                  );
              }
            } catch {
              /* Methods returning no scalar need no ID tracking. */
            }
          }
        }
        await refresh();
      } catch (e) {
        setPhase("unknown");
        setTxError(
          e instanceof Error
            ? e.message
            : "Confirmation unavailable. Keep the hash and check later.",
        );
      }
    },
    [refresh, trackId],
  );
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("floorline-rc1:pending");
      if (!saved) return;
      const pending = JSON.parse(saved) as Pending;
      const params = new URLSearchParams(location.search);
      const returned = params.get("transactionHashes")?.split(",")[0];
      if (!returned && !pending.hash && params.get("errorCode")) {
        setAction(pending.request);
        setPhase("unknown");
        setTxError(
          "The wallet callback reported an error without a verifiable hash. Inspect wallet activity before resubmitting; URL parameters alone do not prove cancellation.",
        );
        setTxOpen(true);
      } else if (returned || pending.hash) {
        pending.hash = returned || pending.hash;
        sessionStorage.setItem("floorline-rc1:pending", JSON.stringify(pending));
        void reconcile(pending);
      } else {
        setAction(pending.request);
        setPhase("unknown");
        setTxOpen(true);
        setTxError(
          "An earlier wallet request has no known hash. Check wallet activity before submitting again.",
        );
      }
    } catch {
      /* Malformed local intent is never signed or submitted. */
    }
  }, [reconcile]);
  const review = async (r: ActionRequest) => {
    if (!account) {
      setWalletOpen(true);
      return;
    }
    if (signing.current) return;
    let unresolved: string | null;
    try {
      unresolved = sessionStorage.getItem("floorline-rc1:pending");
    } catch {
      setTxOpen(true);
      setPhase("rejected");
      setTxError(
        "Session storage is unavailable. Enable it before requesting a wallet transaction so pending intents can be recovered safely.",
      );
      return;
    }
    if (unresolved) {
      setTxOpen(true);
      setPhase("unknown");
      setTxError(
        "An earlier wallet request is unresolved. Reconcile it before starting another transaction.",
      );
      return;
    }
    setAction(r);
    setTxOpen(true);
    setPhase("validating");
    setTxError("");
    setHash("");
    try {
      const fresh = await validateRequest(r, account);
      setSnap(fresh);
      setReviewBlock(fresh.blockHeight);
      setPhase("review");
    } catch (e) {
      setPhase("rejected");
      setTxError(e instanceof Error ? e.message : "Validation failed");
    }
  };
  const sign = async () => {
    if (!action || phase !== "review" || !account || signing.current) return;
    const walletWindow = claimWalletPopup();
    if (!walletWindow) {
      setPhase("rejected");
      setTxError(
        "The browser blocked Meteor's wallet window. Allow popups for this local staging page, then review again.",
      );
      return;
    }
    signing.current = true;
    setPhase("validating");
    try {
      await validateRequest(action, account);
      setPhase("awaiting wallet");
      const pending: Pending = {
        request: action,
        signer: account,
        createdAt: Date.now(),
      };
      sessionStorage.setItem("floorline-rc1:pending", JSON.stringify(pending));
      const out = await signRequest(action, account, walletWindow);
      const txHash = out?.transaction?.hash;
      if (txHash) {
        pending.hash = txHash;
        sessionStorage.setItem("floorline-rc1:pending", JSON.stringify(pending));
        await reconcile(pending);
      } else {
        setPhase("unknown");
        setTxError(
          "Wallet returned without a known transaction hash. Check wallet activity before retrying.",
        );
      }
    } catch (e) {
      if (!sessionStorage.getItem("floorline-rc1:pending")) walletWindow.close();
      const message =
        e instanceof Error ? e.message : "Wallet response unavailable";
      if (isExplicitWalletRejection(e)) {
        setPhase("rejected");
        sessionStorage.removeItem("floorline-rc1:pending");
      } else
        setPhase(
          sessionStorage.getItem("floorline-rc1:pending") ? "unknown" : "rejected",
        );
      setTxError(message);
    } finally {
      signing.current = false;
    }
  };
  const recheck = () => {
    try {
      const pending = JSON.parse(
        sessionStorage.getItem("floorline-rc1:pending") || "null",
      ) as Pending | null;
      if (pending) {
        if (hash) pending.hash = hash;
        sessionStorage.setItem("floorline-rc1:pending", JSON.stringify(pending));
        void reconcile(pending);
      } else
        setTxError(
          "No pending request is stored in this browser. Use the public explorer to inspect the hash.",
        );
    } catch {
      setTxError(
        "Cannot read pending intent. Inspect wallet transaction history.",
      );
    }
  };
  return (
    <AppContext.Provider
      value={{
        snapshot: snap,
        error,
        loading,
        account,
        position,
        walletError,
        refresh,
        openWallet: () => setWalletOpen(true),
        review: (r) => void review(r),
        notify: setNotice,
        trackId,
        tracked,
      }}
    >
      <BrowserRouter>
        <ScrollReset />
        <Suspense
          fallback={
            <div className="route-loading">
              <LoaderCircle className="spin" />
              Loading Floorline…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Shell />}>
              <Route index element={<Overview />} />
              <Route path="treasury" element={<Treasury />} />
              <Route path="loans" element={<Loans />} />
              <Route path="governance" element={<Governance />} />
              <Route path="activity" element={<Activity />} />
            </Route>
            <Route
              path="*"
              element={
                <div className="not-found">
                  <Brand />
                  <h1>That path took a detour.</h1>
                  <Link className="button primary" to="/app">
                    Back to the app
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
        <Modal
          open={walletOpen}
          onClose={() => setWalletOpen(false)}
          title={account ? "Your testnet wallet" : "Connect your wallet"}
          description="Your wallet stays in control. Floorline never asks for a seed phrase or private key."
        >
          {account ? (
            <>
              <p className="account-full">{account}</p>
              <p>
                Network: NEAR testnet. Every transaction requires review and
                approval in your wallet.
              </p>
              <button
                className="button secondary full"
                disabled={walletBusy}
                onClick={() => {
                  setWalletBusy(true);
                  void import("./lib/wallet")
                    .then((m) => m.disconnectWallet())
                    .then(() => {
                      setAccount("");
                      setWalletOpen(false);
                    })
                    .catch((e) => setWalletError(String(e)))
                    .finally(() => setWalletBusy(false));
                }}
              >
                Disconnect wallet
              </button>
            </>
          ) : (
            <>
              <div className="wallet-choice">
                <span className="wallet-logo">N</span>
                <div>
                  <strong>Meteor Wallet</strong>
                  <small>NEAR testnet · opens your wallet</small>
                </div>
              </div>
              <button
                className="button primary full"
                disabled={walletBusy}
                onClick={() => {
                  setWalletBusy(true);
                  setWalletError("");
                  void import("./lib/wallet")
                    .then((m) => m.connectWallet())
                    .then(() => setWalletOpen(false))
                    .catch((e) =>
                      setWalletError(
                        e instanceof Error
                          ? e.message
                          : "Wallet connection failed",
                      ),
                    )
                    .finally(() => setWalletBusy(false));
                }}
              >
                {walletBusy ? "Opening wallet…" : "Connect Meteor Wallet"}
                <ArrowUpRight size={16} />
              </button>
            </>
          )}
          {walletError && (
            <p className="notice" role="alert">
              {walletError}
            </p>
          )}
          <p className="footnote">
            Test tokens only. No function-call access key is requested by this
            app. Wallet login and signing happen on wallet.meteorwallet.app (testnet).
          </p>
        </Modal>
        <Modal
          open={txOpen}
          onClose={() => {
            if (!signing.current) setTxOpen(false);
          }}
          title={action?.title || "Transaction status"}
          description={`NEAR testnet · ${phase}`}
        >
          {action && (
            <>
              <Row label="Contract">
                <span className="break">{receiverFor(action)}</span>
              </Row>
              <Row label="Signer">
                <span className="break">
                  {account || "Stored wallet intent"}
                </span>
              </Row>
              <Row label="Method">{action.method}</Row>
              <Row label="Attached NEAR">{exact(action.deposit)} NEAR</Row>
              <Row label="Gas budget">
                {BigInt(action.gas) / 10n ** 12n} Tgas
              </Row>
              <p className="footnote">
                Gas is a budget, not a fee quote. Wallet gas reservation may
                exceed the final fee.
              </p>
              <details className="raw">
                <summary>Exact base-unit arguments</summary>
                <pre>{JSON.stringify(action.args, null, 2)}</pre>
                <p>Deposit: {action.deposit} yoctoNEAR</p>
              </details>
              <ul className="review-terms">
                {action.details.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {action.warning && <p className="notice">{action.warning}</p>}
            </>
          )}
          {phase === "review" && (
            <>
              <p className="footnote">
                Validated at block {reviewBlock.toLocaleString()}. State will be
                checked again before opening your wallet.
              </p>
              <button
                className="button primary full"
                onClick={() => void sign()}
              >
                Approve in wallet
                <ArrowUpRight size={16} />
              </button>
            </>
          )}
          {["validating", "awaiting wallet", "submitted"].includes(phase) && (
            <div className="tx-progress" role="status">
              <LoaderCircle className="spin" />{" "}
              {phase === "validating"
                ? "Checking current chain state…"
                : phase === "awaiting wallet"
                  ? "Waiting for explicit wallet approval…"
                  : "Checking final receipts…"}
            </div>
          )}
          {phase === "confirmed" && (
            <div className="confirmation" role="status">
              <CircleCheck />
              Confirmed on testnet. Final receipt checks passed.
            </div>
          )}
          {txError && (
            <p className="notice" role="alert">
              {txError}
            </p>
          )}
          {phase === "unknown" && (
            <>
              <label className="field-label" htmlFor="recovery-hash">
                Transaction hash from your wallet
              </label>
              <input
                id="recovery-hash"
                value={hash}
                onChange={(e) => setHash(e.target.value.trim())}
                placeholder="Paste the transaction hash"
              />
              <button className="button secondary full" onClick={recheck}>
                Recheck status · never resubmits
              </button>
              <p className="footnote">
                Unknown callbacks cannot be retried safely. Keep this intent
                until its outcome is established. No automatic recovery or
                resubmission is implemented.
              </p>
            </>
          )}
          {hash && (
            <External href={txLink(hash)} className="button secondary full">
              Inspect transaction
            </External>
          )}
        </Modal>
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </BrowserRouter>
    </AppContext.Provider>
  );
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
const nav = [
  { path: "/app", label: "Overview", short: "Home", icon: LayoutDashboard },
  {
    path: "/app/treasury",
    label: "Treasury",
    short: "Treasury",
    icon: Diamond,
  },
  { path: "/app/loans", label: "Loans & NFTs", short: "Loans", icon: Wallet },
  {
    path: "/app/governance",
    label: "Governance",
    short: "DAO",
    icon: Landmark,
  },
  {
    path: "/app/activity",
    label: "Activity & Proof",
    short: "Proof",
    icon: ChartNoAxesCombined,
  },
];
function Shell() {
  const a = useApp(),
    location = useLocation(),
    current = nav.find((n) => n.path === location.pathname) || nav[0];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <NavLink end={n.path === "/app"} key={n.path} to={n.path}>
              <n.icon size={19} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <BadgeLabel />
          <p>
            A little mechanics.
            <br />A lot of possibility.
          </p>
          <External href="/docs/ECONOMIC_INVARIANTS.md" className="text-link">
            Read the mechanics
          </External>
          <span className="footnote">
            Testnet · mutable deployment
            <br />
            No independent governance claim
          </span>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-top">
          <div className="crumb">
            <span>App</span>
            <span>/</span>
            <b>{current.label}</b>
          </div>
          <div className="top-actions">
            <Testnet />
            <button
              className="button secondary wallet-button"
              aria-label={
                a.account ? "Open connected wallet" : "Connect wallet"
              }
              onClick={a.openWallet}
            >
              <Wallet size={15} />
              <span>
                {a.account ? shortAccount(a.account) : "Connect wallet"}
              </span>
            </button>
          </div>
        </header>
        <main id="main">
          <div className="freshness">
            <span>
              <i className={`dot ${a.error ? "amber" : ""}`} />
              {a.snapshot
                ? `RPC snapshot · block ${a.snapshot.blockHeight.toLocaleString()} · ${new Date(a.snapshot.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Reading NEAR testnet…"}
            </span>
            <button
              className="text-link"
              onClick={() => void a.refresh()}
              disabled={a.loading}
            >
              <RefreshCw size={12} className={a.loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
          {a.error && (
            <div className="notice" role="alert">
              {a.error}{" "}
              {a.snapshot
                ? "Last successful read remains displayed; writes require a fresh verified snapshot."
                : "Live data is unavailable. Historical replay remains separately labeled."}
            </div>
          )}
          {a.snapshot && Date.now() - a.snapshot.readAt > FRESH_MS && (
            <div className="notice">
              This read is stale. Refresh before reviewing any transaction.
            </div>
          )}
          <ReleaseStatus />
          <Outlet />
        </main>
        <footer className="app-footer">
          <ShieldCheck size={14} />
          <span>Testnet, with receipts. No market-price guarantee.</span>
          <Link to="/app/activity">
            View proof
            <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map((n) => (
          <NavLink end={n.path === "/app"} to={n.path} key={n.path}>
            <n.icon size={20} />
            <span>{n.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function BadgeLabel() {
  return (
    <span className="badge lime">
      <i className="dot" />
      TESTNET ONLY
    </span>
  );
}
function shortAccount(id: string) {
  return id.length > 22 ? id.slice(0, 10) + "…" + id.slice(-8) : id;
}
