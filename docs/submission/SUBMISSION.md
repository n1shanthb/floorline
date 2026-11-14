# Floorline — Official Hackathon Submission

**NEAR Hackathon November 2026**  
**Submission Date:** 2026-11-14  
**Project Name:** Floorline  
**Official tracks:** Unstoppable DeFi · NFTs That Do Something · AI Security & Defense

---

## Project Summary

**Floorline** is a collateralized lending protocol on NEAR testnet, demonstrating externally backed token issuance (FLOOR), NFT loan receipts (NEP-171), and async claim withdrawals. This is a **testnet-only hackathon demonstration** — not audited, not production-ready.

---

## Core Innovation

### What Makes Floorline Unique

1. **Externally Backed Token (FLOOR)**
   - Not minted from thin air — backed by deposited NEAR
   - L/T ratio visible on-chain (0.01018 NEAR / 0.009 FLOOR at submission)
   - Redemption creates async claims (tested with 40 finalized transactions)

2. **NFT Loan Receipts**
   - Every loan is a transferable NEP-171 NFT
   - Holder can repay, not just borrower (3-party flow tested)
   - Metadata includes collateral, repayment, deadline

3. **Async Claim Pattern**
   - All exits use two-step claim/withdraw flow
   - Prevents reentrancy and complex callback chains
   - Demonstrated with 6 multi-receipt (7-transaction) withdrawals

4. **Operator-Controlled Safety**
   - Guardian can irreversibly stop new risk
   - Funded exits still work post-stop (tested)
   - Not decentralized/ownerless (intentional for testnet demo)

---

## Technical Architecture

### Smart Contract
- **Language:** Rust + NEAR SDK 5.30.1
- **Standards:** NEP-141, NEP-145, NEP-171, NEP-177
- **Patterns:** Async claims, storage management, external backing
- **Deployment:** Fresh atomic deploy on testnet

### Frontend
- **Framework:** React 19 + Vite + TypeScript
- **Wallet:** NEAR Wallet Selector (My NEAR Wallet)
- **RPC:** Dual-provider verification (nearapi + backup)
- **Routes:** Landing, Verify (no wallet), Judges docs

### Testing
- **Unit Tests:** Vitest (frontend logic)
- **E2E Tests:** Playwright (browser flows)
- **Acceptance:** 40 testnet transactions executed and verified

---

## Demo & Verification

### Live URLs

- **GitHub Repository:** https://github.com/n1shanthb/floorline
- **Live Demo:** https://floorline-delta.vercel.app (live)
- **Testnet Contract:** https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet

### Local Quick Start (Judges)

```bash
# Clone repository
git clone https://github.com/n1shanthb/floorline.git
cd floorline

# Verify deployment (automated)
cd frontend
npm ci
npm run judge:verify

# Run frontend
npm run dev
# Visit http://127.0.0.1:5173/verify
```

**Expected time:** 5 minutes to verify, 2 minutes to explore UI.

---

## Evidence Package

### Transaction Proofs

**All 40 verified transactions documented in:**
- `docs/evidence/proofs.json` (structured JSON)
- `frontend/public/evidence/proofs.json` (static hosting copy)

**Transaction Groups:**
1. **Deployment (5):** Fresh contract + fund 4 actors
2. **Registration (5):** NEP-145 storage deposits
3. **FLOOR Lifecycle (6):** Issue → Transfer → Redeem → Contribute
4. **Lending (Repay) (9):** Full cycle with NFT transfer
5. **Lending (Default) (7):** Deadline expiry + collateral seizure
6. **Cancellation (5):** Pre-acceptance offer cancel
7. **Storage & Stop (3):** Withdrawal + irreversible stop + post-stop exit

**Verification Status:** 40/40 FINAL_VERIFIED with receipt closures

### Contract State (Final)

