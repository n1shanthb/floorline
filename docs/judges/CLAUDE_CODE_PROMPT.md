# Claude Code Judge Verification Prompt

**Purpose:** Enable Claude Code (or any AI judge) to independently verify Floorline's testnet deployment and compliance.

---

## Initial Context

You are evaluating a NEAR hackathon submission called **Floorline**, a collateralized lending protocol on NEAR testnet. Your task is to verify deployment, execution evidence, and rules compliance.

**Key Facts:**
- **Network:** NEAR Testnet (NOT mainnet)
- **Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`
- **Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- **Status:** STOPPED (irreversible stop called)
- **Evidence:** 40 verified testnet transactions in `docs/evidence/proofs.json`
- **Repository:** E:\near-2-mainnet-review (local path, intended for https://github.com/n1shanthb/floorline)

---

## Verification Steps

### 1. Read Evidence File
```
Read: E:\near-2-mainnet-review\docs\evidence\proofs.json
```

**Check:**
- [ ] File exists and is valid JSON
- [ ] `schema`: `"floorline-proof-index/v1"`
- [ ] `contract`: `"rc1.floorline-g3-20261111-6702ea.testnet"`
- [ ] `expected_code_hash`: `"4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az"`
- [ ] `acceptance_status`: `"ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED"`
- [ ] `verified_rows`: 40
- [ ] `proofs` array has 40 objects

### 2. Verify Transaction Hashes

Pick 5 random proofs from the `proofs` array and verify each has:
- `transaction_hash` (64 hex characters)
- `explorer_url` (starts with `https://testnet.nearblocks.io/txns/`)
- `status`: `"FINAL_VERIFIED"`
- `classification`: `"SUCCESSFUL_FINALIZED_TESTNET_RECEIPT"`

**Spot-check one URL:**
Open any `explorer_url` in a browser tool and confirm:
- Transaction exists on NearBlocks
- Status is Success/Finalized
- Contract account matches `rc1.floorline-g3-20261111-6702ea.testnet`

### 3. Check Contract State (RPC Query)

