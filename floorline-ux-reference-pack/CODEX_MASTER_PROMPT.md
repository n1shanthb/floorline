# CODEX MASTER PROMPT — FLOORLINE FRONTEND

You are Codex working in the existing Floorline NEAR repository at `E:\near-2`. The user has now authorized **frontend implementation**. Implement a real, visually exceptional, testnet-only frontend with the **Revnet-inspired UX / Soft Electric Gen-Z aesthetic** in the attached `floorline-ux-reference-pack`.

## Mandatory first steps

1. Read this entire prompt, `README.md`, `spec/UX_MASTER_SPEC.md`, `spec/DESIGN_TOKENS.json`, `spec/VERIFIED_DEMO_EVENTS.json`, `spec/REFERENCES.md`, and view every PNG in `screenshots/` (especially `00_all_pages_contact_sheet.png`). Inspect `mockups/floorline-reference.html` for **visual guidance only**, not production architecture. The mockup is deliberately static and has noninteractive visual buttons; production buttons must work.
2. Inspect the actual repo before changing anything: package managers, frontend directories, Rust contracts, public view/change methods, ABI or generated interfaces, docs, tests, `GATE3_RESULTS.md`, `DAO_DEMONSTRATION.md`, `DEMO_READY.md`, `TESTNET_EVIDENCE.json`. Determine exact contract method names, argument schemas, storage requirements, attached deposits, gas, callback/claim behavior and NEAR wallet tooling from source. **Do not guess contract method names.**
3. Make a short implementation plan and inventory the existing frontend. If one exists, improve it; don't delete working code without justification. Prefer the repo's existing framework. If no frontend exists, use a clean TypeScript + React + Vite or Next.js setup, selecting the lightest compatible stack. Favor Tailwind CSS, Radix/shadcn-style accessible primitives, Framer Motion / Motion, Lucide icons and a small chart library. Avoid heavyweight 3D dependencies unless they provide clear value.
4. Work **only under `E:\near-2`**, including caches/temporary files if feasible. Never write keys to the repo or logs. Don't use C: for project work. Keep existing credentials under their protected directory and never read or expose private keys for frontend integration.

## Absolute backend constraints

- **DO NOT** change, recompile, redeploy, migrate or upgrade the Floorline Rust smart contract, its WASM, deployment, testnet state, or DAO. Do not modify on-chain policy. No new token factory or AI Cloud requirement. This task is the **frontend only**.
- Approved Floorline contract: `floor.floorline-g3-20261111-6702ea.testnet`.
- Sputnik DAO: `floorline-g3-20261111-6702ea.sputnikv2.testnet`.
- Network: **NEAR testnet only**. All connected-wallet transactions must require explicit user approval. Never auto-sign or auto-submit.
- The UI must not imply the retained-access-key deployment is immutable, production-audited, mainnet-ready, or permissionless community governance. Council demonstration used three operator-controlled accounts.
- All financial inputs and contract amounts must use decimal strings and `BigInt`/safe fixed-point arithmetic; no floating-point math for deposits, balances, quotes, minimum outputs or collateral.

## Visual design — follow the supplied images closely

- UX inspiration: **Revnet** for a single-project financial experience and action-first forms, not a clone. Design aesthetic: **warm light, Gen-Z, modern editorial fintech**; never sterile white legacy SaaS, dark cyberpunk, glass overload or childish gradients.
- Palette: canvas `#F7F7F3`, ink `#17171B`, violet `#7659ED`, lilac `#EAE5FF`, lime `#DFFFAB`, subtle border `#E9E7E2`, muted `#787781`, dark-violet `#32245C`, amber notice `#FFF1D9`. Use tokens, not scattered magic hex values.
- Type: Space Grotesk for editorial display, Geist/Inter for interface; use accessible fallbacks. Large expressive headlines, very readable forms, high-contrast labels, soft 18–26px card radii, restrained shadows and generous spacing.
- Desktop: premium sidebar app navigation with 5 destinations; landing has a compact top nav. Mobile: **working bottom navigation or accessible menu**; screenshots are composition references, not final responsive solutions. No horizontal overflow at 360px.
- Recreate the original abstract treasury orb, NFT card and diagrams as CSS/SVG/canvas or optimized local assets. Do not use screenshot PNGs as page backgrounds, don't hardcode them as the UI, and do not copy third-party logos/assets from Revnet, Linear, Morpho or Apple.