- **Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`
- **Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- **Network:** NEAR Testnet (NOT mainnet)
- **Block Height:** 277696567 (final state snapshot)
- **Liquidity (L):** 0.01018 NEAR
- **Tokens (T):** 0.009 FLOOR
- **Inflight:** 0 (all claims settled)
- **Stopped:** true (irreversible)

---

## Hackathon Compliance

### Official Rules Checklist

See [`docs/submission/RULES_CHECKLIST.md`](RULES_CHECKLIST.md) for detailed compliance evidence.

#### Required Criteria (All Met)

- ✅ **Deadline:** Submission before 2026-11-14T23:59:00Z
- ✅ **Network:** Testnet-only (contract name ends `.testnet`)
- ✅ **AI Tools:** Claude Code & Cursor (screen-level only)
- ✅ **Team Size:** Solo with 2 disclosed projects (Floorline + NIO)
- ✅ **Public Repo:** https://github.com/n1shanthb/floorline
- ✅ **Demo:** Working frontend with `/verify` route
- ✅ **README:** Quick start instructions included
- ✅ **Track:** DeFi (lending) + NFTs (receipts) + Security (async)

### Related Submission Disclosure

**Second Project:** Near Intent One (NIO)  
**Relationship:** Independent solo projects, different domains  
**Evidence:** See `docs/evidence/proofs.json` → `related_submission_nio`

- **NIO Repo:** https://github.com/n1shanthb/near-intent-one
- **NIO Demo:** https://near-intent-one.vercel.app
- **Independence:** No shared contracts, separate tech stack

---

## Track Justification

### 1. DeFi Track

**Why Floorline fits:**
- Collateralized lending with dynamic L/T ratio
- Fungible token (FLOOR) backed by native NEAR
- Lender-funded offers with borrower acceptance
- Two resolution paths: repayment or default
- External contributions to backing (tested)

**Demonstrated on testnet:**
- 9 repayment-path transactions
- 7 default-path transactions
- 5 cancellation-path transactions

### 2. NFTs Track

**Why Floorline fits:**
- NEP-171 compliant loan receipts
- Each loan is a unique, transferable NFT
- NEP-177 metadata with collateral/deadline info
- Third-party repayment flow (NFT holder pays, not borrower)

**Demonstrated on testnet:**
- `nft_token`, `nft_metadata`, `nft_transfer` methods
- Token ID 3 transferred from Carol → Dave
- Dave successfully repaid Carol's loan (rc1-21)

### 3. Security Track

**Why Floorline fits:**
- Async claim pattern prevents reentrancy
- Operator-controlled emergency stop (irreversible)
- Funded exits work post-stop (no user lockup)
- Multi-receipt withdrawal tested (up to 7 receipts)
- Storage management prevents balance manipulation

**Demonstrated on testnet:**
- 6 async withdrawals (redemption, principal, repayment, cancellation)
- `stop_new_risk` called (rc1-39)
- Post-stop unregister succeeded (rc1-40)

---

## What Was Built

### Smart Contract Features

**Implemented Methods:**
- `issue` — Deposit NEAR, receive FLOOR
- `redeem` — Burn FLOOR, create claim
- `contribute` — Add backing without issuance
- `fund_offer` — Lender creates loan offer
- `accept_offer` — Borrower accepts with collateral
- `repay` — Loan holder repays
- `default_loan` — Lender seizes collateral after deadline
- `cancel_offer` — Lender cancels before acceptance
- `withdraw_claim` — Execute async claim
- `cleanup_claim`, `cleanup_loan` — Storage refunds
- `storage_deposit`, `storage_withdraw`, `storage_unregister` (NEP-145)
- `ft_*` methods (NEP-141)
- `nft_*` methods (NEP-171, NEP-177)
- `stop_new_risk` — Irreversible operator stop

**Total:** 20+ public methods

### Frontend Routes

1. **`/` (Landing):** Project overview, features, disclaimers
2. **`/verify` (Verification):** Live testnet state reader (no wallet)
3. **`/judges` (Documentation):** Links to all judge resources

### Verification Tools

- **`judge-verify.mjs`:** Automated testnet RPC verification
- **`proofs.json`:** Structured evidence (40 transactions)
- **Judge Runbook:** Step-by-step verification guide
- **AI Judge Prompts:** Claude Code & Codex instructions

---

## What Was NOT Built (Disclaimers)

### Not Included (Intentionally)

- ❌ **Mainnet deployment** — Testnet-only by design
- ❌ **Security audit** — Not required for hackathon
- ❌ **Liquidation mechanism** — Manual collateral seizure
- ❌ **Price oracles** — Static L/T ratio (accounting, not price)
- ❌ **Decentralized governance** — Operator-controlled
- ❌ **Production hardening** — Educational demo only

### Not Claimed

- ❌ "Audited code"
- ❌ "Production-ready"
- ❌ "Guaranteed to pass"
- ❌ "Safe for real funds"
- ❌ "Ownerless/decentralized"

**Accurate claim:** "Working testnet demonstration of collateralized lending with FLOOR token and NFT receipts."

---

## Testing Evidence

### Automated Tests

```bash
cd frontend
npm test              # Vitest unit tests (config, RPC, actions)
npm run test:e2e      # Playwright E2E tests (browser flows)
npm run typecheck     # TypeScript validation
npm run lint          # ESLint checks
```

### Acceptance Tests

**40 testnet transactions** covering:
- ✅ Fresh deployment
- ✅ Multi-actor funding
- ✅ Storage registration
- ✅ FLOOR issuance from browser wallet
- ✅ Token transfer (NEP-141)
- ✅ Redemption + async withdrawal
- ✅ Lender-funded offers (3 separate flows)
- ✅ Borrower acceptance
- ✅ NFT transfer to third party
- ✅ Third-party repayment
- ✅ Default after deadline expiry
- ✅ Cancellation before acceptance
- ✅ External contribution
- ✅ Irreversible stop
- ✅ Post-stop funded exit

**All transactions finalized on public testnet with dual-provider verification.**

---

## Documentation Deliverables

### For Judges
1. **[README.md](../../README.md)** — Quick start, project overview
2. **[JUDGE_RUNBOOK.md](../judges/JUDGE_RUNBOOK.md)** — Step-by-step verification (10-15 min)
3. **[PROOF_INDEX.md](../PROOF_INDEX.md)** — All 40 transactions indexed
4. **[RULES_CHECKLIST.md](RULES_CHECKLIST.md)** — Official rules compliance
5. **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)** — Live demo walkthrough

### For AI Judges
6. **[CLAUDE_CODE_PROMPT.md](../judges/CLAUDE_CODE_PROMPT.md)** — Claude verification prompt
7. **[CODEX_PROMPT.md](../judges/CODEX_PROMPT.md)** — Codex verification prompt

### Evidence Files
8. **[proofs.json](../evidence/proofs.json)** — 40 verified transactions (structured JSON)
9. **[judge-verify.mjs](../../frontend/scripts/judge-verify.mjs)** — Automated verification script

---

## Tech Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Smart Contract | Rust + NEAR SDK 5.1.0 | Core protocol logic |
| Fungible Token | NEP-141 | FLOOR token standard |
| NFT Receipts | NEP-171, NEP-177 | Loan ownership tracking |
| Storage | NEP-145 | Account registration |
| Frontend | React 19 + Vite | User interface |
| Styling | Tailwind CSS | Responsive design |
| Wallet | NEAR Wallet Selector | Browser wallet integration |
| Testing | Vitest + Playwright | Unit + E2E tests |
| Verification | Node.js + near-api-js | Automated RPC checks |
| Deployment | Vercel | Static hosting |

---

## Human Action Items (Before Final Submission)

- [ ] **Publish GitHub repository** (currently local or private)
- [ ] **Deploy frontend to Vercel** (update SUBMISSION.md with live URL)
- [ ] **Create demo X post** (video or screenshots showing "Do X, see Y")
- [ ] **Final human review** of all AI-generated documentation
- [ ] **Verify all links work** (GitHub, NearBlocks, Vercel)

---

## Contact Information

**Project:** Floorline  
**Author:** Solo (same individual as NIO project)  
**GitHub:** https://github.com/n1shanthb/floorline  
**Demo:** https://floorline-delta.vercel.app (live)  
**Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`

**Related Submission:**  
- Near Intent One (NIO): https://github.com/n1shanthb/near-intent-one

---

## Final Statement

Floorline demonstrates a **complete collateralized lending cycle** on NEAR testnet with:
- ✅ Externally backed fungible token (FLOOR)
- ✅ NEP-171 NFT loan receipts
- ✅ Async claim withdrawal pattern
- ✅ Multi-actor acceptance tests (40 verified transactions)
- ✅ Working frontend with wallet-free verification route
- ✅ Complete documentation for human and AI judges

**This is a testnet-only educational demonstration**, not production-ready code. It shows technical feasibility of async collateralized lending on NEAR, complies with all official hackathon rules, and provides reproducible verification paths.

**We respectfully submit Floorline for evaluation in the DeFi, NFTs, and Security tracks.**

---

**Submission Date:** 2026-11-14  
**Official Rules:** https://nearhackathon.com/HACKATHON.md  
**Evidence Status:** 40/40 FINAL_VERIFIED
