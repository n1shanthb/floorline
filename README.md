# Floorline — Collateralized Lending on NEAR Testnet

**NEAR Hackathon Submission** | **Testnet-Only** | **November 2026**

Floorline is a collateralized lending protocol built on NEAR testnet, demonstrating externally backed token issuance (FLOOR), NFT-receipt loan tracking (NEP-171), and async claim withdrawals. **This is a hackathon demonstration project — testnet only, not audited, not production-ready.**

---

## 🎯 Quick Start (Judge Path)

**Verify deployment and explore the live demo in under 5 minutes:**

### 1. Verify Contract State (Terminal)
```bash
cd frontend
npm ci
npm run judge:verify
```

**What this does:** Automated verification script reads testnet RPC, confirms all 40 acceptance proofs, and validates the stopped state with zero inflight claims.

**Expected output:**
```
✓ Contract: rc1.floorline-g3-20261111-6702ea.testnet
✓ Code hash: 4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
✓ Status: STOPPED (no new risk)
✓ State: L=10.18 NEAR, T=9.0 FLOOR, inflight=0
✓ 40/40 proofs FINAL_VERIFIED
```

### 2. Explore Live Frontend
```bash
npm run dev
# Open http://127.0.0.1:5173
```

**What to try:**
- `/` — Landing page with project overview
- `/verify` — Live testnet state reader (no wallet needed)
- `/judges` — This documentation and verification instructions

**Or visit deployed demo:** https://floorline.vercel.app *(if deployment is live)*

