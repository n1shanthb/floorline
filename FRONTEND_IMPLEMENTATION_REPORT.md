# Floorline frontend implementation report

November 11, 2026. The six-route frontend is implemented under `E:\near-2\frontend` using the supplied Soft Electric design direction. Typecheck, lint, unit tests, browser scenarios and production build pass. This is a local, testnet-only frontend, not a production-funds release or hosted deployment.

No smart contract, WASM, DAO policy or original `TESTNET_EVIDENCE.json` was modified. No Rust recompilation, deployment, account creation, private-key access or public-chain transaction submission occurred during this frontend task. Historical DAO governance remains **operator-controlled simulated council**; independent human governance is not proven.

## Audit and architecture

Read the complete master prompt, pack README, UX specification, tokens, verified events, reference links, static HTML and all eleven reference PNGs before implementation. Read the actual Rust public methods, accounting rules, standards notes and Gate 3 evidence. The repository contained no frontend, so React + TypeScript + Vite was selected. The phase plan is in `FRONTEND_PLAN.md`.

The implementation uses reusable React components, centralized CSS tokens, original CSS/SVG artwork, Lucide icons, Radix dialogs with focus management, locally served Inter/Space Grotesk fonts and NEAR Wallet Selector v10. The five required primary colors are retained. Custom CSS provides the responsive design rather than adding a second styling framework. Screenshot PNGs are never rendered as application pages.

All seven supplied event hashes match finalized, independently indexed repository evidence. The design pack's first/second demo loan numbering is translated to actual contract IDs **2 and 7**. The immutable 1:1 issuance configuration is taken from the approved deployment evidence and gated by the deployed code hash. The pack's older statement about stale current evidence predates the completed consistency cleanup; `post_dao_final_state` remains the historical reference snapshot.

## Completed pages and buttons

- `/` Landing: responsive navigation, launch/app CTAs, mechanism anchors, receipt links, demo replay ribbon with hover/focus pause, floating CSS treasury orb, capped desktop pointer parallax, five-chapter sticky desktop scene, sequential mobile chapters, historical backing chart, NFT illustration and final CTA. Footer wallet button opens the real connection dialog.
- `/app` Overview: real RPC backing/supply/ratio, read time and block, manual/45-second refresh, reserve check, connected available FLOOR, tracked native claims/unresolved payouts and actual tracked NFT ownership. Position totals explicitly state that discovery is partial. Quick actions navigate to the appropriate form/tab. The chart is explicitly historical even beside current RPC metrics.
- `/app/treasury` Treasury: working Issue/Redeem/Claims tabs, decimal validation, Max, exact quote and minimum output, storage registration/top-up review, transaction review, wallet approval, final receipt reconciliation, claim lookup, withdrawal and known-failure restoration. Positive 1:1 issuance is blocked at the verified state. Storage and solvency accounting can be expanded without a transaction.
- `/app/loans` Loans & NFTs: Explore offers/My loans/My NFTs/Lender dashboard filters, explicit ID lookup, lender offer form, borrowing, cancellation, NFT transfer acknowledgement, current-owner exact repayment and permissionless expired-loan settlement. Only applicable actions appear. The closed demo loans are not advertised as open offers. The lender dashboard includes native claims. The lifecycle replay never sends transactions.
- `/app/governance` Governance: actual DAO policy/proposal/code reads, full policy comparison with the verified instance, actual council account and execution links, historical backing impact and vote replay. Disclosure is visible. Governance actions are deliberately **read-only**; there is no simulated live vote button.
- `/app/activity` Activity & Proof: working category filters, selected event detail, copy hash, indexed JSON and explorer links, raw receipt outcomes/logs, exact parent-deposit versus nested contribution distinction, RPC final-receipt recheck and downloadable public evidence. It is a curated historical feed, not a live indexer.

All visible interactive controls navigate, scroll, validate, filter, copy, inspect, review or perform a supported user-approved wallet action. Invalid/unsupported actions have an explanation or are omitted. Wallet disconnect is implemented through the SDK.

## Contract integration map

