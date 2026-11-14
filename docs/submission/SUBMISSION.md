# Floorline: NEAR Hackathon Submission

**Collateralized Lending with Async Hardening on NEAR Testnet**

---

## Project Summary

**Floorline** is a testnet-only collateralized lending protocol featuring:
- **FLOOR token** (NEP-141): Backed by native NEAR with 20% redemption tax
- **Loan NFTs** (NEP-171): Transferable loan receipt records
- **Async claims:** Two-step withdrawal pattern preventing cross-contract reentrancy
- **Guardian-operated:** Simulated council for testnet demonstration
- **Permanently stopped:** RC1 stopped after acceptance testing (NEW RISK)

**Network:** NEAR TESTNET ONLY  
**Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`  
**Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`  
**Final State:** L=10.18 NEAR, T=9.0 FLOOR, stopped=true

---

## Track Eligibility

Floorline qualifies for **three tracks:**

### 1. DeFi
- **FLOOR Token:** NEP-141 fungible token backed by native NEAR
- **Collateralized Lending:** Borrowers post FLOOR collateral, receive NEAR loans
- **Redemption Mechanism:** FLOOR → NEAR with 20% tax (tax_bps=2000)
- **L/T Accounting:** Ledger tracks backing ratio (L=10.18, T=9.0 → ratio ~1.131)

### 2. NFTs
- **Loan Receipts:** Each loan is a NEP-171 NFT (token_id = loan_id)
- **Transferable:** NFT holder can repay and recover collateral
- **Metadata:** NEP-177 compliant, includes loan terms and collateral
- **Ownership Proof:** rc1-20 demonstrates NFT transfer (carol → dave)

### 3. Security
- **Async Claims:** All outbound transfers use two-step claim pattern
- **Reentrancy Prevention:** No immediate cross-contract calls with value
- **Guardian Stop:** Irreversible `stop_new_risk` halts new operations
- **Funded Exits:** Users can still withdraw claims after stop

---

## Live Demo

### Demo URL
**(live demo URL recorded after deploy)**

**Alternative (if not deployed):** Local dev server  
```bash
cd frontend
npm ci
npm run dev
# Open http://127.0.0.1:5173
```

### Verification Route
**URL:** (demo URL)/verify  
**Purpose:** Automated on-chain state and proof verification  
**Features:**
- Fetches contract state via RPC
- Displays all 40 proof transactions
- Links to NEAR testnet block explorer
- Shows final L/T/stopped status

---

## Demo X Post

**NEED HUMAN:** Author must create and post demo on X (Twitter)

**Suggested Content:**
```
🚀 Floorline hackathon submission is live!

✅ 40 acceptance tests on NEAR testnet
✅ NEP-141 FLOOR token + NEP-171 loan NFTs
✅ Async claim pattern for security
✅ RC1 stopped after testing (NEW RISK declared)

🔍 Verify: [demo URL]/verify
📦 Code: [repo URL]

#NEARHackathon #DeFi #NFTs #Security
```

**X Post URL:** NEED HUMAN — record here after posting

---

## Repository

**Intended Public Repo:** NEED HUMAN — provide GitHub URL  
**Local Path (for review):** E:/near-2-mainnet-review  
**License:** NEED HUMAN — specify (e.g., MIT, Apache-2.0)

---

## Testnet Evidence

### Contract Information
- **Contract ID:** `rc1.floorline-g3-20261111-6702ea.testnet`
- **Network:** NEAR TESTNET
- **Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- **Block Height (final):** 277696567
- **Timestamp:** 2024-11-14 ~15:30 UTC

### Acceptance Testing
- **Total Tests:** 40
- **Status:** ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED
- **Verification:** All transactions finalized, explorer-verifiable
- **Proof File:** `docs/evidence/proofs.json` (2146 lines)

### Final On-Chain State
- **L (Backing NEAR):** 10,180,000,000,000,000,000,000 yoctoNEAR (10.18 NEAR)
- **T (FLOOR Supply):** 9,000,000,000,000,000,000,000 yoctoFLOOR (9.0 FLOOR)
- **Inflight Claims:** 0
- **Storage Total:** 60,000,000,000,000,000,000,000 yoctoNEAR (0.060 NEAR)
- **Admission:** 3 occupied slots / 128 capacity
- **Stopped:** true (irreversible, no new risk)