## Routes and functionality

1. `/` **Landing**: bold “Money with mechanics.” hero, treasury orb, CTA to `/app`, smooth scroll to mechanism story, 5-step sticky desktop story (Issue → Redeem → Lender-funded borrow → NFT transfer → DAO contribution), verified historical activity ribbon, backing explanation, NFT showcase, final CTA. Historical activity must say **Verified demo replay**, never Live. Every event links to a real receipt. Use scroll-triggered motion and reduced-motion fallback.
2. `/app` **Overview**: read contract state via NEAR RPC, display `L`, `T`, `L/T` with precise units and snapshot freshness, position for connected wallet (FLOOR balance, claims, NFT ownership), action shortcuts, a verified backing step-chart and verified activity. Show honest loading/empty/RPC-error states. No invented USD prices, APY or users.
3. `/app/treasury` **Treasury**: Issue/Redeem/Claims tabs. Issue form must check the actual issuance inequality `d*T >= L*m` (where `m=floor(d*w_num/w_den)`), and at the last verified state with `w=1`, ordinary positive issuance is unavailable because `L/T>1`. Clearly explain and disable invalid issue attempts. Redeem must calculate/display the **exact on-chain-compatible quote**, with 20% tax and `min_out`, check balances/storage/allowances where applicable, provide Review → Wallet sign → Receipt confirmation. Redemption formula in integer base units: `Q=floor(L*c*((10000-tax_bps)*T+tax_bps*c)/(10000*T*T))`; reject zero. Claims tab shows withdrawable payouts and uses the contract's actual withdrawal method. Chart: verified step-history of backing ratio; solvency: actual native account balance `A` vs local required reserves `R_local` with a breakdown when obtainable. Label `L/T` **backing per FLOOR**, not a guaranteed redemption price.
4. `/app/loans` **Loans & NFTs**: tabs Explore Offers / My Loans / My NFTs / Lender Dashboard. List real offers; supported lender funding/create/cancel/withdraw actions as source allows. Borrow flow shows lender-funded principal, FLOOR collateral, debt, term, expiration, NFT ownership consequences, then signs. Repay **only as current loan NFT owner**; NFT transfer to valid recipient with explicit warning that rights move with the NFT; after repay/default NFT is burned. Default action only after contract expiry, with accurate permissionless semantics. Claims withdrawal where applicable. Visual loan lifecycle: offer → borrow → NFT transfer → repay/burn OR default/burn. Avoid invented APR/LTV/oracle prices. Historical demo loans must not appear as active.
5. `/app/governance` **Governance**: read actual Sputnik DAO proposal/policy if possible; show Proposal #0, Council A proposer, B and C approvals, 2-of-3 threshold, real 0.10 NEAR contribution, before/after backing `1.01 → 1.0626315789...`, links to real approval/execution receipts. Include an unmistakable disclosure: **operator-controlled simulated council; independent human governance not proven**. Proposal creation and voting controls only if exact DAO methods, roles, deposits, wallet permissions and tx parameters are verified; otherwise show honest read-only or disabled state. No fake vote button.
6. `/app/activity` **Activity & Proof**: filters, verifiable indexed/historical transactions, selected receipt details, copy hash, explorer link, and explicitly labeled **Replay** of verified events. If no indexer or historical data is available, use validated local public demo evidence with a “Historical testnet evidence” label. Do not invent real-time events, timestamps or chart points. Never conflate a successful parent tx with a successful callback: inspect final outcomes.

## Button / interaction contract

Every visible interactive affordance must perform a real action, route, scroll, open a functional modal/drawer, copy, filter, or show a meaningful disabled explanation. No decorative dead buttons. Wallet connect/disconnect and network mismatch states must work. Forms validate amounts, account IDs, storage requirements, current ownership, expiry, attached deposit, slippage/minimum output and RPC freshness. Confirmations show exact human-readable terms plus base-unit-safe calculations. Use a transaction state machine: idle → validate → review → awaiting wallet → submitted → confirmed / rejected / unknown. Unknown callbacks must **not** be treated as success; show recovery/check-status instructions. Use accessible notifications, keyboard focus traps and ARIA labels.

