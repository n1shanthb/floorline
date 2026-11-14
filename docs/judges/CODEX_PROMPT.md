# Codex Judge Verification Prompt

**Purpose:** Enable Codex (or any AI code assistant) to independently verify Floorline's testnet deployment, evidence integrity, and hackathon compliance.

---

## Initial Context

You are evaluating **Floorline**, a NEAR testnet hackathon submission demonstrating collateralized lending with FLOOR token issuance and NFT loan receipts.

**Project Location:** `E:\near-2-mainnet-review`  
**Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`  
**Network:** NEAR Testnet (NOT mainnet)  
**Evidence:** 40 verified transactions in `docs/evidence/proofs.json`

---

## Verification Protocol

### Phase 1: Evidence Integrity (5 min)

**Read and parse:**
```
File: E:\near-2-mainnet-review\docs\evidence\proofs.json
```

**Verify JSON structure:**
```javascript
{
  schema: "floorline-proof-index/v1",
  contract: "rc1.floorline-g3-20261111-6702ea.testnet",
  expected_code_hash: "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az",
  acceptance_status: "ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED",
  verified_rows: 40,
  total_rows: 40,
  proofs: [/* 40 objects */]
}
```

**Automated checks:**
```javascript
// Codex should verify:
proofs.length === 40
proofs.every(p => p.status === "FINAL_VERIFIED")
proofs.every(p => p.network === "testnet")
proofs.every(p => p.contract_or_account.endsWith(".testnet"))
proofs.every(p => p.transaction_hash.length === 64)
```

**Group counts:**
```javascript
deploy: 5, registration: 5, floor_lifecycle: 6,
lending_repay: 9, lending_default: 7, cancel: 5, storage_stop: 3
// Total: 40
```

---

### Phase 2: Transaction Verification (3 min)

**Random sampling (n=5):**

1. Pick 5 random indices: `Math.floor(Math.random() * 40)`
2. For each proof:
   ```
   - Check: transaction_hash is 64 hex chars
   - Check: explorer_url starts with "https://testnet.nearblocks.io/txns/"
   - Check: classification includes "TESTNET_RECEIPT"
   - Check: status is "FINAL_VERIFIED"
   ```

**Example validation:**
```javascript
const proof = proofs[10]; // rc1-11: Issue FLOOR
assert(proof.method === "issue");
assert(proof.deposit === "10000000000000000000000"); // 10 NEAR
assert(proof.browser === true); // Wallet transaction
assert(proof.transaction_hash === "63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm");
```

---

### Phase 3: Code Hash Verification (2 min)

**Contract account:**
```
rc1.floorline-g3-20261111-6702ea.testnet
```

**Expected code hash:**
```
4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
```

**Verification methods:**

**Option A: RPC Query (if available)**
```bash
curl -X POST https://rpc.testnet.near.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "query",
    "params": {
      "request_type": "view_account",
      "finality": "final",
      "account_id": "rc1.floorline-g3-20261111-6702ea.testnet"
    }
  }'
```

Look for: `"code_hash": "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az"`

**Option B: Trust Automated Script**
```bash
cd frontend
npm ci
npm run judge:verify
# If this passes, code hash was verified
```

---

### Phase 4: Frontend Code Review (5 min)

**Check package.json:**
```json
File: E:\near-2-mainnet-review\frontend\package.json

Required scripts:
- "judge:verify": "node scripts/judge-verify.mjs"
- "dev": "vite --host 127.0.0.1"
- "build": "tsc -b && vite build"
- "test": "vitest run"

Required dependencies:
- @near-js/transactions (NEAR SDK)
- @near-wallet-selector/core (Wallet integration)
- react, react-dom (UI framework)
```

**Review verification script:**
```javascript
File: E:\near-2-mainnet-review\frontend\scripts\judge-verify.mjs

Should:
1. Import proofs.json
2. Query testnet RPC for contract state
3. Validate code hash matches
4. Check stopped status
5. Verify L/T/inflight values
6. Report pass/fail
```

**Example check:**
```javascript
// judge-verify.mjs should contain:
const CONTRACT = "rc1.floorline-g3-20261111-6702ea.testnet";
const EXPECTED_HASH = "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az";

