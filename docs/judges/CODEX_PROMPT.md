# Codex Verification Prompt

**Stand-Alone Prompt for Codex Judge**

---

## Instructions to Judge

This is a complete, self-contained prompt for Codex (Cursor) to verify the Floorline hackathon submission. **Copy this entire file** into a new Codex (Cursor) chat session. Do not use this prompt in Claude Code or any other tool.

---

## Your Task

You are evaluating a NEAR hackathon submission for **Floorline**, a testnet-only collateralized lending protocol. Your goal is to classify each submission claim as:

- **PROVEN ON-CHAIN:** Verified via RPC query or block explorer
- **LOCALLY VERIFIED:** Verified via local code/test execution
- **STATICALLY VERIFIED:** Verified via code inspection (no execution)
- **UNVERIFIED:** Cannot be verified without additional steps (note reason)
- **FALSE:** Claim is demonstrably false
- **N/A:** Claim is not applicable or out of scope

**DO NOT:**
- Write to any files (read-only verification)
- Deploy any contracts
- Execute any transactions
- Modify contract state
- Read or expose secrets/private keys

**DO:**
- Inspect all code files
- Read evidence files (proofs.json, README, etc.)
- Run read-only RPC queries
- Execute local test suites (npm test, typecheck, build)
- Use block explorer to verify transactions

---

## Submission Claims (Classify Each)

| # | Claim | Classification | Evidence |
|---|-------|----------------|----------|
| 1 | Contract `rc1.floorline-g3-20261111-6702ea.testnet` exists on NEAR testnet | | |
| 2 | Code hash is `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az` | | |
| 3 | 40 acceptance tests executed and finalized | | |
| 4 | All 40 transactions have status `FINAL_VERIFIED` | | |
| 5 | Final ledger L=10.18 NEAR, T=9.0 FLOOR | | |
| 6 | Contract is permanently stopped (`stopped: true`) | | |
| 7 | Admission: 3 occupied slots of 128 capacity | | |
| 8 | Gas amendments documented for 2 steps (collateral_to_borrower, contribute) | | |
| 9 | 7 proofs executed via browser UI (`browser: true`) | | |
| 10 | NIO disclosure included in `related_submission_nio` | | |
| 11 | FLOOR token implements NEP-141 (ft_transfer, ft_balance_of, ft_total_supply) | | |
| 12 | Loan NFTs implement NEP-171 (nft_token, nft_transfer, nft_tokens_for_owner) | | |
| 13 | Storage implements NEP-145 (storage_deposit, storage_withdraw, storage_balance_of) | | |
| 14 | Frontend builds without errors (`npm run build`) | | |
| 15 | Frontend tests pass (`npm test`) | | |
| 16 | Frontend typechecks pass (`npm run typecheck`) | | |
| 17 | All transaction hashes link to valid testnet explorer pages | | |
| 18 | RC1 is NOT deployed to mainnet | | |
| 19 | Floorline and NIO are independent projects (separate repos, domains) | | |
| 20 | AI tools used: Claude Code and Cursor only | | |

---

## Classification Guide

### PROVEN ON-CHAIN
Use when you can verify via:
- `near view-state <contract>` output
- `near view <contract> <method>` output
- NEAR testnet block explorer (nearblocks.io)
- RPC query results

**Example:**  
Claim: "Contract exists on testnet"  
Evidence: `near view-state rc1.floorline-g3-20261111-6702ea.testnet` returns account data

### LOCALLY VERIFIED
Use when you can verify via:
- Running local test suite (`npm test`)
- Building the project (`npm run build`)
- Executing local scripts
- Inspecting local output files

**Example:**  
Claim: "Frontend builds without errors"  
Evidence: `npm run build` succeeded, dist/ folder created

### STATICALLY VERIFIED
Use when you can verify via:
- Reading code files
- Inspecting JSON evidence files
- Checking file structure
- Reviewing documentation

**Example:**  
Claim: "NIO disclosure included"  
Evidence: `proofs.json` contains `related_submission_nio` object

### UNVERIFIED
Use when verification requires:
- Access to external services (e.g., X/Twitter posts)
- Human review (e.g., video demo)
- Information not available in repo

**Example:**  
Claim: "Demo X post published"  
Evidence: Not verifiable from repo alone; requires X access

### FALSE
Use when claim is demonstrably incorrect via:
- RPC query showing different value
- Code inspection contradicting claim
- Evidence file showing opposite

**Example:**  
Claim: "Contract deployed to mainnet"  
Evidence: Contract only exists on testnet; mainnet query returns "Account not found"

### N/A
Use when claim is:
- Out of scope for verification
- Not relevant to hackathon submission
- Opinion-based (e.g., "good UX")

---

## Verification Steps (Execute These)

### Step 1: Read Evidence File

**File:** `docs/evidence/proofs.json`

**Extract:**
- `contract`: Should be `rc1.floorline-g3-20261111-6702ea.testnet`
- `expected_code_hash`: Should be `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- `verified_rows`: Should be 40
- `total_rows`: Should be 40
- `acceptance_status`: Should be `ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED`
- `final_state.pilot.stopped`: Should be `true`
- `final_state.ledger.L`: Should be `"10180000000000000000000"`
- `final_state.ledger.T`: Should be `"9000000000000000000000"`
- `final_state.admission.occupied`: Should be 3
- `gas_amendments`: Should be array of length 2
- `related_submission_nio`: Should exist
- Count `proofs` array where `browser: true`: Should be 7

**Classification:** Use STATICALLY VERIFIED for all items extracted from proofs.json

### Step 2: On-Chain State Verification (If `near` CLI Available)

**Command:**
```bash
near view-state rc1.floorline-g3-20261111-6702ea.testnet --finality final --networkId testnet
```

**Expected:**
- Account exists
- `account_code_hash`: `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`

**Classification:** If successful → PROVEN ON-CHAIN  
If `near` CLI not available → Mark as UNVERIFIED (requires near CLI)

**Command:**
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet get_state --finality final --networkId testnet
```