## Motion & scroll specification

- Hero words stagger by ~65ms; subtle 6s floating orb; pointer parallax max 12px, desktop only.
- Buttons 160ms hover / 100ms press; tabs 240ms; modal/drawer 280ms; scroll reveal 420ms; verified number updates 500ms; chart entrance 650ms; NFT transfer replay ~700ms; vote replay ~450ms per vote.
- Desktop landing has one sticky/pinned mechanism visualization with five scroll chapters. On mobile replace with sequential inline chapters, not scroll hijacking.
- Animated “Alice issued 2.00 FLOOR”, “Loan NFT transferred to Dave”, “DAO contributed 0.10 NEAR” must be backed by actual evidence and labeled historical replay. No fabricated “Alice bought 60” activity.
- On confirmed transaction success, use tasteful micro-animation; never animate success while pending. Defaults are neutral/amber, not celebratory. Support `prefers-reduced-motion`, low-power mobile and keyboard navigation.

## Data and verification

- Last verified historical state after DAO: `L=2.019 NEAR`, `T=1.9 FLOOR`, `L/T≈1.062631578947...`, `A=8.269000000000000000000003 NEAR`, `R_local=6.847910000000000000000003 NEAR`, surplus `1.42109 NEAR`. **These are reference/demo snapshots, not live constants.** Live app data must come from chain reads. `TESTNET_EVIDENCE.json` has some stale pre-DAO top-level status fields: treat `post_dao_final_state` and latest DAO report as current; preserve historical pre-DAO snapshots, and don't present stale “DAO not executed” as current.
- `L` is unencumbered backing; `T` counts collateralized FLOOR only once; lender-funded principal is **not** treasury backing. No guaranteed market floor or lender recovery in NEAR.
- The evidence pack `spec/VERIFIED_DEMO_EVENTS.json` contains known hashes. Verify them against actual local evidence before wiring links, and only display claims supported by the source.
- Prefer direct NEAR RPC for authoritative contract state, wallet reads and tx status; optionally use a documented public testnet indexer for historical events. If API unavailable, fall back to clearly labeled historical evidence; don't quietly substitute fake live data.

## Engineering and QA

- Clean reusable components, centralized tokens, typed contract adapters, chain-safe formatting, responsive layout, proper skeletons, robust error states, semantic HTML and WCAG-aware contrast.
- No API keys or credentials in the frontend bundle. Do not leak council keys. Do not ship an unsecured server signer or admin endpoint.
- Unit tests: decimal and yocto conversions, issuance guard, redemption quote, NFT owner permissions, activity labels, wallet state and tx state machine. Component/flow tests for key screens and responsive navigation. Build/lint/typecheck must pass.
- Take and inspect desktop/mobile screenshots for each route at 1440x900 and 390x844. Compare with supplied references; iterate on visual polish and fix clipping, typography, density and mobile nav.
- Optimize initial load: avoid unnecessary 3D, lazy-load chart and animation heavy sections, avoid layout shifts. Use reduced-motion behavior.

## Execution order

**Phase 1**: repo audit, typed contract method map and wallet/RPC adapter; implement token/theme, routes, responsive nav. **Phase 2**: full polished landing, overview, treasury with real reads and safe action flows. **Phase 3**: loans/NFT flows, governance evidence and activity/proof. **Phase 4**: animations, responsive refinement, tests and judge demo. Prioritize working verifiable flows before visual flourishes if time is tight.

## Final deliverables

1. Working local frontend with exact start/build commands and env examples (public RPC/account IDs only).
2. A `FRONTEND_IMPLEMENTATION_REPORT.md` listing implemented routes, live vs historical data sources, exact verified method mappings, working buttons, screenshots, tests and remaining blockers.
3. A 90-second demo path: Landing → Treasury → NFT lifecycle replay → DAO replay → Proof.
4. Explicitly report anything you could not safely implement; do not claim unsupported functionality works.

**Start by reading the reference pack and repo, then implement. Do not ask me to re-decide the visual direction: it is locked.**