---

## Standards Compliance

### NEP-141: Fungible Token (FLOOR)
**Methods Implemented:**
- `ft_transfer` ✅
- `ft_balance_of` ✅
- `ft_total_supply` ✅
- `ft_metadata` ✅

**Evidence:**
- Issue proof: rc1-11 (10 FLOOR minted)
- Transfer proof: rc1-12 (3 FLOOR to borrower)
- Return proof: rc1-37 (1 FLOOR transferred back)

### NEP-171: Non-Fungible Token (Loan NFTs)
**Methods Implemented:**
- `nft_token` ✅
- `nft_transfer` ✅
- `nft_tokens_for_owner` ✅
- `nft_metadata` ✅ (NEP-177)

**Evidence:**
- Transfer proof: rc1-20 (NFT loan_id=3 from carol to dave)
- Demonstrates: Loan ownership is transferable via NFT

### NEP-145: Storage Management
**Methods Implemented:**
- `storage_deposit` ✅
- `storage_withdraw` ✅
- `storage_unregister` ✅
- `storage_balance_of` ✅

**Evidence:**
- Registration proofs: rc1-06 through rc1-10 (5 users)
- Withdrawal proof: rc1-38 (1 NEAR storage withdrawal)
- Unregister proof: rc1-40 (post-stop funded unregister)

---

## Key Features Demonstrated

### 1. Full Loan Lifecycle (Repay Path)
**Proofs:** rc1-16 through rc1-24

- Lender funds offer (2 NEAR principal, 1 FLOOR collateral)
- Borrower accepts loan
- Borrower withdraws principal via async claim
- NFT transferred to third party (dave)
- Dave repays loan (2.2 NEAR)
- Lender withdraws repayment via async claim
- All records cleaned up

**Key Insight:** NFT holder can repay, not just original borrower

### 2. Default Path
**Proofs:** rc1-25 through rc1-30

- Lender funds offer (120-second duration)
- Borrower accepts, withdraws principal
- Borrower intentionally does NOT repay
- Guardian triggers default after duration expires
- Lender receives collateral FLOOR

**Key Insight:** Duration enforcement demonstrated

### 3. Cancellation Path
**Proofs:** rc1-31 through rc1-35

- Lender funds offer
- Lender cancels before acceptance
- Lender withdraws principal via async claim

**Key Insight:** Pre-acceptance cancellation works

### 4. FLOOR Lifecycle
**Proofs:** rc1-11 (issue), rc1-13 (redeem), rc1-36 (contribute)

- Issue: 10 NEAR → 10 FLOOR (1:1 initial)
- Redeem: 1 FLOOR → 0.82 NEAR (20% tax, L/T ratio applied)
- Contribute: 1 NEAR added to backing (no tokens issued)

**Key Insight:** L/T ratio affects redemption, tax applies

### 5. Irreversible Stop
**Proof:** rc1-39

- Guardian calls `stop_new_risk`
- Contract enters stopped state (irreversible)
- No new loans, issuances, or registrations allowed
- Existing funded exits still work (rc1-40 proves this)

**Key Insight:** Safety mechanism for testnet experiment end

---

## Browser Integration Evidence

**7 proofs executed via browser UI:**
- rc1-10: Register Funmask wallet holder
- rc1-11: FLOOR issuance
- rc1-12: FLOOR transfer to borrower
- rc1-13: FLOOR redemption
- rc1-14: Redemption claim withdrawal
- rc1-36: External contribution

**Demonstrates:** Full wallet selector integration (NEAR Wallet Selector)

---

## Gas Amendments (Evidence-Only)

Two steps were amended after initial testing revealed conservative over-allocation:

| Step ID | Planned Gas | Finalized Gas | Evidence File |
|---------|-------------|---------------|---------------|
| `collateral_to_borrower` | 110 Tgas | 30 Tgas | `COLLATERAL_GAS_AMENDMENT.json` |
| `contribute` | 110 Tgas | 30 Tgas | `CONTRIBUTE_GAS_AMENDMENT.json` |

**Note:** Amounts and arguments unchanged; transactions succeeded with 30 Tgas

---

## Related Submission Disclosure

Per hackathon rules (max 2 independent projects per person), the same author submitted:

### Near Intent One (NIO)
- **Repo:** https://github.com/n1shanthb/near-intent-one
- **Demo:** https://near-intent-one.vercel.app
- **Verify:** https://near-intent-one.vercel.app/verify
- **Domain:** Intent settlement (not lending)
- **Independence:** Separate repo, contracts, and domain

**Disclosure Location:** `docs/evidence/proofs.json` → `related_submission_nio`

---

## AI Tools Declaration

Per hackathon rules, AI assistance limited to:
- **Claude Code:** Screen-level guidance and code generation
- **Cursor (Codex):** Editor-level assistance

**Human Review:** All AI outputs reviewed and approved by human author before commit

---

## Frontend Technology

### Tech Stack
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Wallet:** NEAR Wallet Selector (My NEAR Wallet)
- **RPC:** Direct NEAR testnet RPC calls (JSON-RPC)
- **UI:** Radix UI primitives + custom styling

### Working Commands
```bash
cd frontend
npm ci                 # Install dependencies
npm run typecheck      # TypeScript validation
npm test               # Run unit tests
npm run build          # Production build
npm run dev            # Local dev server (http://127.0.0.1:5173)
```

### Routes
- `/` — Landing page
- `/issue` — Mint FLOOR tokens
- `/redeem` — Burn FLOOR for NEAR
- `/borrow` — Accept loan offers
- `/lend` — Fund loan offers
- `/verify` — Automated verification dashboard

---

## Safety Disclaimers

### ⚠️ Testnet Only
Floorline is **NOT deployed to mainnet**. This is a hackathon demonstration project. Do not use for production.

### ⚠️ RC1 Stopped
The RC1 contract is **permanently stopped** (`stopped: true`). No new loans, issuances, or storage registrations are allowed. This was an intentional end to the testnet experiment (NEW RISK declared).

### ⚠️ L/T is Not Redemption Price
The L/T ratio (10.18/9.0 ≈ 1.131) is an **accounting metric**, not a guaranteed redemption price. Redemptions incur 20% tax and are subject to available backing.

### ⚠️ Simulated Governance
The "guardian" is an **operator-controlled simulated council**, not independent human voters or a DAO. This is for testnet demonstration only.

### ⚠️ No Audit
This contract has **NOT been audited** by a professional security firm. It is experimental hackathon code.

---

## How to Verify

### Automated (Recommended)
**Visit:** (demo URL)/verify  
**Or run locally:**
```bash
cd frontend
npm ci
npm run judge:verify
```

### Manual (Block Explorer)
1. Visit https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet
2. Check "Contract" tab → verify code hash
3. Browse transaction history → spot-check proofs

### Manual (RPC Query)
```bash
near view-state rc1.floorline-g3-20261111-6702ea.testnet --finality final --networkId testnet
near view rc1.floorline-g3-20261111-6702ea.testnet get_state --finality final --networkId testnet
```

### Deep Verification
See `docs/judges/JUDGE_RUNBOOK.md` for three verification paths:
- **FAST (60s):** Browser-only spot-checks
- **FULL (5-10m):** Local tests + RPC queries
- **DEEP (custom):** WASM inspection + code review

---

## Questions & Contact

**Email:** NEED HUMAN — provide contact email  
**NEAR Payout Account:** NEED HUMAN — provide testnet or mainnet account for prize payout  
**X (Twitter):** NEED HUMAN — provide handle  

**Documentation:**
- Proof Index: `docs/PROOF_INDEX.md`
- Judge Runbook: `docs/judges/JUDGE_RUNBOOK.md`
- Rules Checklist: `docs/submission/RULES_CHECKLIST.md`

---

## Acknowledgments

**Built With:**
- NEAR Protocol (Rust SDK)
- React + TypeScript
- NEAR Wallet Selector
- Radix UI
- Vite

**AI Assistants:**
- Claude Code (Anthropic)
- Cursor (Anysphere)

**Inspiration:**
- MakerDAO/DAI (collateralized stablecoin model)
- Compound Finance (lending primitives)
- NEAR core standards (NEP-141, NEP-171, NEP-145)

---

**Submission Date:** 2026-11-14  
**Deadline:** 2026-11-14T23:59:00Z  
**Status:** ✅ SUBMITTED (pending human fields above)

---

**All claims are verifiable on NEAR testnet. No trust required.**