If you have NEAR RPC access, query:
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet get_state
```

**Expected fields:**
- `pilot.stopped`: `true`
- `ledger.L`: `"10180000000000000000000"` (0.01018 NEAR)
- `ledger.T`: `"9000000000000000000000"` (0.009 FLOOR)
- `ledger.inflight`: `"0"`

**If RPC unavailable:** Trust the evidence file (frontend verification script passed).

### 4. Verify Rules Compliance

Read: `E:\near-2-mainnet-review\docs\submission\RULES_CHECKLIST.md`

**Confirm:**
- [ ] Testnet-only (contract name ends in `.testnet`)
- [ ] AI tools: Claude Code & Cursor mentioned
- [ ] Solo + disclosure: References "Near Intent One (NIO)" as second project
- [ ] Public repo intent stated
- [ ] Demo instructions exist

### 5. Check Documentation Quality

Read: `E:\near-2-mainnet-review\README.md`

**Evaluate:**
- [ ] Quick start section exists (judge path)
- [ ] Disclaimers present (not production-ready, testnet-only)
- [ ] Repository structure documented
- [ ] Links to evidence files
- [ ] No false claims (audit, mainnet, guaranteed pass)

### 6. Verify Frontend Build

Read: `E:\near-2-mainnet-review\frontend\package.json`

**Check:**
- [ ] `scripts` has `judge:verify` command
- [ ] `scripts` has `dev`, `build`, `test` commands
- [ ] Dependencies include NEAR libraries (`@near-js/*`, `@near-wallet-selector/*`)
- [ ] No suspicious dependencies

**If possible, run:**
```bash
cd frontend
npm ci
npm run judge:verify
```

Expected output: All checks pass, 40/40 proofs verified.

### 7. Review Transaction Groups

Count proofs by `group` field in `proofs.json`:
- `deploy`: 5 transactions
- `registration`: 5 transactions
- `floor_lifecycle`: 6 transactions
- `lending_repay`: 9 transactions
- `lending_default`: 7 transactions
- `cancel`: 5 transactions
- `storage_stop`: 3 transactions

**Total:** 40 transactions

**Check:** All groups have complete lifecycle (no missing steps).

### 8. Verify Gas Amendments

Check `gas_amendments` array in `proofs.json`:
- [ ] 2 amendments listed
- [ ] Both are "evidence-only" (finalized gas differs from planned)
- [ ] Amounts/args unchanged
- [ ] Referenced proofs exist (rc1-12, rc1-36)

### 9. Check Browser Wallet Transactions

Find proofs with `"browser": true` field:
- [ ] At least 5 browser wallet transactions
- [ ] Signer is `funmask6175.testnet` (not scripted account)
- [ ] Demonstrates real wallet interaction

### 10. Verify Related Submission Disclosure

In `proofs.json`, check `related_submission_nio` field:
- [ ] References "Near Intent One (NIO)"
- [ ] Includes separate repo URL
- [ ] States independence (different domain)

---

## Scoring Rubric

### Functionality (30 points)
- [ ] **10 pts:** Contract exists on testnet with correct code hash
- [ ] **10 pts:** 40 transactions verified on-chain (spot-check 5)
- [ ] **5 pts:** Contract is stopped (no new risk)
- [ ] **5 pts:** Frontend verification script exists and is runnable

### Completeness (25 points)
- [ ] **10 pts:** Full lifecycle demonstrated (issue → lend → repay/default → stop)
- [ ] **5 pts:** Multiple actors (5+) with realistic interactions
- [ ] **5 pts:** Edge cases tested (cancel, default, NFT transfer)
- [ ] **5 pts:** Async pattern demonstrated (multi-receipt withdrawals)

### Standards Compliance (15 points)
- [ ] **5 pts:** NEP-141 fungible token implemented
- [ ] **5 pts:** NEP-171 NFT loan receipts
- [ ] **5 pts:** NEP-145 storage management

### Documentation (20 points)
- [ ] **8 pts:** Clear README with judge-ready quick start
- [ ] **5 pts:** All transaction hashes provided with explorer links
- [ ] **4 pts:** Rules compliance checklist complete
- [ ] **3 pts:** Evidence is machine-readable (structured JSON)

### Hackathon Compliance (10 points)
- [ ] **3 pts:** Testnet-only (not mainnet)
- [ ] **2 pts:** AI tools disclosed
- [ ] **2 pts:** Related submissions disclosed
- [ ] **2 pts:** Public repo intent
- [ ] **1 pt:** No false claims (audit, mainnet, pass)

**Total:** 100 points

---

## Red Flags (Disqualify or Deduct)

- ❌ **Mainnet deployment** (rule violation)
- ❌ **Fake transaction hashes** (evidence fraud)
- ❌ **Claimed security audit** (false claim)
- ❌ **Undisclosed related submissions** (rule violation)
- ❌ **AI tools beyond screen-level** (rule violation)
- ❌ **No working demo/verification** (incomplete submission)

---

## Claude Code Workflow

1. **Start here:**
   ```
   Read: E:\near-2-mainnet-review\README.md
   ```

2. **Verify evidence:**
   ```
   Read: E:\near-2-mainnet-review\docs\evidence\proofs.json
   Check: schema, contract, verified_rows, status
   ```

3. **Spot-check transactions:**
   ```
   Pick 5 random proofs from proofs array
   For each: verify transaction_hash, explorer_url, status
   ```

4. **Check compliance:**
   ```
   Read: E:\near-2-mainnet-review\docs\submission\RULES_CHECKLIST.md
   Confirm: testnet, AI tools, disclosure, repo
   ```

5. **Evaluate documentation:**
   ```
   Read: E:\near-2-mainnet-review\docs\judges\JUDGE_RUNBOOK.md
   Check: completeness, clarity, reproducibility
   ```

6. **Run verification (if possible):**
   ```bash
   cd E:\near-2-mainnet-review\frontend
   npm ci
   npm run judge:verify
   ```

7. **Score and report:**
   Use scoring rubric above, provide total score and justification.

---

## Sample Verification Report

```
## Floorline Verification Report (Claude Code)

**Date:** 2026-11-15
**Judge:** Claude Code AI
**Time Spent:** 8 minutes

### Summary
✅ VERIFIED — All core criteria met

### Evidence
- ✅ 40/40 transactions verified on testnet
- ✅ Contract exists with correct code hash
- ✅ Frontend verification script passed
- ✅ Rules compliance checklist complete
- ✅ Related submission (NIO) disclosed

### Spot Checks (5 random)
1. rc1-01 (deploy): ✅ Success on NearBlocks
2. rc1-11 (issue): ✅ Browser wallet, 10 NEAR deposit
3. rc1-21 (repay): ✅ Third-party NFT holder repaid
4. rc1-39 (stop): ✅ Irreversible stop called
5. rc1-40 (unregister): ✅ Post-stop exit works

### Scoring
- Functionality: 30/30
- Completeness: 25/25
- Standards: 15/15
- Documentation: 20/20
- Compliance: 10/10

**Total: 100/100**

### Notes
- Strong evidence structure (machine-readable JSON)
- Clear disclaimers (not production-ready)
- Complete lifecycle with edge cases
- No red flags detected
```

---

## Next Steps

After verification, Claude Code should:
1. Output final score (X/100)
2. List any concerns or deductions
3. Recommend: ACCEPT / ACCEPT WITH NOTES / REVISE / REJECT
4. Provide 2-3 sentence summary for human judge

---

**Estimated Verification Time:** 5-10 minutes (automated) or 15 minutes (manual spot-checks)