### 3. Review Evidence
- **Proof Index:** [`docs/evidence/proofs.json`](docs/evidence/proofs.json) — 40 verified testnet transactions
- **Transaction Explorer:** Each proof includes NearBlocks link (e.g., [deploy](https://testnet.nearblocks.io/txns/3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c))
- **Rules Compliance:** [`docs/submission/RULES_CHECKLIST.md`](docs/submission/RULES_CHECKLIST.md)

---

## 📋 What Floorline Demonstrates

### Core Features (All Working on Testnet)

1. **FLOOR Token Issuance (NEP-141)**
   - Externally backed fungible token
   - Issue NEAR → receive FLOOR at L/T ratio
   - Redeem FLOOR → async native claim withdrawal

2. **Collateralized Lending**
   - Lenders fund offers (principal, collateral, duration)
   - Borrowers accept offers with FLOOR collateral
   - Two paths: **repayment** (borrower repays) or **default** (lender seizes collateral)

3. **NFT Loan Receipts (NEP-171)**
   - Each loan is an NFT with metadata
   - Transferable ownership (tested with 3-party repayment)
   - Standard-compliant: `nft_token`, `nft_metadata`, `nft_transfer`

4. **Async Claim Pattern**
   - All exits create claims (redemption, loan principal, repayment, cancellation)
   - Two-step: create claim → withdraw claim
   - Storage refund claims for cleanup
   - Tested with 40 finalized receipts including 6 multi-receipt withdrawals

5. **Operator-Controlled Safety**
   - `stop_new_risk()` — irreversible stop (tested)
   - Funded exits still work post-stop
   - Guardian contract: `floorline-g3-20261111-6702ea.testnet`

### Technology Stack
- **Smart Contract:** Rust + NEAR SDK 5.1.0
- **Token Standards:** NEP-141 (fungible), NEP-145 (storage), NEP-171 (NFT), NEP-177 (metadata)
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **Wallet:** NEAR Wallet Selector (My NEAR Wallet integration)
- **RPC:** Dual-provider testnet verification (nearapi + backup)

### What Was Tested

**Complete lifecycle on public testnet:**
1. ✅ Deploy fresh RC1 contract
2. ✅ Fund 5 test actors (Alice, Carol, Dave, Lender, Funmask wallet)
3. ✅ Register 5 storage deposits (NEP-145)
4. ✅ Issue FLOOR from wallet (10 NEAR → 10 FLOOR)
5. ✅ Transfer FLOOR to borrower (3 FLOOR)
6. ✅ Redeem FLOOR + withdraw claim (async pattern)
7. ✅ Lender funds repayment offer
8. ✅ Borrower accepts loan (gets principal, locks 1 FLOOR)
9. ✅ Transfer NFT to third party (Dave)
10. ✅ Dave repays loan (NFT holder pays, not borrower)
11. ✅ Lender withdraws repayment
12. ✅ Default path: fund offer → accept → wait → default → seize collateral
13. ✅ Cancel path: fund offer → cancel → withdraw cancellation claim
14. ✅ External contribution (backing-only, no issuance)
15. ✅ Storage withdrawal (partial unregister)
16. ✅ Irreversible stop (no new risk)
17. ✅ Post-stop funded unregister

**40 verified transactions total**, all finalized with receipt closures.

---

## 🏗️ Repository Structure

```
near-2-mainnet-review/
├── README.md                          # This file
├── docs/
│   ├── evidence/
│   │   └── proofs.json                # 40 verified testnet transactions
│   ├── judges/
│   │   ├── CLAUDE_CODE_PROMPT.md      # Claude Code judge setup
│   │   ├── CODEX_PROMPT.md            # Codex judge setup
│   │   └── JUDGE_RUNBOOK.md           # Step-by-step judge verification
│   ├── submission/
│   │   ├── RULES_CHECKLIST.md         # Official hackathon rules compliance
│   │   ├── SUBMISSION.md              # Formal submission document
│   │   └── DEMO_SCRIPT.md             # Demo walkthrough script
│   └── PROOF_INDEX.md                 # Evidence index with explorer links
├── frontend/
│   ├── src/                           # React + TypeScript UI
│   ├── scripts/
│   │   └── judge-verify.mjs           # Automated verification script
│   ├── public/evidence/proofs.json    # Evidence copy for static hosting
│   └── package.json
├── floorkit/contract/                 # Rust smart contract source
└── mainnet-release/                   # Acceptance test execution artifacts
```

---

## 🔍 Key Facts for Judges

### Network & Deployment
- **Network:** NEAR Testnet **ONLY** (not mainnet)
- **Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`
- **Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- **Status:** STOPPED (irreversible `stop_new_risk` called)
- **Deployment:** Fresh atomic deploy (tx [3Gf1RnQWWy...](https://testnet.nearblocks.io/txns/3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c))

### Final State (Block 277696567)
- **Liquidity (L):** 10.18 NEAR
- **Tokens (T):** 9.0 FLOOR
- **Inflight Claims:** 0 (all settled)
- **Storage Total:** 0.060 NEAR
- **Admission:** 3/128 registered accounts
- **Stopped:** true

### Transaction Evidence
- **40 proofs** in `docs/evidence/proofs.json`
- **All FINAL_VERIFIED** with receipt closures
- **Dual-provider verification** (nearapi.org + backup RPC)
- **Block heights recorded** for before/after state
- **Explorer links** for every transaction

### Compliance (Official Rules)
- ✅ **Testnet-only** (Q-002)
- ✅ **AI tools:** Claude Code & Cursor screen-level only (Q-003)
- ✅ **Solo + disclosed:** 2 independent projects (Floorline + NIO) (Q-015)
- ✅ **Public repo:** https://github.com/n1shanthb/floorline (Q-005)
- ✅ **Demo required:** Working frontend + verification path (Q-006)
- ✅ **Tracks:** DeFi (lending) + NFTs (loan receipts) + Security (async safety) (Q-008)

See [`docs/submission/RULES_CHECKLIST.md`](docs/submission/RULES_CHECKLIST.md) for full compliance evidence.

---

## 📚 Documentation Index

### For Judges
1. **[JUDGE_RUNBOOK.md](docs/judges/JUDGE_RUNBOOK.md)** — Step-by-step verification guide
2. **[PROOF_INDEX.md](docs/PROOF_INDEX.md)** — All 40 transactions with context
3. **[RULES_CHECKLIST.md](docs/submission/RULES_CHECKLIST.md)** — Official rules compliance
4. **[DEMO_SCRIPT.md](docs/submission/DEMO_SCRIPT.md)** — Live demo walkthrough

### For AI Judges
5. **[CLAUDE_CODE_PROMPT.md](docs/judges/CLAUDE_CODE_PROMPT.md)** — Claude Code verification prompt
6. **[CODEX_PROMPT.md](docs/judges/CODEX_PROMPT.md)** — Codex verification prompt

### Submission
7. **[SUBMISSION.md](docs/submission/SUBMISSION.md)** — Formal hackathon submission

---

## 🧪 Testing & Verification

### Automated Verification (Recommended)
```bash
cd frontend
npm ci
npm run judge:verify
```

This script:
- Reads testnet RPC for current contract state
- Validates code hash matches
- Confirms stopped status
- Checks L/T/inflight accounting
- Verifies all 40 proofs exist

### Manual Verification (Alternative)
1. **Check contract exists:**
   ```bash
   near view rc1.floorline-g3-20261111-6702ea.testnet get_state
   ```

2. **Verify code hash:**
   ```bash
   near view-state rc1.floorline-g3-20261111-6702ea.testnet --finality final --utf8 false
   # Look for code_hash: 4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
   ```

3. **Browse transactions:**
   - Open [`docs/evidence/proofs.json`](docs/evidence/proofs.json)
   - Click any `explorer_url` to see finalized receipt on NearBlocks

4. **Run frontend locally:**
   ```bash
   cd frontend
   npm ci
   npm run dev
   # Visit http://127.0.0.1:5173/verify
   ```

### Unit & E2E Tests
```bash
cd frontend
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E tests
npm run typecheck     # TypeScript validation
```

---

## ⚠️ Important Disclaimers

### NOT Production-Ready
- ❌ **No security audit** — this is a hackathon demo
- ❌ **Testnet only** — never deployed to mainnet
- ❌ **Operator-controlled** — not ownerless/decentralized
- ❌ **L/T ratio is accounting** — not guaranteed redemption price
- ❌ **No liquidation mechanism** — collateral seizure is manual
- ❌ **Single guardian** — not a DAO or multisig

### What This Is
✅ **Functional demonstration** of collateralized lending mechanics  
✅ **Standards compliance** (NEP-141, NEP-145, NEP-171, NEP-177)  
✅ **Working testnet deployment** with 40 verified transactions  
✅ **Educational project** showing async claim patterns  

### What This Is NOT
❌ Investment advice or financial product  
❌ Audited or production-ready code  
❌ Guaranteed-safe or bug-free protocol  
❌ Recommendation to use with real funds  

**For hackathon evaluation purposes only.**

---

## 🔗 Links

- **Testnet Contract:** https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet
- **Deploy Transaction:** https://testnet.nearblocks.io/txns/3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c
- **GitHub Repo:** https://github.com/n1shanthb/floorline
- **Live Demo:** https://floorline.vercel.app *(pending deployment)*
- **Related Project (NIO):** https://github.com/n1shanthb/near-intent-one

---

## 📞 Contact & Related Submission

**Solo Author:** Same individual for both projects  
**Second Project (Disclosed):** Near Intent One (NIO) — separate domain (intents vs lending)  
- NIO Repo: https://github.com/n1shanthb/near-intent-one  
- NIO Demo: https://near-intent-one.vercel.app  
- Independence: No shared contracts, different tech stack

See [`docs/evidence/proofs.json`](docs/evidence/proofs.json) → `related_submission_nio` for disclosure.

---

## 📄 License

Hackathon demonstration code. Not licensed for production use.

---

**Built with Claude Code & Cursor for NEAR Hackathon November 2026**  
**Testnet-Only | Not Audited | Educational Purposes**
