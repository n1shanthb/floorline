# Floorline Demo Script

**Duration:** 5-10 minutes  
**Format:** Live walkthrough or recorded screencast  
**Audience:** Hackathon judges or interested developers

---

## Setup (Before Demo)

### Prerequisites
```bash
# Terminal in E:\near-2-mainnet-review\frontend
npm ci
npm run dev
# Browser open to http://127.0.0.1:5173
```

**Optional:** NEAR testnet wallet with small balance (~0.5 NEAR) for live interaction.

---

## Demo Flow (No Wallet Required)

### Act 1: Project Overview (2 min)

**Navigate to:** `http://127.0.0.1:5173`

**What to show:**
> "Floorline is a collateralized lending protocol on NEAR testnet. It demonstrates three key innovations: externally backed FLOOR tokens, NFT loan receipts, and async claim withdrawals."

**Point out on landing page:**
- Project description
- Key features (3 cards: FLOOR token, Lending, NFT receipts)
- Clear disclaimers: "Testnet-only, not production-ready"

**Say:**
> "This is a hackathon demonstration — everything runs on NEAR testnet, not mainnet. Let's verify it's actually deployed."

---

### Act 2: Live Verification (3 min)

**Navigate to:** `http://127.0.0.1:5173/verify`

**What to show:**
> "The Verify route reads live testnet RPC data — no wallet connection needed. Let's see the current contract state."

**Point out displayed values:**

1. **Contract Account:**
   - `rc1.floorline-g3-20261111-6702ea.testnet`
   - "Ends in `.testnet` — confirming this is testnet-only"

2. **Contract Status:**
   - `STOPPED: true`
   - "The guardian called `stop_new_risk` — irreversible, no new loans or issuance"

3. **Liquidity & Tokens:**
   - `L: 10.18 NEAR` (liquidity)
   - `T: 9.0 FLOOR` (total tokens)
   - `L/T Ratio: 1.13`
   - "FLOOR is backed by real NEAR deposits, not minted from thin air"

4. **Inflight Claims:**
   - `Inflight: 0`
   - "All async claims have been withdrawn — clean final state"

5. **Storage & Admission:**
   - `Storage Total: 0.06 NEAR`
   - `Admission: 3/128 slots occupied`
   - "Three accounts still registered, others unregistered"

**Say:**
> "This data comes from testnet RPC right now — you can verify it yourself using the terminal command shown below."

**Show terminal command:**
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet get_state
```

---

### Act 3: Evidence Deep Dive (3 min)

**Open:** `docs/evidence/proofs.json` in code editor

**What to show:**
> "We executed 40 transactions on testnet to demonstrate the full lifecycle. Each transaction is verified with NearBlocks links."

**Highlight structure:**
```json
{
  "contract": "rc1.floorline-g3-20261111-6702ea.testnet",
  "verified_rows": 40,
  "total_rows": 40,
  "acceptance_status": "ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED",
  "proofs": [/* 40 objects */]
}
```

**Pick 3 transactions to show:**

#### Transaction 1: Deploy (rc1-01)
```json
{
  "id": "rc1-01-deploy",
  "title": "Fresh RC1 atomic deployment",
  "transaction_hash": "3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c",
  "explorer_url": "https://testnet.nearblocks.io/txns/3Gf1RnQWWy...",
  "status": "FINAL_VERIFIED"
}
```

**Click explorer link in browser:**
- Shows successful deployment on NearBlocks
- Contract account: `rc1.floorline-g3-20261111-6702ea.testnet`
- Method: Deploy contract

**Say:**
> "Transaction 1: Fresh atomic deployment. You can see it succeeded on NearBlocks."

#### Transaction 2: Issue FLOOR (rc1-11)
```json
{
  "id": "rc1-11-issue",
  "title": "FLOOR issuance",
  "method": "issue",
  "deposit": "10000000000000000000000", // 10 NEAR
  "signer": "funmask6175.testnet",
  "browser": true
}
```

**Click explorer link:**
- Browser wallet transaction (not scripted)
- Deposited 10 NEAR → received 10 FLOOR
- L/T ratio accounting visible

**Say:**
> "Transaction 11: A real browser wallet issued FLOOR by depositing 10 NEAR. This is external backing, not thin-air minting."

#### Transaction 3: Stop Contract (rc1-39)
```json
{
  "id": "rc1-39-stop",
  "title": "Irreversible new-risk stop",
  "method": "stop_new_risk",
  "transaction_hash": "65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3",
  "expected_vs_actual": {
    "before": { "stopped": false },
    "after": { "stopped": true }
  }
}
```

**Click explorer link:**
- Guardian called `stop_new_risk`
- Before: stopped=false → After: stopped=true

**Say:**
> "Transaction 39: The operator permanently stopped new risk. This is why the Verify route shows STOPPED: true."

---

### Act 4: Judge Verification (1 min)

**Say:**
> "Judges can verify everything in under 5 minutes using our automated script."

**Show terminal:**
```bash
cd frontend
npm run judge:verify
```

**Show expected output:**
```
✓ Contract: rc1.floorline-g3-20261111-6702ea.testnet
✓ Code hash: 4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
✓ Status: STOPPED
✓ Liquidity: 10.18 NEAR
✓ Tokens: 9.0 FLOOR
✓ Inflight: 0
✓ 40/40 proofs verified
✓ All checks passed
```

**Say:**
> "All 40 transactions verified, contract state matches evidence. Judges get this result in one command."

---

### Act 5: Documentation Tour (1 min)

**Navigate to:** `http://127.0.0.1:5173/judges`