Floorline: `floor.floorline-g3-20261111-6702ea.testnet`.

Approved deployed hash: `6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9`.

DAO: `floorline-g3-20261111-6702ea.sputnikv2.testnet`.

Public RPC defaults to `https://test.rpc.fastnear.com`. Snapshot reads check chain ID `testnet`, use a finalized block for accounting/account consistency and reject a changed Floorline code hash. Public RPC is configurable; contract and DAO identities are fixed.

Read adapters use `accounting`, `ft_balance_of`, `storage_balance_of`, `storage_balance_bounds`, `quote`, `get_loan`, `get_claim` and `nft_token`, plus native account, finalized block and transaction queries. DAO reads use `get_policy` and `get_proposal({id:0})`. Metadata/24 decimals were additionally verified by the live read-only smoke check.

Implemented write requests, always to the fixed Floorline contract:

- `storage_deposit({account_id:null, registration_only:false})`: 0.05 NEAR attached, 30 Tgas. This is an explicit self registration/top-up; it does not mint or increase backing.
- `issue({min_tokens})`: user-entered NEAR attached, 30 Tgas; exact minted amount and `d*T >= L*minted` rechecked. No attempt is made to bypass blocked issuance.
- `redeem({amount,min_out})`: zero attached deposit, 30 Tgas; burns FLOOR and creates a native claim, not an immediate payout.
- `fund_offer({repayment,collateral,duration_ns})`: lender principal attached, 30 Tgas; fixed debt/collateral and positive U64 term validated.
- `accept_offer({loan_id})`: zero deposit, 30 Tgas; checks current offer, FLOOR balance, storage and verified funding terms. Principal becomes a separate native claim.
- `cancel_offer({loan_id})`: zero deposit, 30 Tgas; lender/open-offer check; principal becomes a cancellation claim.
- `nft_transfer({receiver_id,token_id,approval_id:null,memo:null})`: exactly one yoctoNEAR, 30 Tgas; current NFT ownership, distinct registered existing receiver and explicit recovery-right acknowledgement.
- `repay({loan_id})`: exactly the current debt attached, 30 Tgas; current NFT owner, no pending NFT callbacks and strictly before chain expiry. NFT burns; collateral goes to its current owner. Lender payment is a separate native claim.
- `default_loan({loan_id})`: zero deposit, 30 Tgas; permissionless at/after expiry with no pending NFT callbacks. Collateral goes to lender and NFT burns. Caller registration is not imposed for this permissionless action.
- `withdraw_claim({claim_id})`: zero deposit, **110 Tgas**, recorded owner and Available state required. Success additionally requires the on-chain claim to be Paid after final outcomes.
- `retry_failed_claim({claim_id})`: zero deposit, 30 Tgas; only RefundPending/known-failure state and the contract's conservative returned-cash check. It restores availability; a withdrawal is separate. Unknown InFlight claims cannot be retried.

All U128 amounts and U64 IDs are decimal JSON strings. No private callback or invented enumeration endpoint is called. Storage withdrawal/unregistration, generic FT transfers, NFT transfer-call extensions and DAO write controls are not exposed by this interface; their presence in the Rust contract is not claimed as frontend functionality.

## Exact calculations and safe reviews

NEAR/FLOOR base units use BigInt throughout. Input conversion rejects exponent notation, commas, negatives, excess precision and U128 overflow. Duration and IDs use U64 limits. Display truncation never changes submitted base-unit amounts. Floating-point conversion is limited to bounded SVG/CSS coordinates, dates and nonfinancial metadata.

Redemption uses one final division of `L*c*((10000-tax_bps)*T+tax_bps*c)/(10000*T*T)`, then enforces nonzero output and explicit `min_out`. The default tolerance is 50 bps and is editable from 0–500 bps. Before submission, the local quote is checked against `quote` at the finalized snapshot block. Full amounts/arguments/deposit/gas are shown in review.

Fresh state is validated before review and again before opening the wallet. Validation includes solvency, code/network, registration, conservative record-storage headroom, spendable native balance after account storage, gas reservation cushion, balance, ownership and expiry. The 0.01 NEAR record cushion and 12-times-base-gas-price headroom are frontend safety choices, not invented contract minima or fee quotes. The separately reviewable storage top-up is 0.05 NEAR.

