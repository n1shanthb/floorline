# Floorline Judge Runbook

**Estimated Time:** 10-15 minutes  
**Prerequisites:** Terminal, web browser, NEAR testnet access  
**No wallet required** for verification path

---

## Purpose

This runbook guides judges through verifying Floorline's testnet deployment, execution evidence, and compliance with hackathon rules. All steps are reproducible and reference public testnet data.

---

## Quick Verification (5 minutes)

### Step 1: Automated Script
```bash
cd frontend
npm ci
npm run judge:verify
```

**Expected output:**
```
✓ Contract exists: rc1.floorline-g3-20261111-6702ea.testnet
✓ Code hash matches: 4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az
✓ Status: STOPPED (no new risk)
✓ Liquidity: 0.01018 NEAR
✓ Tokens: 0.009 FLOOR
✓ Inflight: 0 (all claims settled)
✓ Storage: 0.06 NEAR
✓ Admission: 3/128
✓ 40/40 proofs loaded
✓ All receipts FINAL_VERIFIED
```

**If this passes:** Core verification is complete. Proceed to Step 2 for UI/UX check.

---

### Step 2: Explore Frontend
```bash
npm run dev
# Open http://127.0.0.1:5173
```

**What to check:**
1. **Landing page (`/`):** Project overview, no wallet connection needed
2. **Verify route (`/verify`):** Live testnet state display
   - Shows L=10.18, T=9.0, stopped=true
   - Displays admission count, storage total
   - No errors or "loading forever"
3. **Judges route (`/judges`):** This documentation

**Expected:** Clean UI, testnet data loads in <3 seconds, no console errors.

---

### Step 3: Rules Compliance
Open [`docs/submission/RULES_CHECKLIST.md`](../submission/RULES_CHECKLIST.md) and verify:

- ✅ Testnet-only (contract name ends in `.testnet`)
- ✅ AI tools: Claude Code & Cursor mentioned
- ✅ Solo + disclosed: NIO project referenced
- ✅ Public repo link exists
- ✅ Demo URL or instructions present

**If all ✅:** Quick verification complete.

---

## Deep Verification (15 minutes)

### Step 4: Manual Transaction Spot-Check

Pick 3 random proofs from [`docs/evidence/proofs.json`](../../docs/evidence/proofs.json) and verify on NearBlocks:

**Example checks:**

1. **Deploy (rc1-01):**
   - Open https://testnet.nearblocks.io/txns/3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c
   - ✅ Status: Success
   - ✅ Method: Deploy contract
   - ✅ Signer: `floorline-g3-20261111-6702ea.testnet`

2. **Issue FLOOR (rc1-11):**
   - Open https://testnet.nearblocks.io/txns/63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm
   - ✅ Status: Success
   - ✅ Method: `issue`
   - ✅ Deposit: 10 NEAR
   - ✅ Signer: `funmask6175.testnet` (browser wallet)

3. **Stop Contract (rc1-39):**
   - Open https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3
   - ✅ Status: Success
   - ✅ Method: `stop_new_risk`
   - ✅ Signer: Guardian account

**Result:** If 3/3 match, evidence is trustworthy.

---

### Step 5: Verify Contract State (CLI)

**Option A: Using NEAR CLI**
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet get_state
```

**Expected output (JSON):**
```json
{
  "pilot": {
    "guardian": "floorline-g3-20261111-6702ea.testnet",
    "stopped": true,
    "gross": "16000000000000000000000",
    "version": "floor-async-rc1"
  },
  "ledger": {
    "L": "10180000000000000000000",
    "T": "9000000000000000000000",
    "inflight": "0"
  }
}
```

**Option B: Using Frontend Verify Route**
- Visit `/verify` in browser
- Check displayed values match above

---

### Step 6: Check Code Hash

**Why:** Confirms deployed bytecode matches claimed source.

**Method 1: RPC Query (advanced)**
```bash
curl -X POST https://rpc.testnet.near.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "dontcare",
    "method": "query",
    "params": {
      "request_type": "view_account",
      "finality": "final",
      "account_id": "rc1.floorline-g3-20261111-6702ea.testnet"
    }
  }'
```

Look for `"code_hash": "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az"` in response.

**Method 2: Trust Automated Script**
If `npm run judge:verify` passed, code hash was verified.

---

### Step 7: Standards Compliance

Verify NEP compliance by checking contract methods:

**NEP-141 (Fungible Token):**
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet ft_metadata
near view rc1.floorline-g3-20261111-6702ea.testnet ft_total_supply
```