**Expected:** JSON with `pilot.stopped: true`, `ledger.L`, `ledger.T`, etc.

**Classification:** If successful → PROVEN ON-CHAIN

### Step 3: Mainnet Non-Deployment Verification

**Command (should FAIL):**
```bash
near view-state rc1.floorline-g3-20261111-6702ea.mainnet --finality final --networkId mainnet
```

**Expected:** Error: "Account not found" or similar

**Classification:** If account not found on mainnet → PROVEN ON-CHAIN (claim is true)

### Step 4: Frontend Build Verification

**Navigate:**
```bash
cd frontend
```

**Install:**
```bash
npm ci
```

**Typecheck:**
```bash
npm run typecheck
```

**Expected:** No TypeScript errors

**Classification:** If passes → LOCALLY VERIFIED

**Test:**
```bash
npm test
```

**Expected:** All tests pass

**Classification:** If passes → LOCALLY VERIFIED

**Build:**
```bash
npm run build
```

**Expected:** dist/ folder created, no errors

**Classification:** If passes → LOCALLY VERIFIED

### Step 5: Code Inspection (NEP Standards)

**Inspect:** `floorkit/contract/src/lib.rs` (or wherever contract source lives)

**Look for:**
- NEP-141 methods: `ft_transfer`, `ft_balance_of`, `ft_total_supply`, `ft_metadata`
- NEP-171 methods: `nft_token`, `nft_transfer`, `nft_tokens_for_owner`, `nft_metadata`
- NEP-145 methods: `storage_deposit`, `storage_withdraw`, `storage_balance_of`, `storage_unregister`

**Classification:** If found in code → STATICALLY VERIFIED

### Step 6: Explorer Link Verification (Sample)

**Pick 5 random tx hashes from `proofs.json` → `proofs` array**

**Visit:**
```
https://testnet.nearblocks.io/txns/<TRANSACTION_HASH>
```

**Expected:** Each page shows:
- Transaction succeeded
- Status: "Success" or similar
- Block finalized

**Classification:** If 5/5 succeeded → PROVEN ON-CHAIN (for "all tx hashes valid" claim)

### Step 7: NIO Independence Verification

**Check:**
- Floorline repo path: E:/near-2-mainnet-review
- NIO repo: https://github.com/n1shanthb/near-intent-one (different URL)
- Floorline contract: rc1.floorline-g3-20261111-6702ea.testnet
- NIO contracts: (separate, if any)

**Classification:** If repos are separate → STATICALLY VERIFIED

---

## Completed Classification Table

Fill this table with your classifications and evidence:

| # | Claim | Classification | Evidence |
|---|-------|----------------|----------|
| 1 | Contract `rc1.floorline...` exists on testnet | | |
| 2 | Code hash is `4N4dvu...` | | |
| 3 | 40 acceptance tests executed | | |
| 4 | All 40 have status `FINAL_VERIFIED` | | |
| 5 | Final L=10.18 NEAR, T=9.0 FLOOR | | |
| 6 | Contract stopped (`stopped: true`) | | |
| 7 | Admission 3/128 slots | | |
| 8 | 2 gas amendments documented | | |
| 9 | 7 browser UI proofs | | |
| 10 | NIO disclosure included | | |
| 11 | NEP-141 compliance | | |
| 12 | NEP-171 compliance | | |
| 13 | NEP-145 compliance | | |
| 14 | Frontend builds | | |
| 15 | Frontend tests pass | | |
| 16 | Frontend typechecks pass | | |
| 17 | Tx hashes link to explorer | | |
| 18 | NOT on mainnet | | |
| 19 | Floorline & NIO independent | | |
| 20 | AI tools: Claude Code + Cursor | | |

---

## Example Completed Row

| # | Claim | Classification | Evidence |
|---|-------|----------------|----------|
| 1 | Contract exists on testnet | PROVEN ON-CHAIN | `near view-state` returned account data; code_hash=4N4dvu... |

---

## Summary Statistics

After completing the table, count:

- **PROVEN ON-CHAIN:** (count)
- **LOCALLY VERIFIED:** (count)
- **STATICALLY VERIFIED:** (count)
- **UNVERIFIED:** (count)
- **FALSE:** (count)
- **N/A:** (count)

**Overall Verdict:** [PASS / FAIL / PARTIAL]

**Criteria for PASS:**
- At least 15/20 claims are PROVEN ON-CHAIN or LOCALLY VERIFIED
- 0 FALSE claims
- All critical claims (contract exists, code hash, final state, stopped) are PROVEN ON-CHAIN

**Criteria for FAIL:**
- Any FALSE claims
- Less than 10/20 claims verified

**Criteria for PARTIAL:**
- Between 10-14 claims verified
- No FALSE claims
- Some UNVERIFIED claims due to tooling limitations

---

## Safety Reminder

**DO NOT:**
- Call any state-changing methods
- Sign or broadcast transactions
- Deploy contracts
- Expose private keys
- Write to files

**Read-only operations are safe:**
- `near view-state`
- `near view <contract> <method>`
- Reading local files
- Running `npm test` / `npm run build`

---

## Codex Judge: Start Verification

1. Copy this prompt into a fresh Codex (Cursor) chat
2. Execute all verification steps
3. Fill out the classification table
4. Count summary statistics
5. Provide overall PASS/FAIL/PARTIAL verdict

**Repository Path:** `E:\near-2-mainnet-review`

**Good luck!**