**What to show:**
> "We've documented everything for both human and AI judges."

**Point out links:**
- **Judge Runbook:** Step-by-step 10-minute verification guide
- **Proof Index:** All 40 transactions with explorer links
- **Rules Checklist:** Hackathon compliance evidence
- **AI Judge Prompts:** Claude Code & Codex instructions

**Say:**
> "Every transaction, every rule, every check is documented. Judges can verify independently in 10 minutes."

---

## Alternative Demo (With Wallet)

**If live wallet available:**

### Live Interaction Flow

1. **Connect Wallet:**
   - Click "Connect Wallet" (if implemented)
   - Select My NEAR Wallet
   - Authorize

2. **Check Balance:**
   - Query `ft_balance_of(YOUR_ACCOUNT)`
   - Should show 0 FLOOR (new account) or existing balance

3. **Query State (on-chain):**
   ```bash
   near view rc1.floorline-g3-20261111-6702ea.testnet get_state
   ```

4. **Show Stopped:**
   - Try to call `issue` with 0.1 NEAR
   - Transaction should FAIL with "stopped" error
   - Demonstrates security: no new risk after stop

---

## Key Demo Messages

### What Works
✅ "Contract is deployed and accessible on testnet"  
✅ "40 transactions executed and verified"  
✅ "Live RPC data shows stopped state"  
✅ "All evidence is public and reproducible"

### What's Honest
🟡 "Testnet-only — NOT deployed to mainnet"  
🟡 "Not audited — hackathon demo code"  
🟡 "Operator-controlled — not ownerless/decentralized"  
🟡 "Educational demonstration, not financial product"

### What's Impressive
⭐ "40 verified transactions covering full lifecycle"  
⭐ "Multi-actor flow with browser wallet"  
⭐ "NFT transfer + 3-party repayment tested"  
⭐ "Async claim pattern with 7-receipt withdrawals"  
⭐ "Complete judge verification in <5 minutes"

---

## Demo Script Timeline

| Time | Section | Action |
|------|---------|--------|
| 0:00-0:30 | Intro | Open landing page, show overview |
| 0:30-2:00 | Verify Route | Display live testnet state |
| 2:00-3:30 | Evidence | Open proofs.json, show 3 transactions |
| 3:30-4:30 | Transaction Links | Click NearBlocks for deploy, issue, stop |
| 4:30-5:00 | Judge Script | Run `npm run judge:verify` |
| 5:00-5:30 | Documentation | Show Judges route with resources |
| 5:30-6:00 | Wrap-up | Testnet-only disclaimer, invite questions |

**Total:** 6 minutes (can extend to 10 with deep dives)

---

## Demo Recording Tips

### For Screencast
1. **Resolution:** 1920x1080 (Full HD)
2. **Frame Rate:** 30 FPS minimum
3. **Audio:** Clear voiceover explaining each step
4. **Cursor:** Enable cursor highlight in recording software
5. **Duration:** 5-7 minutes (judges have limited time)

### What to Highlight
- ✅ Testnet contract name (ends in `.testnet`)
- ✅ Live RPC data (not hardcoded)
- ✅ NearBlocks explorer links (independent verification)
- ✅ Stopped status (safety demonstrated)
- ✅ Clean disclaimers (honest about limitations)

### What to Avoid
- ❌ Claiming production-readiness
- ❌ Suggesting mainnet deployment
- ❌ Overpromising security ("audited", "safe")
- ❌ Hiding limitations or edge cases

---

## "Do X, See Y" Format

**For X/Twitter Demo Post:**

> **Do this:**
> 1. Visit https://floorline-delta.vercel.app/verify
> 2. See live testnet state (no wallet needed)
> 3. Run `npm run judge:verify` in terminal
>
> **See this:**
> - Contract: rc1.floorline-g3-20261111-6702ea.testnet
> - Status: STOPPED
> - L: 10.18 NEAR, T: 9.0 FLOOR, Inflight: 0
> - ✅ 40/40 proofs verified
>
> Full testnet demo with async collateralized lending + NFT receipts.
> #NEAR #Hackathon #DeFi

---

## Troubleshooting (Live Demo)

### Issue: Verify route shows "loading"
**Solution:** Check internet connection, RPC may be slow (wait 5 seconds)

### Issue: `judge:verify` fails
**Solution:** Run `npm ci` first, ensure Node.js v18+

### Issue: NearBlocks link 404
**Solution:** Use alternative explorer: `explorer.testnet.near.org`

### Issue: Contract state doesn't match
**Solution:** Testnet may have been reset (unlikely but possible)

---

## Post-Demo Q&A Prep

**Expected questions:**

1. **"Is this on mainnet?"**
   - No, testnet-only. Contract name ends in `.testnet`.

2. **"Is it audited?"**
   - No, this is hackathon demo code, not production-ready.

3. **"How can I verify transactions?"**
   - Run `npm run judge:verify` or check `docs/evidence/proofs.json`.

4. **"What's the L/T ratio?"**
   - 10.18 NEAR / 9.0 FLOOR = 1.13 (accounting, not guaranteed price).

5. **"Can I try it live?"**
   - Contract is stopped (no new risk). You can read state via RPC.

---

**Demo Complete!** 🎉  
**Total Time:** 5-10 minutes depending on depth  
**Judge Takeaway:** "Working testnet demo with 40 verified transactions and reproducible verification."
