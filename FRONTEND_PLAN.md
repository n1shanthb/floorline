# Frontend audit and implementation plan

Scope: frontend only under E:\near-2. No contract/DAO changes, rebuilds, redeployments, private-key access, or automatically submitted transactions.

## Audit

- No existing frontend. React + TypeScript + Vite selected; own CSS tokens, Lucide icons, accessible Radix dialogs, locally served fonts, lazy wallet-selector import. Existing Rust/runtime tools stay unchanged.
- Read the master prompt, complete UX spec/tokens/events/references, mockup HTML and all 11 PNG references. These are visual/reference documents; Rust and public finalized evidence define methods and amounts.
- All seven supplied event transaction hashes match successful finalized and independently indexed repository evidence.
- Design labels “Loan #1/#2” mean demo ordering. Actual contract loan IDs are **2 and 7**, not 1 and 2. UI uses actual IDs.
- Approved code hash: 6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9. Deployed issuance is immutable 1:1, sourced from the atomic new call; current hash must match before writes.
- accounting, user_state, storage_balance_of/bounds, ft_balance_of, get_loan, get_claim, nft_token, quote are real reads. No offer/loan/claim/NFT enumeration exists: known evidence IDs plus manual persisted ID tracking, explicitly incomplete discovery.
- U128 amounts and U64 IDs are JSON strings. Redemption performs one final floor division of the full rational curve. Monetary computations use BigInt; SVG coordinates alone may use bounded numeric plotting.
- Loan and claim IDs share a global counter. Never infer sequential loan IDs or promise exhaustive discovery. get_loan omits duration for open offers: exact term cannot be obtained from that view alone. Fund-offer transaction inputs may supply a verified historical term; newly created local intent can record its submitted term. Unknown term must be disclosed before borrowing.
- Claim Available=0, InFlight=1, RefundPending=2, Paid=3. Loan Offer=0, Active=1, Repaid=2, Defaulted=3, Cancelled=4. Missing callbacks are unknown; never automatically retry an InFlight claim.
- Repay requires current NFT owner, pending=0, strictly before block expiry and exact debt deposit. Default is permissionless at/after expiry. NFT transfer requires receiver registration and 1 yocto; settlement burns NFT, not collateral FLOOR.
- Native withdrawal needs >=110 Tgas. New offers/claims require prepaid storage; use an explicitly disclosed conservative frontend headroom check and separate reviewable top-up, not an invented contract minimum.
- Sputnik proposal/policy reads are real. Governance remains read-only for this frontend phase; historical replay is operator-controlled simulated council, never independent humans.

## Phases

1. Typed adapters, evidence export, exact integer math, wallet with no app access key, hash/network checks, shared responsive theme/navigation.
2. Landing story/orb, Overview, Treasury with live reads, freshness/errors, review and explicit wallet confirmation.
3. Loan ID discovery and supported create/cancel/accept/repay/transfer/default, native claims, read-only governance and verifiable activity replay.
4. Responsive/reduced-motion polish, unit tests + browser flows and all-route desktop/mobile screenshots, typecheck/lint/test/build, implementation report.

No real wallet signing will be performed by the coding agent; browser QA uses clearly marked test doubles only inside tests. Report integration verification and limits honestly.