The flow distinguishes validating, review, awaiting wallet, submitted, confirmed, rejected, failed and unknown. Double submission is gated. A public pending intent/hash is stored before handing off; no secret is stored. Reconciliation checks signer, receiver, hash, method, arguments, deposit, finality and every returned receipt. Unknown results remain unknown with read-only recheck instructions, never automatically resubmitted. A parent success cannot hide a failed callback. Known final transaction failure is distinct from unresolved callback state.

My NEAR Wallet v10 declares this external-popup module as `injected`; the adapter handles that exact module ID, checks testnet and uses its batch approval path for every call. The single-call path that could use an existing function-call key is never used. No `createAccessKeyFor` is requested. Wallet SDK code is loaded after a wallet action or for a returning wallet session.

Open-offer `get_loan` omits duration. Instead of inventing it, the UI accepts the real lender funding transaction hash and verifies final success, lender, contract, returned loan ID, attached principal, debt, collateral and duration. The cached proof is reverified before borrowing/review submission. Offers confirmed through this browser retain their proof automatically. Nanosecond terms are formatted exactly, including sub-hour durations.

## Live versus historical data

The app's treasury and position data come from RPC. RPC failure displays an error; a previous successful read is explicitly retained as a previous read, not replaced by the demo snapshot. Writes still require a fresh verified read. The landing metrics, three-point history and lifecycle/vote animations are explicitly historical demo replay.

The live read-only check recorded backing `2019000000000000000000000`, supply `1900000000000000000000000`, actual native balance `8269000000000000000000003`, required reserves `6847910000000000000000003` and surplus `1421090000000000000000000` base units. Backing per FLOOR is exactly **2019/1900**, approximately **1.062631578947… NEAR/FLOOR**. It is not a guaranteed redemption payout.

For 0.1 FLOOR at that read, both local calculation and contract quote returned **86129085872576177285318 yoctoNEAR** (0.086129085872576177285318 NEAR). The older Bob payout of 0.081 NEAR is correctly historical and is not reused as a current exchange rate. The DAO's parent vote attached zero; the nested contribution attached 0.10 NEAR. Both are separately labeled in proof details.

Live check artifacts: `frontend/qa/readonly-integration.json`, `frontend/qa/live-browser-check.json`, `frontend/qa/wallet-login-handoff.json` and `frontend/qa/production-browser.json`. They contain only public information. Original transaction hashes/receipts and pre-DAO snapshots in the main evidence file are untouched.

## Validation

- TypeScript: pass.
- ESLint: pass.
- Vitest: **44 tests pass**, including 10,000 deterministic integer curve cases; amount boundaries, overflow, dust, rounding, issuance, expiry, NFT ownership, callback uncertainty, wallet approval path, offer receipt substitution and full DAO-policy comparison.
- Playwright: **10 scenarios pass**. Every route is checked at 360, 390 and 1440 widths. Additional flows cover mobile navigation, blocked issuance, offline/wrong network, filters/copy, dialog focus/Escape, reduced-motion replay, review-before-approval, no automatic resubmission, NFT recipient acknowledgement, exact repayment, withdrawal callback gas and partial position totals. These use explicitly isolated mock RPC/wallet adapters; they are not evidence of new public transactions.
- Production `tsc -b && vite build`: pass. A separate installed-Chrome production smoke checks built routes and actual wallet login handoff. No browser download was required.
- Read-only live integration: testnet/code hash, metadata decimals, quote parity, native solvency, actual policy/proposal, closed loan/NFT states and historical DAO final receipts pass. New financial transactions submitted: **zero**.
- Actual wallet login handoff reached `https://testnet.mynearwallet.com/login/` with no contract-key request. No authentication or signing was attempted.

Machine-readable final command statuses are in `frontend/qa/final-checks.json`; corresponding logs are saved beside it. Browser results are in `frontend/qa/browser-results.json`.