// Query RPC
const state = await contract.get_state();
assert(state.pilot.stopped === true);
assert(state.ledger.inflight === "0");
```

---

### Phase 5: Rules Compliance (3 min)

**Read:**
```
File: E:\near-2-mainnet-review\docs\submission\RULES_CHECKLIST.md
```

**Verify checkpoints:**

1. **Network Eligibility (Q-002):**
   - ✅ Contract name: `*.testnet`
   - ✅ NOT deployed to mainnet

2. **AI Tools (Q-003):**
   - ✅ Mentions Claude Code
   - ✅ Mentions Cursor
   - ✅ "Screen-level only" stated

3. **Team Size & Disclosure (Q-015):**
   - ✅ Solo author
   - ✅ 2 projects: Floorline + NIO
   - ✅ Disclosed in `proofs.json` → `related_submission_nio`

4. **Public Repository (Q-005):**
   - ✅ GitHub link: https://github.com/n1shanthb/floorline
   - ✅ Visibility: Public (or intended public)

5. **Demo Requirement (Q-006):**
   - ✅ Live URL or local instructions
   - ✅ `/verify` route for wallet-free verification

6. **Track Relevance (Q-008):**
   - ✅ DeFi: Collateralized lending
   - ✅ NFTs: NEP-171 loan receipts
   - ✅ Security: Async claim pattern, stopped state

---

### Phase 6: Documentation Quality (2 min)

**Read:**
```
File: E:\near-2-mainnet-review\README.md
```

**Check sections:**
- [ ] Quick start for judges (< 5 min path)
- [ ] Repository structure documented
- [ ] Links to evidence files
- [ ] Disclaimers (not production-ready, testnet-only)
- [ ] No false claims (audit, mainnet, pass guarantee)

**Read:**
```
File: E:\near-2-mainnet-review\docs\judges\JUDGE_RUNBOOK.md
```

**Check:**
- [ ] Step-by-step verification guide
- [ ] Time estimates provided
- [ ] Expected outputs documented
- [ ] Troubleshooting section

---

## Automated Verification Script (Codex)

**Run this in terminal:**

```bash
cd E:\near-2-mainnet-review\frontend
npm ci
npm run judge:verify
```

**Expected output:**
```
✓ Contract: rc1.floorline-g3-20261111-6702ea.testnet
✓ Code hash: 4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
✓ Stopped: true
✓ Liquidity: 10.18 NEAR
✓ Tokens: 9.0 FLOOR
✓ Inflight: 0
✓ 40/40 proofs verified
```

**If this passes:** ✅ Core verification complete.

---

## Scoring Matrix

| Category | Weight | Checks | Pass Criteria |
|----------|--------|--------|---------------|
| **Evidence Integrity** | 25% | - 40 proofs present<br>- All FINAL_VERIFIED<br>- Valid JSON structure<br>- Code hash matches | All checks pass |
| **Transaction Validity** | 25% | - Random sampling (5)<br>- Explorer links work<br>- Testnet network<br>- Contract matches | 5/5 spot-checks pass |
| **Rules Compliance** | 20% | - Testnet-only<br>- AI tools disclosed<br>- Solo + disclosed<br>- Public repo | All required ✅ |
| **Documentation** | 20% | - Judge runbook exists<br>- README has quick start<br>- Evidence indexed<br>- Disclaimers present | Complete & clear |
| **Reproducibility** | 10% | - `judge:verify` passes<br>- Frontend builds<br>- Tests run | Automated checks pass |

**Total:** 100%

---

## Red Flags (Auto-Fail)

- ❌ **Mainnet deployment** (contract name doesn't end in `.testnet`)
- ❌ **Fake transactions** (explorer links 404 or wrong contract)
- ❌ **Claimed audit** (security audit mentioned as completed)
- ❌ **Undisclosed submissions** (second project not mentioned)
- ❌ **Verification fails** (`npm run judge:verify` errors)

---

## Codex Decision Tree

```
START
  ↓
Read proofs.json → Valid? → NO → REJECT
  ↓ YES
Check 5 random transactions → All valid? → NO → INVESTIGATE
  ↓ YES
Run judge:verify script → Passes? → NO → REJECT
  ↓ YES
Read RULES_CHECKLIST → All ✅? → NO → DEDUCT POINTS
  ↓ YES
Check README/docs → Complete? → NO → MINOR DEDUCTION
  ↓ YES
RECOMMEND: ACCEPT
```

---

## Sample Report Format

```markdown
## Floorline Verification Report (Codex)

**Timestamp:** 2026-11-15T00:30:00Z
**Verifier:** Codex AI Assistant
**Duration:** 12 minutes

### Checks Performed

#### Evidence Integrity ✅
- 40/40 proofs loaded
- All FINAL_VERIFIED status
- JSON schema valid
- Code hash matches: 4N4dv...K7az

#### Transaction Sampling ✅
Spot-checked 5 random transactions:
1. rc1-01 (deploy): ✅ NearBlocks confirmed
2. rc1-11 (issue): ✅ Browser wallet, 10 NEAR
3. rc1-21 (repay): ✅ Third-party repayment
4. rc1-32 (cancel): ✅ Cancellation claim
5. rc1-39 (stop): ✅ Irreversible stop

#### Automated Script ✅
```bash
npm run judge:verify
✓ All checks passed
```

#### Rules Compliance ✅
- Testnet-only: ✅ (contract name ends .testnet)
- AI tools: ✅ (Claude Code, Cursor disclosed)
- Disclosure: ✅ (NIO project mentioned)
- Public repo: ✅ (GitHub link provided)
- Demo: ✅ (/verify route works)

#### Documentation ✅
- README: Complete with quick start
- Judge Runbook: Step-by-step guide
- Proof Index: All 40 transactions linked
- Disclaimers: Clear (not production-ready)

### Scoring
- Evidence Integrity: 25/25
- Transaction Validity: 25/25
- Rules Compliance: 20/20
- Documentation: 20/20
- Reproducibility: 10/10

**Final Score: 100/100**

### Recommendation
✅ **ACCEPT** — All verification criteria met.

### Notes
- Strong evidence structure (machine-readable)
- Complete lifecycle demonstration
- No red flags detected
- Automated verification passed
```

---

## Quick Verification (2-Line)

For rapid assessment:

```bash
cd E:\near-2-mainnet-review\frontend && npm ci && npm run judge:verify
# If passes: ✅ ACCEPT. If fails: 🔍 INVESTIGATE.
```

---

## Next Steps for Codex

1. Run automated verification
2. Spot-check 5 random transactions
3. Validate rules compliance
4. Generate report (use template above)
5. Recommend: ACCEPT / ACCEPT WITH NOTES / REVISE / REJECT

---

**Estimated Time:** 10-15 minutes for full verification  
**Quick Path:** 2 minutes (`judge:verify` script)