**NEP-171 (NFT):**
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet nft_metadata
near view rc1.floorline-g3-20261111-6702ea.testnet nft_token '{"token_id": "3"}'
```

**Expected:** All queries return valid JSON (even if loan 3 is deleted, method exists).

---

### Step 8: Verify Stopped State

**Why:** Contract claims to be permanently stopped. Verify new risk is rejected.

**Test (optional):**
```bash
# This should FAIL with "contract is stopped" or similar
near call rc1.floorline-g3-20261111-6702ea.testnet issue \
  '{"min_tokens": "1000000000000000000000"}' \
  --accountId YOUR_TESTNET_ACCOUNT.testnet \
  --deposit 1 \
  --gas 110000000000000
```

**Expected:** Transaction fails with error mentioning "stopped" or "no new risk".

---

## Evidence Review

### Transaction Groups

Verify each group has complete lifecycle:

1. **Deployment (5):** ✅ Deploy + fund 4 actors
2. **Registration (5):** ✅ All actors register storage
3. **FLOOR Lifecycle (6):** ✅ Issue → Transfer → Redeem → Withdraw → Cleanup + Contribute
4. **Lending Repay (9):** ✅ Offer → Borrow → Withdraw → NFT Transfer → Repay → Cleanup
5. **Lending Default (7):** ✅ Offer → Borrow → Wait → Default → Seize
6. **Cancellation (5):** ✅ Offer → Cancel → Withdraw → Cleanup
7. **Storage/Stop (3):** ✅ Withdraw storage → Stop → Post-stop unregister

**Total:** 40 transactions, all finalized.

---

## Common Issues & Solutions

### Issue: `npm run judge:verify` fails
**Solution:**
1. Check internet connection (needs testnet RPC)
2. Verify Node.js version (v18+ recommended)
3. Delete `node_modules` and re-run `npm ci`
4. Check RPC is not rate-limited: https://rpc.testnet.near.org/status

### Issue: Frontend shows "loading" forever
**Solution:**
1. Check browser console for errors
2. Try different RPC endpoint in `lib/config.ts`
3. Verify contract still exists (may have been deleted if testnet was reset)

### Issue: Transaction links show 404
**Solution:**
- NearBlocks may be temporarily unavailable
- Try alternative explorer: replace `nearblocks.io` with `explorer.testnet.near.org`

### Issue: Code hash doesn't match
**Solution:**
- Contract may have been redeployed (unlikely after stop)
- Verify you're checking the correct account name
- If intentional redeploy, check `proofs.json` for updated hash

---

## Judging Criteria Checklist

Use this checklist when evaluating:

### Functionality (Does it work?)
- [ ] Contract exists on testnet
- [ ] Code hash matches claimed
- [ ] 40 transactions verified on-chain
- [ ] Frontend loads and displays state
- [ ] Verification script passes

### Completeness (Is the demo thorough?)
- [ ] Multiple actors (5+)
- [ ] Full lifecycle demonstrated
- [ ] Edge cases tested (cancel, default, stop)
- [ ] NFT transfer tested (3-party repayment)
- [ ] Async pattern demonstrated (7-receipt withdrawals)

### Standards (Does it follow NEP specs?)
- [ ] NEP-141 methods present
- [ ] NEP-145 storage management
- [ ] NEP-171 NFT methods
- [ ] NEP-177 metadata

### Documentation (Can judges verify independently?)
- [ ] Clear README with quick start
- [ ] All transaction hashes provided
- [ ] Rules compliance documented
- [ ] Evidence is machine-readable (JSON)

### Compliance (Does it follow hackathon rules?)
- [ ] Testnet-only (not mainnet)
- [ ] AI tools disclosed
- [ ] Related submissions disclosed
- [ ] Public repo
- [ ] Demo URL or instructions

---

## Time Budget

| Step | Time | Cumulative |
|------|------|------------|
| Automated script | 2 min | 2 min |
| Frontend check | 2 min | 4 min |
| Rules compliance | 1 min | 5 min |
| **Quick Total** | **5 min** | |
| Transaction spot-check | 3 min | 8 min |
| Contract state CLI | 2 min | 10 min |
| Code hash verify | 2 min | 12 min |
| Standards compliance | 3 min | 15 min |
| **Deep Total** | **15 min** | |

---

## Contact & Questions

If verification fails or you encounter issues:

1. **Check GitHub Issues:** https://github.com/n1shanthb/floorline/issues
2. **Review evidence:** All transaction hashes are in `docs/evidence/proofs.json`
3. **Try alternative RPC:** https://archival-rpc.testnet.near.org

---

## Related Submission (NIO)

If evaluating both projects, verify independence:

- **Floorline:** Collateralized lending, FLOOR token, testnet contract `rc1.floorline-g3-*`
- **NIO:** Intent execution, different repo, different contract, different tech

See [`docs/submission/RULES_CHECKLIST.md`](../submission/RULES_CHECKLIST.md) disclosure section.

---

**Judge Verification Completed:** ✅  
**Estimated Time:** 5-15 minutes depending on depth  
**All 40 proofs available for spot-checking**
