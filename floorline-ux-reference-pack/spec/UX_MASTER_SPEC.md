# FLOORLINE — SOFT ELECTRIC / UX MASTER SPEC

**Design lock:** Revnet-like task-first product UX, warm light Gen-Z visual style, editorial landing, clear serious financial app. Six routes: landing + five app pages. Screenshots are original, static composition references. Production must be fully functional, accessible and chain-grounded.

## Information architecture

| Route | Top action | Secondary actions | Data/visualization |
|---|---|---|---|
| `/` | Explore Floorline → `/app` | See how it works → scroll; View proof → `/app/activity`; Connect wallet | CSS/SVG orb, verified replay ticker, five-chapter sticky mechanism, backing explanation, NFT visual |
| `/app` | Redeem / Explore loans | Connect/disconnect, Your NFTs, View activity | L, T, backing ratio, wallet position, verified step-chart, latest verified events |
| `/app/treasury` | Issue / Redeem / Claims | Max, Review, Confirm, Withdraw claim, View receipt | L/T step-chart, quote curve if exact, native balance vs reserves, claim status |
| `/app/loans` | Explore offers / Borrow | Create offer, My loans, My NFTs, Repay, Transfer NFT, Settle default, Withdraw proceeds | Offer terms, collateral lock diagram, NFT recovery card, lifecycle/expiry timeline |
| `/app/governance` | View proposal / View execution | Create proposal or Vote only if verified and authorized, See backing impact | Council threshold, two signed approvals, execution timeline, before/after backing |
| `/app/activity` | Inspect event / View explorer | Filter, Copy hash, Replay event, View contract | Event timeline, receipt details, verified step-history, reserve snapshot |

## Design system

Canvas `#F7F7F3`; primary ink `#17171B`; primary CTA violet `#7659ED`; violet-hover `#6446D9`; lilac panel `#EAE5FF`; lime emphasis `#DFFFAB`; border `#E9E7E2`; muted text `#787781`; dark violet `#32245C`; amber warning `#FFF1D9`. Avoid all-white pages and excessive gradients. Use 24px major card radius, 14px button radius, 99px pill radius, 1px borders, very subtle shadow, 8px spacing grid. Display type Space Grotesk, UI type Geist/Inter. Headline 88–96px desktop / 50–62px mobile; app H1 42–48px desktop / 32–36px mobile; body 14–16px; tiny metadata minimum 11–12px with sufficient contrast. Ensure keyboard and screen reader accessibility.

## Landing choreography

1. **Hero**: top nav logo, How it works, Protocol, Activity, Docs, testnet badge, Launch app. Massive two-line heading; orbiting purple treasury orb; two metric float cards. Buttons work.
2. **Verified moments ribbon**: three confirmed historical events (Alice issuance, NFT transfer, DAO contribution), each clickable, labeled “Verified testnet replay”. New event slide 350ms, dwell 5–7s; pause on hover/focus; reduced-motion static list.
3. **Five-step mechanism scroll story**: one pinned graphic on desktop, five scroll chapters: issue; 20%-taxed redeem; separate lender-funded borrow; transfer NFT recovery right; 2/3 DAO approvals + contribution. Each chapter has 1–2 short paragraphs, an optional “Inspect receipt” link, and an illustration that tracks the active chapter. On mobile, normal scroll with short inline illustrations. No scroll hijacking.
4. **Backing story**: step chart of only verified state changes, showing initial 1.0, after Bob redemption 1.01, after DAO 2.019/1.9; explicit distinction between backing ratio and redemption quote.
5. **NFT showcase**: large lavender NFT card, ownership transfer animation on scroll; disclaimer that after repay/default the NFT is burned.
6. **Final CTA**: lime panel, Enter app / View proof.

## Overview details

Top heading “Your financial playground.”, last-updated status, network and wallet. Hero violet panel shows backing per FLOOR and a verified event-step chart. Side panel shows connected FLOOR balance, pending claims, active owned NFTs; disconnected empty state. Three metric cards: backing, supply, issue availability. Activity preview with clickable real receipts. Quick actions navigate to relevant panel states. Display snapshot vs live clearly.

## Treasury details

**Issue tab:** input NEAR, estimated FLOOR, exact issue guard `d*T>=L*m`, storage-registration readiness, min/max/fees if contract supports; at last demo snapshot, disable positive issuance with explanation. Do not show a fake buy success.

**Redeem tab:** FLOOR input, Max, tax 20%, exact expected NEAR quote, `min_out`, gas/deposit, recipient/claim behavior, review drawer, wallet sign, receipt check. Formula in integer base units `Q=floor(L*c*((10000-tax_bps)*T+tax_bps*c)/(10000*T*T))`; use current state, no JS floats. Warn if quote is zero or stale. For example Bob's historical redemption of 0.1 FLOOR yielded 0.081 NEAR at the then-current state; never apply that old rate to new state.

**Claims tab:** claim balance, withdraw, status, retry/recheck. Unknown callback is uncertain, not success. Explain paid vs pending.