Dependency audit: **10 low, 0 moderate, 0 high, 0 critical** findings remain in the transitive NEAR/elliptic dependency chain. The minimatch tooling advisory was patched with an explicit override. No unsafe forced wallet downgrade was applied. The production build still reports upstream `generate-function`/browser `util` and `js-sha256` direct-eval warnings. These are documented warnings, not an audit pass or a strict-CSP compatibility claim.

## Screenshots and visual inspection

All six routes were captured and visually inspected at **1440×900** and **390×844**, with full-page companions. None of the twelve live captures had a runtime exception or horizontal overflow. Browser flow tests additionally check 360px width. Iteration fixed the lime card cascade, legibility, wrapped mobile filters, historical chart labeling and explicit parent/nested contribution labels.

- Landing: [desktop](frontend/qa/landing-desktop.png), [mobile](frontend/qa/landing-mobile.png).
- Overview: [desktop](frontend/qa/overview-desktop.png), [mobile](frontend/qa/overview-mobile.png).
- Treasury: [desktop](frontend/qa/treasury-desktop.png), [mobile](frontend/qa/treasury-mobile.png).
- Loans & NFTs: [desktop](frontend/qa/loans-desktop.png), [mobile](frontend/qa/loans-mobile.png).
- Governance: [desktop](frontend/qa/governance-desktop.png), [mobile](frontend/qa/governance-mobile.png).
- Activity & Proof: [desktop](frontend/qa/activity-desktop.png), [mobile](frontend/qa/activity-mobile.png).

Full-page versions use the same names with `-full.png`. Tests verify keyboard focus and reduced-motion fallback. This is local Chromium responsive QA, not physical iPhone/Android or independent accessibility certification.

## Run and 90-second demo

From `E:\near-2`:

```powershell
.\frontend\run.ps1 dev
# http://127.0.0.1:5173
.\frontend\run.ps1 typecheck
.\frontend\run.ps1 lint
.\frontend\run.ps1 test
.\frontend\run.ps1 test:e2e
.\frontend\run.ps1 build
```

Public configuration is in `frontend/.env.example`. Only a public RPC URL is configurable. Dependencies, build artifacts, test output and package cache live on E:. The PowerShell wrapper sets TEMP/TMP/cache to E:. Existing Node and Chrome executables run from their installed locations. An early failed npm invocation, before root cache configuration, produced an npm diagnostic log at its default location; no package downloads were sent there. Root/frontend `.npmrc` and the wrapper prevent recurrence.

Demo: 0–12s Landing hero and mechanism CTA; 12–27s Treasury current quote, unavailable issue guard and reserves; 27–57s Loans historical NFT lifecycle replay, emphasizing that owner rights moved Carol→Dave and the NFT burned; 57–75s Governance historical B/C replay and actual contribution impact; 75–90s Activity select the DAO receipt, inspect the nested contribution and copy/open its real hash. No transaction or wallet login is required for this judge walkthrough.

## Honest limits

Only My NEAR Wallet is integrated. Live financial wallet signing and post-sign return flows have implementation/unit/mock-browser coverage, but **no new end-to-end public financial signature was performed for this task**. The operator must review and approve any future transaction through their own wallet. Popup permissions may be required.

Loan/claim discovery is partial because the deployed contract has no enumeration or indexer adapter. Additional IDs and funding receipts must be provided explicitly. Missing archived funding receipts keep borrowing disabled rather than guessing a term. Current 1:1 issuance is intentionally unavailable above 1 NEAR backing/FLOOR; a new wallet cannot acquire FLOOR through a dilutive issue. This interface has no FT transfer tool.

Governance is read-only, activity is curated historical evidence and chart points are historical events rather than a full indexer. No oracle, APR/APY, USD price, market floor, guaranteed lender recovery, independent people or community decentralization is asserted. Missing callbacks can still strand claims/rights under the existing contract; the frontend provides status inspection, not a new unsafe recovery mechanism.

There is no hosting deployment, mainnet integration, physical-device test or independent audit. Retained upgrade keys mean Floorline remains mutable. Original core access keys and credentials were not touched.