**Charts:** backing per FLOOR step-line with verified event markers, local solvency bar (`A` vs `R_local`), optional redemption quote curve computed from actual current state (not a price chart). Avoid APY, USD price and guarantees.

## Loans and NFTs details

Tabs Explore offers / My loans / My NFTs / Lender dashboard. Offer card: principal, debt, collateral, term, lender, expiry/status; supported Create Offer and Borrow with exact on-chain method parameters and storage. Loan NFT card: loan ID, current owner, debt, collateral, expiry, lender, status. **NFT owner, not original borrower, owns the right to repay and recover collateral.** Transfer requires confirmation that rights move; repayment burns NFT and releases collateral to current owner; default after expiry moves collateral to lender and burns NFT. Show permissionless settle-default action only when actually eligible. All charts should be lifecycle/expiry based, not price projections. Historical Loan #1: 0.1 principal, 0.11 repayment, 0.2 FLOOR collateral, NFT transferred Carol→Dave, repaid by Dave, burned. Historical Loan #2: 0.05 principal, 0.055 debt, 0.1 collateral, default settled, NFT burned. Never present them as open offers.

## Governance details

Read-only proposal #0 first, verified threshold: 3 council accounts, two approvals (B and C), execution contributed 0.1 NEAR to Floorline. Visual 3-avatar diagram; after B approval, proposal remained InProgress, after C approval it executed. Show ratio change 1.01 → 1.062631578947..., supply stays 1.9. Council wallets were controlled by one operator; this is **technical DAO integration, not independent community governance**. Do not show any generic visitor as eligible to vote. If creation/vote action is implemented, validate exact Sputnik policy, 1 NEAR proposal bond and signer's council membership; otherwise read-only with honest label.

## Activity & proof details

Filters: All, Treasury, Loans, NFTs, Governance. Event card: action, amount, wallet/contract, confirmation status, verified transaction link, block time if verified. Detail drawer: hash, sender, receiver, method, attached NEAR, receipts, final outcome. Replay is a visual explanation of historical events with a clear “Replay” badge; no fabricated live ticker. Real-time events require a real indexer/polling of chain. Offline/static evidence fallback is clearly labeled. Provide a visible testnet network badge and original deployed contract address.

## Button and modal inventory

- Global: Logo (home), nav routes, wallet connect, wallet account drawer, disconnect, wrong-network warning, help popover, copy account/hash, explorer link, network status.
- Landing: Enter app, How it works, View proof, Inspect receipt, Explore loans.
- Overview: Issue, Redeem, Borrow, Your NFTs, View activity, Refresh state.
- Treasury: tab switch, amount input, Max, Review, Confirm, Withdraw, View receipt, Learn about backing.
- Loans: offer filters, Create Offer, Fund/Cancel if supported, Borrow, My loans, My NFTs, Repay, Transfer NFT, Settle Default, Withdraw Proceeds, Replay Lifecycle, View history.
- Governance: View Proposal, View Execution, See Backing Impact, DAO account link, Create Proposal/Vote only if verified and authorized.
- Activity: filter, inspect, copy, explorer, replay, download evidence if a real public export is available.

All buttons need real behavior or an honest disabled state. No inert decorative controls in production.

## Motion tokens

Button hover 160ms / press 100ms; tab 240ms; drawer 280ms; card reveal 420ms; headline stagger 65ms per word; float 6s; number transition 500ms; chart draw 650ms; NFT transfer 700ms; DAO vote replay 450ms per vote; toast 350ms. Easing: standard `cubic-bezier(.2,.8,.2,1)` for UI; spring only for nonfinancial decoration. No scroll hijacking. Respect reduced motion. Keep animation state consistent with real transaction confirmation.

## Responsive

- 1440px: 248px sidebar and 1–2 column app content; large editorial hero.
- 1024px: narrower sidebar, adaptive chart/action layout.
- 768px: sidebar becomes drawer or bottom nav; forms single-column.
- 390px and 360px: no horizontal scroll; fixed safe-area-aware mobile navigation, readable forms, all actions thumb-reachable; sticky graphics become inline and parallax disabled.

## Accessibility, trust and performance

WCAG-aware contrast, semantic headings, labels, keyboard navigation, focus-visible, modal focus trapping, no inaccessible color-only statuses. All money transactions show Review → Wallet approval → Chain confirmation / Error / Unknown. Use only public keys and account IDs; no local secret storage. A retained contract upgrade key means no immutable claim. Network testnet only. Skeleton/empty/error/unknown states are designed, not afterthoughts. Do not make up market prices, APY, LTV, DAO decentralization or live activity.

## Judge walkthrough (90s)

0–12s landing; 12–27s treasury quote/backing; 27–57s loan NFT transfer/repayment verified replay; 57–75s 2/3 DAO vote and backing change; 75–90s receipt inspection. Provide direct demo navigation/shortcuts without auto-signing transactions.
